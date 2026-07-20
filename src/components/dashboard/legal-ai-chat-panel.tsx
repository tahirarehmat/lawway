"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
};

const WELCOME =
  "Hi, I'm the Lawway Legal AI Assistant. Ask about case strategy, procedure, research angles, or draft language. This is general information, not legal advice.";

export function LegalAiChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as { reply?: string };
      if (typeof data.reply === "string" && data.reply.trim()) {
        setMessages((prev) => [
          ...prev,
          { id: `a_${Date.now()}`, role: "ai", text: data.reply as string },
        ]);
      } else {
        toast.error("Could not get a reply. Please try again.");
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col">
      <header className="mb-4 shrink-0">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
          Research
        </p>
        <div className="mt-1 flex items-center gap-3">
          <Bot
            className="size-8 text-[var(--gold,#f5b73c)]"
            strokeWidth={1.5}
            aria-hidden
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Legal AI
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500" />
              Online — general information only, not legal advice
            </p>
          </div>
        </div>
      </header>

      <div className="dashboard-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={messagesContainerRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5"
        >          <div className="space-y-3">
            {messages.length === 0 ? (
              <ChatBubble role="ai" text={WELCOME} />
            ) : null}
            {messages.map((m) => (
              <ChatBubble key={m.id} role={m.role} text={m.text} />
            ))}
            {sending ? (
              <p className="text-xs text-muted-foreground">
                Legal AI is typing…
              </p>
            ) : null}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t border-border p-3 sm:p-4">
          <div className="flex items-end gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about procedure, research, or drafting…"
              rows={1}
              className="max-h-28 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              disabled={sending}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || sending}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ role, text }: { role: "user" | "ai"; text: string }) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
        isUser
          ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
          : "rounded-bl-md bg-muted/60 text-foreground",
      )}
    >
      {!isUser ? (
        <p className="mb-1 text-[10px] font-semibold tracking-wide text-[var(--gold,#f5b73c)] uppercase">
          Legal AI
        </p>
      ) : null}
      {text}
    </div>
  );
}
