/**
 * Smoke-test TOC vs body scoring for knowledge retrieval.
 * Run: node scripts/smoke-kb-scoring.mjs
 */
import fs from "fs";

const TERM_EXPANSIONS = {
  killing: ["qatl", "murder", "homicide", "death"],
  kill: ["qatl", "murder", "homicide"],
  murder: ["qatl", "killing", "homicide", "qatl-i-amd"],
  punishment: ["punish", "punished", "penalty", "sentence", "qisas", "diyat", "tazir"],
  punish: ["punishment", "punished", "penalty"],
  fire: ["burning", "burnt", "burns", "arson", "combustible", "flame"],
  death: ["qatl", "murder", "killing", "homicide"],
  boy: ["child", "minor", "person"],
};
const LEGAL_SOFT_TERMS = [
  "punishment", "qatl", "murder", "fire", "death", "qisas", "diyat", "ppc", "penal", "section",
];
const STOPWORDS = new Set(["the","and","for","are","but","not","you","can","any","how","why","what","when","who","this","that","with","from","have","has","was","were","been","being","will","would","could","should","may","might","must","shall","does","did","your","their","them","they","she","her","him","his","its","our","all","each","both","into","onto","than","then","such","here","just","also","only","very","some","more","most","other"]);
const SUBSTANCE_MARKERS = [
  /\bwhoever\b/i,
  /\bshall be punished\b/i,
  /\bpunished with\b/i,
  /\bprovided that\b/i,
  /\bexplanation\b/i,
];

function expandTerms(raw) {
  const seen = new Set();
  const out = [];
  for (const t of raw) {
    const base = t.toLowerCase();
    if (seen.has(base)) continue;
    seen.add(base);
    out.push(base);
    const extra = TERM_EXPANSIONS[base] || TERM_EXPANSIONS[base.replace(/s$/, "")];
    if (extra) for (const e of extra) {
      const x = e.toLowerCase();
      if (!seen.has(x)) { seen.add(x); out.push(x); }
    }
  }
  return out;
}

function extractQueryTerms(question) {
  const raw = question.toLowerCase().split(/\W+/).filter((t) => t.length >= 3 && !STOPWORDS.has(t)).slice(0, 20);
  const expanded = expandTerms(raw);
  const looksLegal = /\b(punish|penalty|qatl|murder|kill|section|ppc|penal|qisas|diyat|crime|offence|offense|hurt|death|fire|law|statute)\b/i.test(question);
  if (looksLegal) {
    const seen = new Set(expanded);
    for (const soft of LEGAL_SOFT_TERMS) if (!seen.has(soft)) { seen.add(soft); expanded.push(soft); }
  }
  return expanded;
}

function scorePassage(lower, terms) {
  let score = 0;
  for (const t of terms) {
    if (t.length < 3) continue;
    let i = 0;
    while ((i = lower.indexOf(t, i)) !== -1) {
      score += t.length >= 6 ? 3 : 2;
      i += Math.max(1, t.length);
    }
  }
  return score;
}

function tocDensity(text) {
  const lines = text.split(/\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l.length > 0);
  if (lines.length < 3) {
    if (lines.length >= 1 && /^\d+[A-Za-z]?[.\)]\s+\S/.test(lines[0]) && !SUBSTANCE_MARKERS.some((re) => re.test(text)) && text.replace(/\s+/g, " ").trim().length < 130) return 0.9;
    return 0;
  }
  let numberedHeadings = 0, substantiveLines = 0;
  for (const line of lines) {
    const isNumbered = /^\d+[A-Za-z]?[.\)]\s+\S/.test(line) || /^section\s+\d+/i.test(line);
    const hasProse = SUBSTANCE_MARKERS.some((re) => re.test(line)) || line.length > 150 || (line.length > 100 && /\b(whoever|punished with|shall be)\b/i.test(line));
    if (hasProse) substantiveLines++;
    if (isNumbered && !hasProse && line.length < 140) numberedHeadings++;
  }
  let density = numberedHeadings / lines.length;
  if (numberedHeadings >= 4 && substantiveLines <= numberedHeadings / 4) density = Math.max(density, 0.55);
  if (/\bcontents\b/i.test(text.slice(0, Math.min(400, text.length)))) density = Math.min(1, density + 0.25);
  return density;
}

function substanceBonus(text) {
  let bonus = 0;
  for (const re of SUBSTANCE_MARKERS) if (re.test(text)) bonus += 12;
  if (/\b(qisas|diyat|ta['']?zir)\b/i.test(text) && SUBSTANCE_MARKERS.some((re) => re.test(text))) bonus += 14;
  if (/\bdeath\b/i.test(text) && /\b(punish|qisas|imprisonment)\b/i.test(text)) bonus += 10;
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const avg = lines.reduce((s, l) => s + l.length, 0) / lines.length;
    if (avg >= 90) bonus += 14;
    else if (avg >= 50) bonus += 6;
  }
  if (/\d{2,4}[A-Za-z]?\.\s+[^\n]{0,100}[\s\S]{0,80}\b(whoever|shall be punished|punished with)\b/i.test(text)) bonus += 28;
  return bonus;
}

function scorePassageQuality(text, terms) {
  const lower = text.toLowerCase();
  const raw = scorePassage(lower, terms);
  if (raw <= 0 && !SUBSTANCE_MARKERS.some((re) => re.test(text))) return 0;
  const density = tocDensity(text);
  let mult = 1;
  if (density >= 0.55) mult = 0.05;
  else if (density >= 0.4) mult = 0.15;
  else if (density >= 0.25) mult = 0.35;
  else if (density >= 0.12) mult = 0.65;
  const bonus = substanceBonus(text) * (density < 0.25 ? 1 : 0.2);
  return Math.max(0, raw * mult + bonus - density * 35);
}

function bestExcerptFromBody(body, terms, maxChars) {
  const trimmed = body.trim();
  if (!trimmed) return "";
  if (trimmed.length > maxChars * 3) {
    const window = maxChars;
    const samples = Math.min(64, Math.max(16, Math.ceil(trimmed.length / 6_000)));
    const span = trimmed.length - window;
    let best = trimmed.slice(0, window);
    let bestScore = scorePassageQuality(best, terms);
    let bestAt = 0;
    for (let s = 0; s < samples; s++) {
      const i = Math.floor((span * s) / Math.max(1, samples - 1));
      const win = trimmed.slice(i, i + window);
      const sc = scorePassageQuality(win, terms);
      if (sc > bestScore) { bestScore = sc; best = win; bestAt = i; }
    }
    const refineStep = Math.max(200, Math.floor(window / 5));
    const refineStart = Math.max(0, bestAt - window);
    const refineEnd = Math.min(span, bestAt + window);
    for (let i = refineStart; i <= refineEnd; i += refineStep) {
      const win = trimmed.slice(i, i + window);
      const sc = scorePassageQuality(win, terms);
      if (sc > bestScore) { bestScore = sc; best = win; }
    }
    return best.trim();
  }
  return trimmed.slice(0, maxChars);
}

const data = JSON.parse(fs.readFileSync("./src/lib/pdf_data.json", "utf8"));
const d = data.find((x) => x.file_name.includes("administratord5622ea3f15bfa00b17d2cf7770a8434"));
const q = "what is the punishment of killing a boy with fire";
const terms = extractQueryTerms(q);
console.log("terms", terms);

const toc = d.text.slice(23492, 23492 + 3500);
const body = d.text.slice(292666, 292666 + 3500);
console.log("TOC density", tocDensity(toc), "score", scorePassageQuality(toc, terms));
console.log("BODY density", tocDensity(body), "score", scorePassageQuality(body, terms));
console.log("body wins?", scorePassageQuality(body, terms) > scorePassageQuality(toc, terms));

const excerpt = bestExcerptFromBody(d.text, terms, 3500);
console.log("excerpt has whoever?", /whoever/i.test(excerpt));
console.log("excerpt TOC list?", /302\.\s+Punishment[\s\S]{0,120}303\.\s+Qatl/i.test(excerpt) && !/whoever/i.test(excerpt));
console.log("has punished with?", /punished with/i.test(excerpt));
console.log("has 302?", /302\./.test(excerpt));
console.log("has qisas death?", /death as qisas|punished with death/i.test(excerpt));
console.log("excerpt preview:\n", excerpt.slice(0, 500));
console.log("--- mid ---\n", excerpt.slice(1200, 2000));
