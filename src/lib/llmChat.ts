import OpenAI from "openai";
import { ASSISTANT_SYSTEM_INSTRUCTIONS } from "@/lib/assistantReplies";

export type LlmProvider = "groq" | "openai" | "gemini";

const MAX_KB_CHARS = 100_000;

const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

const DEFAULT_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
] as const;

function buildSystemContent(knowledgeContext: string): string {
  const kb = knowledgeContext.trim().slice(0, MAX_KB_CHARS);
  if (!kb) {
    return `${ASSISTANT_SYSTEM_INSTRUCTIONS}\n\n(No reference material was loaded for this session. If you cannot answer from general guidance, use the "cannot reply" response and suggest contacting Lawway Chambers.)`;
  }
  return `${ASSISTANT_SYSTEM_INSTRUCTIONS}\n\n--- Reference material (from firm knowledge base) ---\n${kb}`;
}

async function chatWithOpenAICompatible(
  client: OpenAI,
  model: string,
  knowledgeContext: string,
  userMessage: string,
): Promise<string | null> {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 1024,
    messages: [
      { role: "system", content: buildSystemContent(knowledgeContext) },
      { role: "user", content: userMessage },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  return text || null;
}

export async function tryGroqReply(
  knowledgeContext: string,
  userMessage: string,
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.GROQ_MODEL?.trim() || GROQ_DEFAULT_MODEL;
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  return chatWithOpenAICompatible(client, model, knowledgeContext, userMessage);
}

export async function tryOpenAiReply(
  knowledgeContext: string,
  userMessage: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || OPENAI_DEFAULT_MODEL;
  const client = new OpenAI({ apiKey });

  return chatWithOpenAICompatible(client, model, knowledgeContext, userMessage);
}

function geminiErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const s = (error as { status: unknown }).status;
    return typeof s === "number" ? s : undefined;
  }
  return undefined;
}

export async function tryGeminiReply(
  knowledgeContext: string,
  userMessage: string,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const envModel = process.env.GEMINI_MODEL?.trim();
  const modelsToTry = [
    ...(envModel ? [envModel] : []),
    ...DEFAULT_GEMINI_MODELS.filter((m) => m !== envModel),
  ];

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = `${buildSystemContent(knowledgeContext)}\n\n--- User message ---\n${userMessage}`;

  let lastError: unknown;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const reply = result.response.text()?.trim();
      if (reply) return reply;
    } catch (error) {
      lastError = error;
      const status = geminiErrorStatus(error);
      if (status === 404 || status === 429 || status === 403) {
        console.warn(`[llm] Gemini ${modelName} failed (${status}), trying next…`);
        continue;
      }
      throw error;
    }
  }

  if (lastError) throw lastError;
  return null;
}

/** Resolve provider order from env (default: Groq → OpenAI → Gemini). */
export function resolveProviderOrder(): LlmProvider[] {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === "groq") return ["groq"];
  if (explicit === "openai") return ["openai"];
  if (explicit === "gemini") return ["gemini"];

  const order: LlmProvider[] = [];
  if (process.env.GROQ_API_KEY?.trim()) order.push("groq");
  if (process.env.OPENAI_API_KEY?.trim()) order.push("openai");
  if (process.env.GEMINI_API_KEY?.trim()) order.push("gemini");
  return order;
}

export async function tryLlmReply(
  knowledgeContext: string,
  userMessage: string,
): Promise<{ reply: string; provider: LlmProvider } | null> {
  const providers = resolveProviderOrder();
  if (providers.length === 0) return null;

  let lastError: unknown;

  for (const provider of providers) {
    try {
      let reply: string | null = null;
      if (provider === "groq") {
        reply = await tryGroqReply(knowledgeContext, userMessage);
      } else if (provider === "openai") {
        reply = await tryOpenAiReply(knowledgeContext, userMessage);
      } else {
        reply = await tryGeminiReply(knowledgeContext, userMessage);
      }
      if (reply) return { reply, provider };
    } catch (error) {
      lastError = error;
      console.warn(`[llm] ${provider} failed:`, error);
    }
  }

  if (lastError) throw lastError;
  return null;
}
