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
  valid: ["validity", "void", "voidable", "legal"],
  pakistan: ["pakistani", "ordinance", "act"],
  divorce: ["talaq", "khula", "dissolution"],
};

export function getKnowledgeBasePaths() {
  return { root: KB_ROOT, pdfs: PDF_DIR, text: TEXT_DIR };
}

function readTextFiles(dir: string): { name: string; content: string }[] {
  if (!fs.existsSync(dir)) return [];
  const out: { name: string; content: string }[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!fs.statSync(full).isFile()) continue;
    const lower = name.toLowerCase();
    if (!lower.endsWith(".md") && !lower.endsWith(".txt")) continue;
    const content = fs.readFileSync(full, "utf8").trim();
    if (content) out.push({ name, content });
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

async function readPdfFiles(dir: string): Promise<{ name: string; content: string }[]> {
  if (!fs.existsSync(dir)) return [];
  const pdfFiles = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith(".pdf"));
  if (pdfFiles.length === 0) return [];

  const out: { name: string; content: string }[] = [];
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
      out.push({ name, content: `${searchableName}\n\n${body}` });
    } catch (err) {
      console.warn(`[knowledge-base] Failed to read PDF ${name}:`, err);
    }
  }
  return out;
}

/** Load all knowledge documents for the AI context window. */
export async function loadKnowledgeContext(): Promise<string> {
  const textDocs = readTextFiles(TEXT_DIR);
  const pdfDocs = await readPdfFiles(PDF_DIR);
  const all = [...textDocs, ...pdfDocs];

  if (all.length === 0) {
    return "";
  }

  return all
    .map((d) => `--- Document: ${d.name} ---\n${d.content}`)
    .join("\n\n")
    .slice(0, 120_000);
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
  return expandTerms(raw);
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

function bestExcerptFromBody(body: string, terms: string[], maxChars: number): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  const lowerFull = trimmed.toLowerCase();
  const paras = trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 40);
  const candidates = paras.length ? paras : [trimmed];

  let best = trimmed.slice(0, Math.min(maxChars, trimmed.length));
  let bestScore = scorePassage(lowerFull.slice(0, Math.min(maxChars, lowerFull.length)), terms);

  for (const para of candidates) {
    const pl = para.toLowerCase();
    if (para.length <= maxChars) {
      const sc = scorePassage(pl, terms);
      if (sc > bestScore) {
        bestScore = sc;
        best = para;
      }
    } else {
      const step = Math.max(120, Math.floor(maxChars / 3));
      for (let i = 0; i + maxChars <= para.length; i += step) {
        const win = para.slice(i, i + maxChars);
        const sc = scorePassage(win.toLowerCase(), terms);
        if (sc > bestScore) {
          bestScore = sc;
          best = win;
        }
      }
    }
  }
  return best.trim();
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
    const blob = `${labelReadable}\n${block.text.toLowerCase()}`;
    const sc = scorePassage(blob, terms);
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
