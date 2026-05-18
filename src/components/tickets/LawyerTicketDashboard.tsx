"use client";

import React, { useEffect, useRef, useState } from "react";
import { FileText, Home, Menu, MessageCircle, Send, X } from "lucide-react";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  addTicketMessage,
  listenToTicketMessages,
  listenToTicketsForLawyer,
  markLawyerInboxSeen,
  type LawyerInboxTicket,
} from "@/lib/ticketFirebase";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type LawyerTicketDashboardProps = {
  lawyerUserId: string;
  /** Shown on outgoing messages (e.g. your name or “Advocate”) */
  lawyerSenderName: string;
};

const linkifyHtml = (html: string): string => {
  const urlRe = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;
  const mdLinkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const linkAttrs =
    'class="text-[#d4af37] underline hover:opacity-80 break-all" target="_blank" rel="noopener noreferrer"';
  const parts = html.split(/(<a\b[^>]*>[\s\S]*?<\/a>)/gi);
  return parts
    .map((seg) => {
      if (/^<a\b/i.test(seg)) return seg;
      let out = seg.replace(mdLinkRe, (_m, t: string, u: string) => `<a href="${u}" ${linkAttrs}>${t}</a>`);
      const sub = out.split(/(<[^>]+>)/g);
      out = sub
        .map((sp) =>
          sp.startsWith("<") ? sp : sp.replace(urlRe, (m) => `<a href="${m}" ${linkAttrs}>${m}</a>`),
        )
        .join("");
      return out;
    })
    .join("");
};

const MessageBody: React.FC<{ content: string; className?: string }> = ({
  content,
  className,
}) => {
  if (!content) return null;
  const isHtml = /<[a-z][\s\S]*?>/i.test(content);
  if (isHtml) {
    return (
      <div
        className={`ckeditor-message-content prose prose-invert prose-sm mb-1 max-w-none text-sm text-[#f4ede4] [&_*]:text-[#ebe3d9] [&_a]:text-[#d4af37] [&_a]:underline ${className || ""}`}
        dangerouslySetInnerHTML={{ __html: linkifyHtml(content) }}
      />
    );
  }
  return (
    <div
      className={`prose prose-invert prose-sm mb-1 max-w-none text-sm text-[#f4ede4] [&_blockquote]:text-white/85 [&_code]:text-[#f4ede4] ${className || ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <span className="text-[#f4ede4]">{children}</span>,
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          li: ({ children }) => (
            <li className="text-[#ebe3d9]">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#d4af37]/40 pl-2 text-[#ebe3d9] italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default function LawyerTicketDashboard({
  lawyerUserId,
  lawyerSenderName,
}: LawyerTicketDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tickets, setTickets] = useState<LawyerInboxTicket[]>([]);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<LawyerInboxTicket | null>(null);
  const [messages, setMessages] = useState<unknown[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChatView, setShowChatView] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const r = () => setIsCompact(typeof window !== "undefined" && window.innerWidth <= 640);
    r();
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);

  useEffect(() => {
    const u = listenToTicketsForLawyer(lawyerUserId, (list) => {
      setTickets(list);
      setTicketsLoaded(true);
    });
    return () => u();
  }, [lawyerUserId]);

  useEffect(() => {
    if (!selectedTicket) return;
    const u = tickets.find(
      (t) =>
        t.ticketId === selectedTicket.ticketId &&
        t.clientUserId === selectedTicket.clientUserId,
    );
    if (
      u &&
      (u.status !== selectedTicket.status ||
        (u.adminUnreadCount ?? 0) !== (selectedTicket.adminUnreadCount ?? 0))
    ) {
      setSelectedTicket(u);
    }
  }, [tickets, selectedTicket?.ticketId, selectedTicket?.clientUserId]);

  useEffect(() => {
    if (!tickets.length || !ticketsLoaded) return;
    const id = searchParams.get("id");
    if (!id) return;
    const t = tickets.find((x) => x.ticketId === id);
    if (
      t &&
      (t.ticketId !== selectedTicket?.ticketId ||
        t.clientUserId !== selectedTicket?.clientUserId)
    ) {
      setSelectedTicket(t);
      if (isCompact) setShowChatView(true);
    }
  }, [tickets, ticketsLoaded, searchParams, isCompact, selectedTicket?.ticketId]);

  useEffect(() => {
    if (!selectedTicket || !lawyerUserId) return;
    const clientId = selectedTicket.clientUserId;
    const ticketId = selectedTicket.ticketId;
    void markLawyerInboxSeen(clientId, selectedTicket.id).catch(() => {});
    setMessagesLoading(true);
    setMessages([]);
    const u = listenToTicketMessages(clientId, ticketId, (newMsgs) => {
      setMessages(newMsgs as unknown[]);
      setMessagesLoading(false);
      setTickets((prev) =>
        prev.map((t) =>
          t.ticketId === ticketId && t.clientUserId === clientId
            ? { ...t, adminUnreadCount: 0 }
            : t,
        ),
      );
    });
    return () => u();
  }, [selectedTicket?.ticketId, selectedTicket?.clientUserId, selectedTicket?.id, lawyerUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const formatTime = (timestamp: { toDate?: () => Date; seconds?: number }) => {
    if (!timestamp) return "";
    const d = timestamp.toDate?.() ?? new Date((timestamp.seconds ?? 0) * 1000);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
  };

  const getDateLabel = (timestamp: { toDate?: () => Date; seconds?: number }) => {
    if (!timestamp) return "";
    const d = timestamp.toDate?.() ?? new Date((timestamp.seconds ?? 0) * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dn = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    if (dn(d).getTime() === dn(today).getTime()) return "Today";
    if (dn(d).getTime() === dn(yesterday).getTime()) return "Yesterday";
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const groupMessagesByDate = (msgs: { timestamp?: unknown }[]) => {
    const g: Record<string, unknown[]> = {};
    msgs.forEach((m) => {
      const label = getDateLabel(m.timestamp as { toDate?: () => Date; seconds?: number });
      if (!g[label]) g[label] = [];
      g[label].push(m);
    });
    return g;
  };

  const formatTicketDate = (timestamp: unknown) => {
    const ts = timestamp as { toDate?: () => Date; seconds?: number } | undefined;
    if (!ts) return "";
    const d = ts.toDate?.() ?? new Date((ts.seconds ?? 0) * 1000);
    const today = new Date();
    const dn = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    if (dn(d).getTime() === dn(today).getTime()) return formatTime(ts);
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "text-[#d4af37]";
      case "in-progress":
        return "text-amber-300";
      case "resolved":
        return "text-emerald-400";
      case "closed":
        return "text-white/40";
      default:
        return "text-white/40";
    }
  };

  const handleTicketSelect = (t: LawyerInboxTicket) => {
    setSelectedTicket(t);
    if (isCompact) setShowChatView(true);
    const p = new URLSearchParams(searchParams.toString());
    p.set("id", t.ticketId);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    setSidebarOpen(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim() || sending) return;
    if (selectedTicket.status === "closed") {
      toast.error("This thread is closed.");
      return;
    }
    const clientUserId = selectedTicket.clientUserId;
    const ticketId = selectedTicket.ticketId;
    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);
    try {
      const payload = {
        ticketId,
        senderId: lawyerUserId,
        senderName: lawyerSenderName,
        senderType: "admin" as const,
        message: messageText,
        isRead: false,
        type: "text" as const,
      };
      const optimistic = {
        id: "temp_" + Date.now(),
        ...payload,
        timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
      };
      setMessages((m) => [...(m as object[]), optimistic]);
      await addTicketMessage(
        clientUserId,
        ticketId,
        payload as Parameters<typeof addTicketMessage>[2],
      );
    } catch (err) {
      console.error(err);
      setNewMessage(messageText);
      toast.error("Failed to send.");
      setMessages((m) => (m as { id: string }[]).filter((x) => !x.id.startsWith("temp_")));
    } finally {
      setSending(false);
    }
  };

  const isPdfDocument = (url: string) => /\.pdf$/i.test(url) || url.includes("pdf");

  return (
    <div className="flex h-[var(--ticket-h,100dvh)] w-full overflow-hidden bg-gradient-to-br from-[#1a0f0e] via-[#140c0a] to-[#1a0f0e]">
      {sidebarOpen && !isCompact && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={`
        flex w-80 max-w-[85vw] flex-col overflow-hidden border-r border-[#d4af37]/25 bg-[#1a0f0e] shadow-2xl
        ${isCompact ? (showChatView ? "hidden" : "w-full max-w-full") : "fixed z-50 transition-transform duration-300 ease-out md:relative md:z-auto md:translate-x-0"}
        ${!isCompact && (sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")}
        h-full
      `}
      >
        <div className="relative border-b border-[#d4af37]/25 bg-gradient-to-br from-[#241816]/90 via-[#1a0f0e]/95 to-[#140c0a]/95 px-4 py-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">Client messages</h2>
              <p className="text-[11px] text-white/40">Threads opened with you</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-md border border-[#d4af37]/50 bg-[#d4af37]/10 p-1.5 text-[#d4af37] hover:bg-[#d4af37]/20"
              title="Dashboard home"
            >
              <Home className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="scrollbar-themed min-h-0 flex-1 overflow-y-auto">
          {ticketsLoaded && tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageCircle className="h-10 w-10 text-[#d4af37]/40" />
              <p className="mt-3 text-sm text-white/50">No client conversations yet</p>
            </div>
          ) : ticketsLoaded ? (
            tickets.map((ticket) => (
              <button
                key={`${ticket.clientUserId}-${ticket.id}`}
                type="button"
                onClick={() => handleTicketSelect(ticket)}
                className={`w-full border-b border-[#d4af37]/15 p-4 text-left transition-colors ${
                  selectedTicket?.ticketId === ticket.ticketId &&
                  selectedTicket?.clientUserId === ticket.clientUserId
                    ? "bg-gradient-to-r from-[#3e2723]/80 to-[#d4af37]/25"
                    : "hover:bg-[#2a1815]/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-semibold text-white">{ticket.subject}</h3>
                  {(ticket.adminUnreadCount ?? 0) > 0 && (
                    <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d4af37] to-[#3e2723] px-2 text-xs font-bold text-white">
                      {ticket.adminUnreadCount}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-[11px] text-[#d4af37]/85">{ticket.userUid}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-white/45">{formatTicketDate(ticket.recentActivity)}</span>
                  <span
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold capitalize ${getStatusColor(ticket.status)} bg-current/10`}
                  >
                    {ticket.status}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <p className="p-6 text-center text-sm text-white/45">Loading…</p>
          )}
        </div>
      </div>

      <div
        className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#1a0f0e] ${isCompact && !showChatView ? "hidden" : ""}`}
      >
        {!ticketsLoaded ? (
          <div className="flex flex-1 items-center justify-center text-white/50">Loading…</div>
        ) : selectedTicket ? (
          <>
            <div className="z-30 shrink-0 border-b border-[#d4af37]/20 bg-[#1a0f0e]">
              <div className="flex items-center gap-2 px-3 py-2.5 md:px-6">
                {isCompact ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg p-2 text-white/60 hover:bg-white/5"
                    onClick={() => setShowChatView(false)}
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg p-2 text-white/60 hover:bg-white/5 md:hidden"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-base font-semibold text-white md:text-lg">
                    {selectedTicket.subject}
                  </h1>
                  <p className="truncate text-xs text-[#d4af37]/80">{selectedTicket.userUid}</p>
                </div>
                <span
                  className={`shrink-0 rounded-md border border-[#d4af37]/30 px-2 py-0.5 text-[10px] capitalize md:text-xs ${getStatusColor(selectedTicket.status)}`}
                >
                  {selectedTicket.status}
                </span>
              </div>
            </div>

            <div className="scrollbar-themed min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
              {messagesLoading && messages.length === 0 ? (
                <p className="text-center text-white/40">Loading messages…</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupMessagesByDate(messages as { timestamp?: unknown }[])).map(
                    ([label, list]) => (
                      <div key={label} className="space-y-3">
                        <div className="flex justify-center">
                          <span className="rounded-full border border-[#d4af37]/25 bg-[#2a1815]/80 px-4 py-1 text-xs text-white/60">
                            {label}
                          </span>
                        </div>
                        {(list as object[]).map((message: Record<string, unknown>) => (
                          <div
                            key={(message as { id: string }).id}
                            className={`flex items-start ${message.senderType === "user" ? "justify-end" : "justify-start"} gap-2`}
                          >
                            <div
                              className={`relative max-w-[80%] rounded-2xl border p-3 text-[#f4ede4] [&_img]:rounded ${
                                message.senderType === "user"
                                  ? "border-[#3e2723]/60 bg-gradient-to-br from-[#3e2723]/40 to-[#1a0f0e]/80"
                                  : "border-[#d4af37]/25 bg-[#2a1815]/70"
                              }`}
                            >
                              {message.type === "image" && message.imageUrl && (
                                <img
                                  src={String(message.imageUrl)}
                                  alt=""
                                  className="mb-2 max-h-48 rounded object-contain"
                                  onClick={() => setSelectedImage(String(message.imageUrl))}
                                />
                              )}
                              {message.type === "document" && message.imageUrl && (
                                <button
                                  type="button"
                                  className="mb-2 flex w-full items-center gap-2 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 p-2 text-left text-sm text-white"
                                  onClick={() => setSelectedDocument(String(message.imageUrl))}
                                >
                                  <FileText className="h-6 w-6 shrink-0 text-[#d4af37]" />
                                  <span className="truncate">Open document</span>
                                </button>
                              )}
                              {message.type === "images" &&
                                Array.isArray(message.imageUrls) &&
                                (message.imageUrls as string[]).map((u: string, i: number) => (
                                  <img
                                    key={i}
                                    src={u}
                                    alt=""
                                    className="mb-1 max-h-40 cursor-pointer rounded"
                                    onClick={() => setSelectedImage(u)}
                                  />
                                ))}
                              {(!message.type || message.type === "text") && message.message && (
                                <MessageBody content={String(message.message)} />
                              )}
                              <div className="mt-1 text-right text-[11px] text-white/55">
                                {formatTime(message.timestamp as { seconds?: number; toDate?: () => Date })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ),
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {selectedTicket.status !== "closed" ? (
              <form
                onSubmit={handleSendMessage}
                className="shrink-0 border-t border-[#d4af37]/20 bg-[#1a0f0e]/95 p-3 backdrop-blur md:p-4"
              >
                <div className="flex items-end gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={1}
                    placeholder="Reply to your client…"
                    className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-[#d4af37]/30 bg-[#140c0a]/80 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#d4af37]/60 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="shrink-0 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#3e2723] p-3 text-white disabled:opacity-40"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="shrink-0 border-t border-white/10 p-4 text-center text-sm text-white/50">
                This thread is closed.
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <MessageCircle className="h-10 w-10 text-[#d4af37]/60" />
            <p className="text-sm text-white/60">Select a conversation</p>
          </div>
        )}
      </div>

      {selectedImage && (
        <button
          type="button"
          className="fixed inset-0 z-[1800] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
          aria-label="Close image"
        >
          <img
            src={selectedImage}
            alt=""
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      )}

      {selectedDocument && (
        <div
          className="fixed inset-0 z-[1800] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedDocument(null)}
          role="presentation"
        >
          <div
            className="relative flex h-[90vh] max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-[#1a0f0e]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
          >
            <div className="flex items-center justify-between border-b border-[#d4af37]/30 p-3">
              <span className="font-medium text-white">Document</span>
              <div className="flex gap-2">
                <a
                  href={selectedDocument}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-[#d4af37] px-3 py-1.5 text-sm font-medium text-[#3e2723]"
                >
                  Open
                </a>
                <button
                  type="button"
                  className="rounded-lg p-2 text-white/70 hover:bg-white/10"
                  onClick={() => setSelectedDocument(null)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-[#111]">
              {isPdfDocument(selectedDocument) ? (
                <DocViewer
                  documents={[{ uri: selectedDocument }]}
                  pluginRenderers={DocViewerRenderers}
                  style={{ height: "100%", minHeight: 480 }}
                  config={{ header: { disableHeader: true } }}
                />
              ) : (
                <div className="p-8 text-center text-white/60">
                  <a
                    href={selectedDocument}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d4af37] underline"
                  >
                    Download file
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
