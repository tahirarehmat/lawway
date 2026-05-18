import { NextResponse } from "next/server";
import { getGreetingReply, isLikelyGreeting } from "@/lib/assistantReplies";
import { loadKnowledgeContext, searchKnowledgeFallback } from "@/lib/knowledgeBase";
import { tryLlmReply } from "@/lib/llmChat";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let message = "";
  try {
    const body = await request.json();
    message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (isLikelyGreeting(message)) {
      return NextResponse.json({ reply: getGreetingReply(), source: "greeting" });
    }

    const context = await loadKnowledgeContext();

    try {
      const llm = await tryLlmReply(context, message);
      if (llm) {
        return NextResponse.json({ reply: llm.reply, source: llm.provider });
      }
    } catch (llmError) {
      console.warn("[ai-reply] All LLM providers failed, using keyword assist:", llmError);
    }

    const reply = searchKnowledgeFallback(context, message);
    return NextResponse.json({ reply, source: "knowledge-base-fallback" });
  } catch (error) {
    console.error("[ai-reply]", error);
    return NextResponse.json(
      {
        reply:
          "Sorry, I cannot reply to this query here. For guidance tailored to your situation, please contact a lawyer at Lawway Chambers for more support.\n\nThis is general information, not legal advice.",
      },
      { status: 500 },
    );
  }
}
