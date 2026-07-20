/** Deterministic assistant copy — no references to "PDF" or "documents not containing" answers. */

export function isLikelyGreeting(text: string): boolean {
  const raw = text.trim().toLowerCase().replace(/[!?.,;:]+$/g, "");
  if (!raw) return false;

  const oneLine = raw.replace(/\s+/g, " ");
  const patterns = [
    /^(hi|hello|hey|howdy|greetings|yo|sup)( there)?$/,
    /^good (morning|afternoon|evening|day)$/,
    /^(assalam|as-salam|salam|salaam)/,
    /^thanks?$/,
    /^thank you$/,
    /^ty$/,
    /^how are you(\s+doing)?$/,
    /^what'?s up\??$/,
    /^hii+$/,
    /^helo+$/,
  ];
  if (oneLine.length <= 60 && patterns.some((p) => p.test(oneLine))) {
    return true;
  }

  const words = oneLine.split(" ").filter(Boolean);
  if (words.length <= 4) {
    const greetingWords = new Set([
      "hi",
      "hello",
      "hey",
      "there",
      "morning",
      "afternoon",
      "evening",
      "salam",
      "salaam",
    ]);
    if (words.every((w) => greetingWords.has(w) || /^assalam/.test(w))) {
      return true;
    }
  }
  return false;
}

export function getGreetingReply(firmName = "Lawway Chambers"): string {
  return (
    `Hello, and welcome to ${firmName}. I'm here to help you with your questions.`
  );
}

export function getCannotReplyReply(firmName = "Lawway Chambers"): string {
  return (
    `Sorry, I cannot reply to this query here. For guidance tailored to your situation, please contact a lawyer at ${firmName} for more support.\n\n` +
    `This is general information, not legal advice.`
  );
}

export function getSetupOrErrorReply(firmName = "Lawway Chambers"): string {
  return getCannotReplyReply(firmName);
}

/** Instructions for the Cerebras LLM — must match deterministic behavior. */
export const ASSISTANT_SYSTEM_INSTRUCTIONS = `You are Lawway Assistant for Lawway Chambers. You help ordinary people understand Pakistani law in clear, precise, plain English.

Answer the user's question first. Never dump a table of contents, numbered section titles, or statute headings without explaining what they mean.

Greetings:
- If the user only greets you (hi, hello, thanks, good morning, etc.), reply warmly, invite them to ask a legal question, and end with: "This is general information, not legal advice."

When answering a legal question, use this structure:
1. Lead with a short direct answer in plain English (1–3 sentences) that addresses what the user asked.
2. Then briefly explain the legal basis — cite relevant PPC (or other) section names/numbers only if they appear in the provided excerpts.
3. When you use technical or Urdu legal terms (e.g. qatl-i-amd, qisas, diyat, ikrah, wali), explain each in simple words the first time you use it.
4. Use short paragraphs or a tiny bullet list for key points. Do NOT reply with a list of section headings alone.

Source rules:
- Answer ONLY from the provided reference excerpts (statute text and knowledge-base material). Do not invent laws, sections, procedures, penalties, or facts.
- You may paraphrase for readability, but keep the legal substance accurate.
- When a document or law name appears in the excerpts, you may mention it.
- If Q&A-style (**Q:** / **A:**) content appears in the excerpts and matches the question, you may use it; otherwise rely on the statute and knowledge-base text.
- If nothing in the excerpts supports an answer, do NOT say documents or PDFs lack the answer. Say exactly: "Sorry, I cannot reply to this query here. For guidance tailored to your situation, please contact a lawyer at Lawway Chambers for more support." Then add: "This is general information, not legal advice."

Closing:
- Always end every reply with: "This is general information, not legal advice."

Tone: professional, clear, concise, and easy for a non-lawyer to follow.`;

/** @deprecated Use ASSISTANT_SYSTEM_INSTRUCTIONS */
export const GEMINI_SYSTEM_INSTRUCTIONS = ASSISTANT_SYSTEM_INSTRUCTIONS;
