import fs from "fs";
import path from "path";
import {
  getCannotReplyReply,
  getGreetingReply,
  getSetupOrErrorReply,
  isLikelyGreeting,
} from "@/lib/assistantReplies";

const KB_ROOT = path.join(process.cwd(), "knowledge-base");
const PDF_DIR = path.join(KB_ROOT, "pdfs");
const TEXT_DIR = path.join(KB_ROOT, "text");
const PDF_DATA_PATH = path.join(process.cwd(), "src", "lib", "pdf_data.json");

const MAX_CONTEXT_CHARS = 90_000;
const MAX_EXCERPT_CHARS = 3_500;
/** Curated folder hits + statute corpus hits (kept separate so Q&A is not drowned out). */
const TOP_FOLDER_DOCS = 4;
const TOP_PDF_DATA_DOCS = 6;

type PdfDataEntry = { file_name: string; text: string };

/** Scorable knowledge unit used for retrieval. */
interface ScorableDoc {
  label: string;
  text: string;
}

/** Cached parse of the large statute corpus (src/lib/pdf_data.json). */
let cachedPdfDataDocs: ScorableDoc[] | null = null;
let cachedFolderDocs: ScorableDoc[] | null = null;
let folderDocsPromise: Promise<ScorableDoc[]> | null = null;

/** Query terms noisy for PDF keyword search */
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "can",
  "any",
  "how",
  "why",
  "what",
  "when",
  "who",
  "this",
  "that",
  "with",
  "from",
  "have",
  "has",
  "was",
  "were",
  "been",
  "being",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "does",
  "did",
  "your",
  "their",
  "them",
  "they",
  "she",
  "her",
  "him",
  "his",
  "its",
  "our",
  "all",
  "each",
  "both",
  "into",
  "onto",
  "than",
  "then",
  "such",
  "here",
  "just",
  "also",
  "only",
  "very",
  "some",
  "more",
  "most",
  "other",
]);

/** Light legal synonyms to match PDF wording variations */
const TERM_EXPANSIONS: Record<string, string[]> = {
  marriage: ["marital", "marry", "spouse", "nikah", "nikkah", "wedding", "wedlock"],
  consent: ["coercion", "free", "willing", "willingly"],
  valid: ["validity", "voidable"],
  pakistan: ["pakistani"],
  divorce: ["talaq", "khula", "dissolution"],
  killing: ["qatl", "murder", "homicide", "death"],
  kill: ["qatl", "murder", "homicide"],
  murder: ["qatl", "killing", "homicide", "qatl-i-amd"],
  punishment: ["punish", "punished", "penalty", "sentence", "qisas", "diyat", "tazir"],
  punish: ["punishment", "punished", "penalty"],
  fire: ["burning", "burnt", "burns", "arson", "combustible", "flame"],
  death: ["qatl", "murder", "killing", "homicide"],
};

/**
 * Soft statute cues injected for legal questions so retrieval prefers
 * punishment / definition body text (PPC, qisas, section …).
 */
const LEGAL_SOFT_TERMS = [
  "punishment",
  "qatl",
  "murder",
  "fire",
  "death",
  "qisas",
  "diyat",
  "ppc",
  "penal",
  "section",
] as const;

/**
 * Strong markers of operative statute prose.
 * Do NOT include alone: qisas / diyat / liable / bare "shall" — those appear in TOC titles too.
 */
const SUBSTANCE_MARKERS = [
  /\bwhoever\b/i,
  /\bshall be punished\b/i,
  /\bpunished with\b/i,
  /\bprovided that\b/i,
  /\bexplanation\b/i,
];

export function getKnowledgeBasePaths() {
  return { root: KB_ROOT, pdfs: PDF_DIR, text: TEXT_DIR, pdfData: PDF_DATA_PATH };
}

/** Lazy-load and cache pdf_data.json once in memory. Never send the full file to the model. */
function loadPdfDataDocs(): ScorableDoc[] {
  if (cachedPdfDataDocs) return cachedPdfDataDocs;
  try {
    if (!fs.existsSync(PDF_DATA_PATH)) {
      cachedPdfDataDocs = [];
      return cachedPdfDataDocs;
    }
    const parsed = JSON.parse(fs.readFileSync(PDF_DATA_PATH, "utf8")) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn("[knowledge-base] pdf_data.json is not an array; ignoring.");
      cachedPdfDataDocs = [];
      return cachedPdfDataDocs;
    }
    cachedPdfDataDocs = parsed
      .filter(
        (e): e is PdfDataEntry =>
          !!e &&
          typeof e === "object" &&
          typeof (e as PdfDataEntry).file_name === "string" &&
          typeof (e as PdfDataEntry).text === "string" &&
          (e as PdfDataEntry).text.trim().length > 0,
      )
      .map((e) => ({
        label: e.file_name,
        text: e.text.trim(),
      }));
    return cachedPdfDataDocs;
  } catch (err) {
    console.warn("[knowledge-base] Failed to load pdf_data.json:", err);
    cachedPdfDataDocs = [];
    return cachedPdfDataDocs;
  }
}

function readTextFiles(dir: string): ScorableDoc[] {
  if (!fs.existsSync(dir)) return [];
  const out: ScorableDoc[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!fs.statSync(full).isFile()) continue;
    const lower = name.toLowerCase();
    if (!lower.endsWith(".md") && !lower.endsWith(".txt")) continue;
    const content = fs.readFileSync(full, "utf8").trim();
    if (content) out.push({ label: name, text: content });
  }
  return out;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text?.trim() ?? "";
  } finally {
    await parser.destroy();
  }
}

async function readPdfFiles(dir: string): Promise<ScorableDoc[]> {
  if (!fs.existsSync(dir)) return [];
  const pdfFiles = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith(".pdf"));
  if (pdfFiles.length === 0) return [];

  const out: ScorableDoc[] = [];
  for (const name of pdfFiles) {
    try {
      const buffer = fs.readFileSync(path.join(dir, name));
      const text = await extractPdfText(buffer);
      if (text.length < 80) {
        console.warn(
          `[knowledge-base] Little or no text in "${name}" (${text.length} chars). It may be scanned; consider OCR or a text-based PDF.`,
        );
      }
      const searchableName = name
        .replace(/\.pdf$/i, "")
        .replace(/[_-]+/g, " ")
        .trim();
      const body =
        text.length > 0
          ? text
          : `[The PDF "${name}" could not be read as text. It may be image-only. Use a text PDF or OCR.]`;
      out.push({ label: name, text: `${searchableName}\n\n${body}` });
    } catch (err) {
      console.warn(`[knowledge-base] Failed to read PDF ${name}:`, err);
    }
  }
  return out;
}

async function loadFolderDocs(): Promise<ScorableDoc[]> {
  if (cachedFolderDocs) return cachedFolderDocs;
  if (!folderDocsPromise) {
    folderDocsPromise = (async () => {
      const textDocs = readTextFiles(TEXT_DIR);
      const pdfDocs = await readPdfFiles(PDF_DIR);
      cachedFolderDocs = [...textDocs, ...pdfDocs];
      return cachedFolderDocs;
    })().catch((err) => {
      folderDocsPromise = null;
      throw err;
    });
  }
  return folderDocsPromise;
}

function expandTerms(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const base = t.toLowerCase();
    if (seen.has(base)) continue;
    seen.add(base);
    out.push(base);
    if (base.endsWith("ly") && base.length > 5) {
      const root = base.slice(0, -2);
      if (root.length >= 3 && !seen.has(root)) {
        seen.add(root);
        out.push(root);
      }
    }
    const extra =
      TERM_EXPANSIONS[base] ||
      TERM_EXPANSIONS[base.replace(/s$/, "")] ||
      TERM_EXPANSIONS[base.replace(/ies$/, "y")];
    if (extra) {
      for (const e of extra) {
        const x = e.toLowerCase();
        if (!seen.has(x)) {
          seen.add(x);
          out.push(x);
        }
      }
    }
  }
  return out;
}

function extractQueryTerms(question: string): string[] {
  const raw = question
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
    .slice(0, 20);
  const expanded = expandTerms(raw);

  const q = question.toLowerCase();
  const looksLegal =
    /\b(punish|penalty|qatl|murder|kill|section|ppc|penal|qisas|diyat|crime|offence|offense|hurt|death|fire|law|statute)\b/i.test(
      q,
    );
  if (looksLegal) {
    const seen = new Set(expanded);
    for (const soft of LEGAL_SOFT_TERMS) {
      if (!seen.has(soft)) {
        seen.add(soft);
        expanded.push(soft);
      }
    }
  }
  return expanded;
}

function scorePassage(lower: string, terms: string[]): number {
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

/**
 * Fraction of lines that look like TOC / section-title lists
 * (e.g. "302. Punishment of qatl-i-amd" with no statute prose).
 */
function tocDensity(text: string): number {
  const lines = text
    .split(/\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);
  if (lines.length < 3) {
    if (
      lines.length >= 1 &&
      /^\d+[A-Za-z]?[.\)]\s+\S/.test(lines[0]) &&
      !SUBSTANCE_MARKERS.some((re) => re.test(text)) &&
      text.replace(/\s+/g, " ").trim().length < 130
    ) {
      return 0.9;
    }
    return 0;
  }

  let numberedHeadings = 0;
  let substantiveLines = 0;
  for (const line of lines) {
    const isNumbered = /^\d+[A-Za-z]?[.\)]\s+\S/.test(line) || /^section\s+\d+/i.test(line);
    const hasProse =
      SUBSTANCE_MARKERS.some((re) => re.test(line)) ||
      line.length > 150 ||
      (line.length > 100 && /\b(whoever|punished with|shall be)\b/i.test(line));
    if (hasProse) substantiveLines++;
    // TOC headings are short and lack operative statute language.
    if (isNumbered && !hasProse && line.length < 140) numberedHeadings++;
  }

  let density = numberedHeadings / lines.length;
  if (numberedHeadings >= 4 && substantiveLines <= numberedHeadings / 4) {
    density = Math.max(density, 0.55);
  }
  if (/\bcontents\b/i.test(text.slice(0, Math.min(400, text.length)))) {
    density = Math.min(1, density + 0.25);
  }
  return density;
}

/** Extra score for passages that contain operative statute language. */
function substanceBonus(text: string): number {
  let bonus = 0;
  for (const re of SUBSTANCE_MARKERS) {
    if (re.test(text)) bonus += 12;
  }
  // qisas/diyat alone appear in TOC titles; only boost with operative prose.
  if (/\b(qisas|diyat|ta['']?zir)\b/i.test(text) && SUBSTANCE_MARKERS.some((re) => re.test(text))) {
    bonus += 14;
  }
  if (/\bdeath\b/i.test(text) && /\b(punish|qisas|imprisonment)\b/i.test(text)) {
    bonus += 10;
  }
  // Prefer longer prose lines over stacked short headings.
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 0) {
    const avg = lines.reduce((s, l) => s + l.length, 0) / lines.length;
    if (avg >= 90) bonus += 14;
    else if (avg >= 50) bonus += 6;
  }
  // Section number sitting with its operative body (not a bare TOC title).
  if (
    /\d{2,4}[A-Za-z]?\.\s+[^\n]{0,100}[\s\S]{0,80}\b(whoever|shall be punished|punished with)\b/i.test(
      text,
    )
  ) {
    bonus += 28;
  }
  return bonus;
}

/**
 * Keyword score adjusted so TOC-like chunks lose to substantive body text.
 * Returns a non-negative effective score used for ranking excerpts/docs.
 */
function scorePassageQuality(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  const raw = scorePassage(lower, terms);
  if (raw <= 0 && !SUBSTANCE_MARKERS.some((re) => re.test(text))) return 0;
  const density = tocDensity(text);
  // Heavy penalty: dense heading lists (the failure mode for PPC TOC hits).
  let mult = 1;
  if (density >= 0.55) mult = 0.05;
  else if (density >= 0.4) mult = 0.15;
  else if (density >= 0.25) mult = 0.35;
  else if (density >= 0.12) mult = 0.65;
  const bonus = substanceBonus(text) * (density < 0.25 ? 1 : 0.2);
  return Math.max(0, raw * mult + bonus - density * 35);
}

function scoreDoc(doc: ScorableDoc, terms: string[]): number {
  if (terms.length === 0) return 0;
  const label = doc.label.replace(/[_.-]+/g, " ").toLowerCase();
  const labelScore = scorePassage(label, terms) * 4;
  const body = doc.text;
  if (!body) return labelScore;

  // Sample evenly across the FULL document — PPC operative text often sits after a long TOC.
  const window = 4_000;
  const samples = body.length <= window ? 1 : Math.min(16, Math.max(8, Math.ceil(body.length / 40_000)));
  const span = Math.max(0, body.length - window);
  let bestBody = 0;
  for (let s = 0; s < samples; s++) {
    const i = samples === 1 ? 0 : Math.floor((span * s) / (samples - 1));
    const sc = scorePassageQuality(body.slice(i, i + window), terms);
    if (sc > bestBody) bestBody = sc;
  }
  return labelScore + bestBody;
}

function bestExcerptFromBody(body: string, terms: string[], maxChars: number): string {
  const trimmed = body.trim();
  if (!trimmed) return "";

  // Large statutes: even sampling + local refine (TOC is front-loaded; body is later).
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
      if (sc > bestScore) {
        bestScore = sc;
        best = win;
        bestAt = i;
      }
    }
    const refineStep = Math.max(200, Math.floor(window / 5));
    const refineStart = Math.max(0, bestAt - window);
    const refineEnd = Math.min(span, bestAt + window);
    for (let i = refineStart; i <= refineEnd; i += refineStep) {
      const win = trimmed.slice(i, i + window);
      const sc = scorePassageQuality(win, terms);
      if (sc > bestScore) {
        bestScore = sc;
        best = win;
      }
    }
    return best.trim();
  }

  const paras = trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 40);
  const candidates = paras.length ? paras : [trimmed];

  let best = trimmed.slice(0, Math.min(maxChars, trimmed.length));
  let bestScore = scorePassageQuality(best, terms);

  for (const para of candidates) {
    if (para.length <= maxChars) {
      const sc = scorePassageQuality(para, terms);
      if (sc > bestScore) {
        bestScore = sc;
        best = para;
      }
    } else {
      const step = Math.max(160, Math.floor(maxChars / 4));
      for (let i = 0; i + maxChars <= para.length; i += step) {
        const win = para.slice(i, i + maxChars);
        const sc = scorePassageQuality(win, terms);
        if (sc > bestScore) {
          bestScore = sc;
          best = win;
        }
      }
      const tail = para.slice(para.length - maxChars);
      const sc = scorePassageQuality(tail, terms);
      if (sc > bestScore) {
        bestScore = sc;
        best = tail;
      }
    }
  }
  return best.trim();
}

function pickTopDocs(docs: ScorableDoc[], terms: string[], limit: number): ScorableDoc[] {
  return docs
    .map((doc) => ({ doc, score: scoreDoc(doc, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.doc);
}

/**
 * Retrieve relevant knowledge excerpts for the AI context window.
 * Merges `knowledge-base/` folders with cached `src/lib/pdf_data.json`.
 * When `question` is missing/empty, returns "" (chat always passes the user message).
 */
export async function loadKnowledgeContext(question?: string): Promise<string> {
  const q = question?.trim() ?? "";
  if (!q) {
    return "";
  }

  const [pdfDataDocs, folderDocs] = await Promise.all([
    Promise.resolve(loadPdfDataDocs()),
    loadFolderDocs(),
  ]);
  if (folderDocs.length === 0 && pdfDataDocs.length === 0) {
    return "";
  }

  const terms = extractQueryTerms(q);
  // Rank pools separately so curated Q&A is not drowned by the large statute corpus.
  const top = [
    ...pickTopDocs(folderDocs, terms, TOP_FOLDER_DOCS),
    ...pickTopDocs(pdfDataDocs, terms, TOP_PDF_DATA_DOCS),
  ];

  if (top.length === 0) {
    return "";
  }

  const parts: string[] = [];
  let used = 0;
  for (const doc of top) {
    const excerpt = bestExcerptFromBody(doc.text, terms, MAX_EXCERPT_CHARS);
    if (!excerpt) continue;
    const block = `--- Document: ${doc.label} ---\n${excerpt}`;
    if (parts.length > 0 && used + block.length + 2 > MAX_CONTEXT_CHARS) {
      break;
    }
    parts.push(block);
    used += block.length + (parts.length > 1 ? 2 : 0);
  }

  return parts.join("\n\n").slice(0, MAX_CONTEXT_CHARS);
}

interface KnowledgeBlock {
  label: string;
  text: string;
}

function parseKnowledgeBlocks(context: string): KnowledgeBlock[] {
  const normalized = context.trim();
  if (!normalized) return [];
  const chunks = normalized.split(/\n--- Document:\s*/);
  const out: KnowledgeBlock[] = [];
  for (const ch of chunks) {
    let piece = ch.trim();
    if (!piece) continue;
    piece = piece.replace(/^Document:\s*/i, "").replace(/^---\s*Document:\s*/i, "");
    const sep = piece.indexOf(" ---\n");
    if (sep === -1) {
      out.push({ label: "document", text: piece });
      continue;
    }
    const label = piece.slice(0, sep).trim();
    const text = piece.slice(sep + 5).trim();
    out.push({ label, text });
  }
  return out;
}

/** Try to find a direct Q&A pair match in markdown knowledge files. */
function findDirectQaAnswer(context: string, question: string): string | null {
  const qNorm = question
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (qNorm.length < 8) return null;

  const blocks = context.split(/\*\*Q:\s*/);
  let best: { score: number; answer: string } | null = null;

  for (const block of blocks) {
    if (!block.includes("**A:**")) continue;
    const qEnd = block.indexOf("**");
    if (qEnd <= 0) continue;
    const storedQ = block
      .slice(0, qEnd)
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!storedQ) continue;

    const terms = qNorm.split(" ").filter((t) => t.length > 2);
    const matched = terms.filter((t) => storedQ.includes(t)).length;
    const score = matched / Math.max(terms.length, 1);

    const aStart = block.indexOf("**A:**");
    const lawStart = block.indexOf("**Applicable Law:**");
    if (aStart === -1) continue;
    const answerText = block
      .slice(aStart + 5, lawStart > aStart ? lawStart : undefined)
      .replace(/\*\*/g, "")
      .trim();
    const lawText =
      lawStart > -1
        ? block
            .slice(lawStart + 19)
            .split(/\*\*Q:/)[0]
            .replace(/\*\*/g, "")
            .trim()
        : "";

    if (score >= 0.45 && answerText) {
      const full = lawText
        ? `${answerText}\n\nApplicable Law: ${lawText}`
        : answerText;
      if (!best || score > best.score) {
        best = { score, answer: full };
      }
    }
  }

  if (!best) return null;
  return `${best.answer}\n\nThis is general information, not legal advice.`;
}

/** Offline / quota-fallback: keyword search over PDF-derived context. */
export function searchKnowledgeFallback(
  context: string,
  question: string,
  maxChars = 2200,
): string {
  if (isLikelyGreeting(question)) {
    return getGreetingReply();
  }

  if (!context.trim()) {
    return getSetupOrErrorReply();
  }

  const direct = findDirectQaAnswer(context, question);
  if (direct) return direct;

  const terms = extractQueryTerms(question);
  const blocks = parseKnowledgeBlocks(context);

  let bestBlock: KnowledgeBlock | null = null;
  let bestScore = 0;

  for (const block of blocks) {
    const labelReadable = block.label.replace(/[_.-]+/g, " ").toLowerCase();
    const sc =
      scorePassage(labelReadable, terms) * 2 + scorePassageQuality(block.text, terms);
    if (sc > bestScore) {
      bestScore = sc;
      bestBlock = block;
    }
  }

  if (!bestBlock || bestScore < 2) {
    return getCannotReplyReply();
  }

  let excerpt = bestExcerptFromBody(bestBlock.text, terms, maxChars);
  if (!excerpt || excerpt.includes("could not be read as text")) {
    return getCannotReplyReply();
  }

  if (excerpt.length > maxChars) {
    excerpt = `${excerpt.slice(0, maxChars)}…`;
  }

  return `${excerpt}\n\nThis is general information, not legal advice.`;
}

export { isLikelyGreeting };
