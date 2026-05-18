"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { getGuestSessionId } from "@/lib/guestSession";
import {
  addLandingMessage,
  listenToLandingMessages,
  type LandingChatMessage,
} from "@/lib/landingChatFirebase";
import { toast } from "sonner";

const WELCOME =
  "Hello! I'm the Lawway Assistant. Ask about our services, processes, or general legal information. This is general information, not legal advice.";

function ChatBubble({ role, text }: { role: "user" | "ai"; text: string }) {
  const isUser = role === "user";
  return (
    <div
      className={
        isUser
          ? "ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-sm leading-relaxed text-[#FCF9F6]"
          : "max-w-[92%] rounded-2xl rounded-bl-md border border-[#ebe7e2] bg-white px-4 py-2.5 text-sm leading-relaxed text-[#2c2c2c]"
      }
    >
      {!isUser && (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Lawway Assistant
        </p>
      )}
      {text}
    </div>
  );
}

export function LandingSupportWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<LandingChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSessionId(getGuestSessionId());
  }, []);

  useEffect(() => {
    if (!sessionId || !open) return;
    return listenToLandingMessages(sessionId, setMessages);
  }, [sessionId, open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, sending]);

  const requestAiReply = useCallback(async (userText: string) => {
    const res = await fetch("/api/chat/ai-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText }),
    });
    const data = await res.json();
    return typeof data.reply === "string" ? data.reply : null;
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !sessionId || sending) return;

    setSending(true);
    setInput("");

    try {
      await addLandingMessage(sessionId, text, "user");
      const reply = await requestAiReply(text);
      if (reply) {
        await addLandingMessage(sessionId, reply, "ai");
      } else {
        toast.error("Could not get a reply. Please try again.");
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[9998] flex size-14 items-center justify-center rounded-full bg-secondary text-[#FCF9F6] shadow-[0_12px_40px_-8px_rgba(62,39,35,0.55)] transition hover:scale-105 hover:bg-secondary/90"
          aria-label="Open support chat"
        >
          <MessageSquare className="size-6" />
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-primary/25" />
        </button>
      )}

      {open && (
        <div className="animate-landing-chat-in fixed bottom-4 right-4 z-[9999] flex h-[min(520px,85dvh)] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#ebe7e2] bg-white shadow-[0_24px_60px_-12px_rgba(46,39,35,0.35)]">
          <div className="flex items-center justify-between border-b border-[#ebe7e2] bg-[#FAF9F6] px-4 py-3">
              <ChatHeader />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-[#5c534c] transition hover:bg-[#ebe7e2]/80"
              aria-label="Close chat"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#FCF9F6] p-4">
            <div className="space-y-3">
              {messages.length === 0 && <ChatBubble role="ai" text={WELCOME} />}
              {messages.map((m) => (
                <ChatBubble
                  key={m.id}
                  role={m.senderType === "user" ? "user" : "ai"}
                  text={m.message}
                />
              ))}
              {sending && (
                <p className="text-xs text-[#8f8378]">Lawway Assistant is typing…</p>
              )}
              <div ref={endRef} />
            </div>
          </div>

          <div className="border-t border-[#ebe7e2] bg-white p-3">
            <div className="flex items-end gap-2 rounded-xl border border-[#ebe7e2] bg-[#FAF9F6] px-3 py-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask a question…"
                rows={1}
                className="max-h-24 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-[#2c2c2c] placeholder:text-[#8f8378] focus:outline-none"
                disabled={sending}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!input.trim() || sending}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-secondary transition hover:bg-primary/90 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-[#8f8378]">
              General information only — not legal advice.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function ChatHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
        <MessageSquare className="size-4 text-primary" />
      </div>
      <div>
        <p className="font-serif text-sm font-semibold text-secondary">Lawway Support</p>
        <p className="flex items-center gap-1.5 text-xs text-[#8f8378]">
          <span className="size-2 rounded-full bg-emerald-500" />
          Online
        </p>
      </div>
    </div>
  );
}
