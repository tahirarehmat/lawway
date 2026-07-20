"use client";

import React, { useEffect, useRef, useState } from "react";
import { FileText, Home, Menu, MessageCircle, Send, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  addTicketMessage,
  listenToTicketMessages,
  listenToTicketsForLawyer,
  markLawyerInboxSeen,
  type LawyerInboxTicket,
  type TicketMessage,
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
    'class="text-primary underline hover:opacity-80 break-all" target="_blank" rel="noopener noreferrer"';
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
        className={`ckeditor-message-content prose prose-sm mb-1 max-w-none text-sm text-foreground [&_*]:text-foreground [&_a]:text-primary [&_a]:underline ${className || ""}`}
        dangerouslySetInnerHTML={{ __html: linkifyHtml(content) }}
      />
    );
  }
  return (
    <div
      className={`prose prose-sm mb-1 max-w-none text-sm text-foreground [&_blockquote]:text-muted-foreground [&_code]:text-foreground ${className || ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <span className="text-foreground">{children}</span>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          li: ({ children }) => (
            <li className="text-foreground">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 pl-2 text-muted-foreground">
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
  const [messages, setMessages] = useState<TicketMessage[]>([]);
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

    const clientId = searchParams.get("clientId")?.trim();
    if (clientId) {
      const forClient = tickets.filter((x) => x.clientUserId === clientId);
      const t =
        forClient.find((x) => x.status !== "closed") ?? forClient[0] ?? null;
      if (
        t &&
        (t.ticketId !== selectedTicket?.ticketId ||
          t.clientUserId !== selectedTicket?.clientUserId)
      ) {
        setSelectedTicket(t);
        if (isCompact) setShowChatView(true);
      }
      return;
    }

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
  }, [
    tickets,
    ticketsLoaded,
    searchParams,
    isCompact,
    selectedTicket?.ticketId,
    selectedTicket?.clientUserId,
  ]);

  useEffect(() => {
    if (!selectedTicket || !lawyerUserId) return;
    const clientId = selectedTicket.clientUserId;
    const ticketId = selectedTicket.ticketId;
    void markLawyerInboxSeen(clientId, selectedTicket.id).catch(() => {});
    setMessagesLoading(true);
    setMessages([]);
    const u = listenToTicketMessages(clientId, ticketId, (newMsgs) => {
      setMessages(newMsgs);
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

  const groupMessagesByDate = (msgs: TicketMessage[]) => {
    const g: Record<string, TicketMessage[]> = {};
    msgs.forEach((m) => {
      const label = getDateLabel(m.timestamp);
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
        return "text-primary";
      case "in-progress":
        return "text-primary";
      case "resolved":
        return "text-muted-foreground";
      case "closed":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
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
      const optimistic: TicketMessage = {
        id: "temp_" + Date.now(),
        messageId: "temp_" + Date.now(),
        ...payload,
        timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as TicketMessage["timestamp"],
      };
      setMessages((m) => [...m, optimistic]);
      await addTicketMessage(
        clientUserId,
        ticketId,
        payload as Parameters<typeof addTicketMessage>[2],
      );
    } catch (err) {
      console.error(err);
      setNewMessage(messageText);
      toast.error("Failed to send.");
      setMessages((m) => m.filter((x) => !x.id.startsWith("temp_")));
    } finally {
      setSending(false);
    }
  };

  const isPdfDocument = (url: string) => /\.pdf$/i.test(url) || url.includes("pdf");

  return (
    <div className="flex h-[var(--ticket-h,100dvh)] w-full overflow-hidden bg-background">
      {sidebarOpen && !isCompact && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={`
        flex w-80 max-w-[85vw] flex-col overflow-hidden border-r border-border bg-card
        ${isCompact ? (showChatView ? "hidden" : "w-full max-w-full") : "fixed z-50 transition-transform duration-300 ease-out md:relative md:z-auto md:translate-x-0"}
        ${!isCompact && (sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")}
        h-full
      `}
      >
        <div className="border-b border-border bg-card px-4 py-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Client messages</h2>
              <p className="text-[11px] text-muted-foreground">Threads opened with you</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Dashboard home"
            >
              <Home className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="scrollbar-themed min-h-0 flex-1 overflow-y-auto">
          {ticketsLoaded && tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No client conversations yet</p>
            </div>
          ) : ticketsLoaded ? (
            tickets.map((ticket) => (
              <button
                key={`${ticket.clientUserId}-${ticket.id}`}
                type="button"
                onClick={() => handleTicketSelect(ticket)}
                className={`w-full border-b border-border p-4 text-left transition-colors ${
                  selectedTicket?.ticketId === ticket.ticketId &&
                  selectedTicket?.clientUserId === ticket.clientUserId
                    ? "bg-primary/10"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-semibold tracking-tight text-foreground">{ticket.subject}</h3>
                  {(ticket.adminUnreadCount ?? 0) > 0 && (
                    <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
                      {ticket.adminUnreadCount}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{ticket.userUid}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{formatTicketDate(ticket.recentActivity)}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${getStatusColor(ticket.status)} bg-current/10`}
                  >
                    {ticket.status}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
          )}
        </div>
      </div>

      <div
        className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background ${isCompact && !showChatView ? "hidden" : ""}`}
      >
        {!ticketsLoaded ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">Loading…</div>
        ) : selectedTicket ? (
          <>
            <div className="z-30 shrink-0 border-b border-border bg-card">
              <div className="flex items-center gap-2 px-3 py-2.5 md:px-6">
                {isCompact ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setShowChatView(false)}
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-base font-semibold tracking-tight text-foreground md:text-lg">
                    {selectedTicket.subject}
                  </h1>
                  <p className="truncate text-xs text-muted-foreground">{selectedTicket.userUid}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[10px] capitalize md:text-xs ${getStatusColor(selectedTicket.status)}`}
                >
                  {selectedTicket.status}
                </span>
              </div>
            </div>

            <div className="scrollbar-themed min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
              {messagesLoading && messages.length === 0 ? (
                <p className="text-center text-muted-foreground">Loading messages…</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupMessagesByDate(messages)).map(
                    ([label, list]) => (
                      <div key={label} className="space-y-3">
                        <div className="flex justify-center">
                          <span className="rounded-full border border-border bg-muted px-4 py-1 text-xs text-muted-foreground">
                            {label}
                          </span>
                        </div>
                        {list.map((message) => (
                          <div
                            key={message.id}
                            className={`flex items-start ${message.senderType === "user" ? "justify-end" : "justify-start"} gap-2`}
                          >
                            <div
                              className={`relative max-w-[80%] rounded-2xl border p-3.5 text-foreground [&_img]:rounded-xl ${
                                message.senderType === "user"
                                  ? "border-border bg-muted"
                                  : "border-transparent bg-primary/15"
                              }`}
                            >
                              {message.type === "image" && Boolean(message.imageUrl) && (
                                <img
                                  src={String(message.imageUrl)}
                                  alt=""
                                  className="mb-2 max-h-48 rounded object-contain"
                                  onClick={() => setSelectedImage(String(message.imageUrl))}
                                />
                              )}
                              {message.type === "document" && Boolean(message.imageUrl) && (
                                <button
                                  type="button"
                                  className="mb-2 flex w-full items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-left text-sm text-foreground hover:bg-muted"
                                  onClick={() => setSelectedDocument(String(message.imageUrl))}
                                >
                                  <FileText className="h-6 w-6 shrink-0 text-primary" />
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
                                <MessageBody content={message.message} />
                              )}
                              <div className="mt-1 text-right text-[11px] text-white/55">
                                {formatTime(message.timestamp)}
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
                className="shrink-0 border-t border-border bg-card p-3 md:p-4"
              >
                <div className="flex items-end gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={1}
                    placeholder="Reply to your client…"
                    className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="shrink-0 rounded-[10px] bg-primary p-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="shrink-0 border-t border-border p-4 text-center text-sm text-muted-foreground">
                This thread is closed.
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Select a conversation</p>
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
            className="relative flex h-[90vh] max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
          >
            <div className="flex items-center justify-between border-b border-border p-3">
              <span className="font-semibold tracking-tight text-foreground">Document</span>
              <div className="flex gap-2">
                <a
                  href={selectedDocument}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[10px] bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Open
                </a>
                <button
                  type="button"
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setSelectedDocument(null)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-muted p-3">
              {isPdfDocument(selectedDocument) ? (
                <iframe
                  title="PDF document"
                  src={selectedDocument}
                  className="h-full min-h-[480px] w-full rounded-xl border border-border bg-white"
                />
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <a
                    href={selectedDocument}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
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
