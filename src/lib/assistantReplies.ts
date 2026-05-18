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

/** Instructions for LLM providers (OpenAI, Groq, Gemini) — must match deterministic behavior. */
export const ASSISTANT_SYSTEM_INSTRUCTIONS = `You are Lawway Assistant for Lawway Chambers, helping with general legal information about Pakistani law.

Rules:
- If the user only greets you (hi, hello, thanks, good morning, etc.), reply warmly, invite them to ask a legal question, and end with: "This is general information, not legal advice."
- The reference material contains official Q&A pairs formatted as **Q:** and **A:**. When the user's question matches or is similar to a **Q:** entry, base your reply on the corresponding **A:** and **Applicable Law:** — you may paraphrase clearly but keep the legal substance accurate.
- Use ONLY the reference material. Do not invent laws, sections, or procedures.
- If nothing in the reference material answers the question, do NOT say documents or PDFs lack the answer. Say: "Sorry, I cannot reply to this query here. For guidance tailored to your situation, please contact a lawyer at Lawway Chambers for more support." Then add: "This is general information, not legal advice."
- Be professional, clear, and concise. Use short paragraphs.`;

/** @deprecated Use ASSISTANT_SYSTEM_INSTRUCTIONS */
export const GEMINI_SYSTEM_INSTRUCTIONS = ASSISTANT_SYSTEM_INSTRUCTIONS;
