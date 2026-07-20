import OpenAI from "openai";
import { ASSISTANT_SYSTEM_INSTRUCTIONS } from "@/lib/assistantReplies";

export type LlmProvider = "cerebras";

const MAX_KB_CHARS = 100_000;
const CEREBRAS_DEFAULT_MODEL = "llama-3.3-70b";

function buildSystemContent(knowledgeContext: string): string {
  const kb = knowledgeContext.trim().slice(0, MAX_KB_CHARS);
  const reminder =
    "\n\nReminder: Answer the user's question first in plain English. Explain what the law means; do not list section titles alone.";
  if (!kb) {
    return `${ASSISTANT_SYSTEM_INSTRUCTIONS}${reminder}\n\n(No reference material was loaded for this session. If you cannot answer from general guidance, use the "cannot reply" response and suggest contacting Lawway Chambers.)`;
  }
  return `${ASSISTANT_SYSTEM_INSTRUCTIONS}${reminder}\n\n--- Reference material (from firm knowledge base) ---\n${kb}`;
}

/** Frames the user turn so RAG answers lead with plain language, not TOC-style dumps. */
export function buildUserPrompt(userMessage: string): string {
  return [
    `User question: ${userMessage.trim()}`,
    "",
    "Respond with a clear plain-language answer first, then cite relevant law from the reference material. Do not reply with only a table of contents or bare section titles.",
  ].join("\n");
}

export async function tryCerebrasReply(
  knowledgeContext: string,
  userMessage: string,
): Promise<string | null> {
  const apiKey = process.env.CEREBRAS_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.CEREBRAS_MODEL?.trim() || CEREBRAS_DEFAULT_MODEL;
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.cerebras.ai/v1",
  });

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 1024,
    messages: [
      { role: "system", content: buildSystemContent(knowledgeContext) },
      { role: "user", content: buildUserPrompt(userMessage) },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  return text || null;
}

/** Landing assistant uses Cerebras only. */
export function resolveProviderOrder(): LlmProvider[] {
  if (process.env.CEREBRAS_API_KEY?.trim()) return ["cerebras"];
  return [];
}

export async function tryLlmReply(
  knowledgeContext: string,
  userMessage: string,
): Promise<{ reply: string; provider: LlmProvider } | null> {
  if (!process.env.CEREBRAS_API_KEY?.trim()) return null;

  try {
    const reply = await tryCerebrasReply(knowledgeContext, userMessage);
    if (reply) return { reply, provider: "cerebras" };
    return null;
  } catch (error) {
    console.warn("[llm] cerebras failed:", error);
    throw error;
  }
}
