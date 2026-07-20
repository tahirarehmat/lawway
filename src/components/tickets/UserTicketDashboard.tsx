"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Edit2,
  Eye,
  FileText,
  Home,
  Menu,
  MessageCircle,
  Paperclip,
  Reply,
  Send,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";
import { renderAsync } from "docx-preview";
import {
  addTicketMessage,
  closeAllUserTickets,
  createTicket,
  getUserTickets,
  listenToGlobalQueueStats,
  listenToTicketMessages,
  listenToUserBlockStatus,
  listenToUserTickets,
  markTicketMessagesAsRead,
  type QueueStats,
  type Ticket,
  type TicketMessage,
  type TicketIntake,
  type IntakeCategory,
} from "@/lib/ticketFirebase";

type ChatMessage = TicketMessage & { uploading?: boolean };
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import UserTicketSidebar from "@/components/tickets/UserTicketSidebar";
import { toast } from "sonner";
import {
  uploadDocumentToCloudinaryDirect,
  uploadImageToCloudinaryDirect,
  uploadVideoToCloudinary,
} from "@/lib/cloudinaryTicketUploads";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LawyerSearchResult } from "@/lib/lawyers";

const INITIAL_MESSAGES_LIMIT = 20;
const CACHE_DURATION = 300000;
const TICKET_CACHE_DURATION = 60000;

const CATEGORY_LABELS: Record<IntakeCategory, string> = {
  general_inquiry: "General inquiry",
  case_update: "Case update / status",
  billing_fees: "Billing & fees",
  documents_evidence: "Documents & evidence",
  hearing_scheduling: "Hearings & scheduling",
  urgent_matter: "Urgent matter",
  other: "Other",
};

const LAWWAY_CATEGORIES: IntakeCategory[] = [
  "general_inquiry",
  "case_update",
  "billing_fees",
  "documents_evidence",
  "hearing_scheduling",
  "urgent_matter",
  "other",
];

type IntakeStep = "category" | "case_ref" | "done";

interface IntakeState {
  category?: IntakeCategory;
  caseReference?: string;
}

interface UserTicketDashboardProps {
  userId: string;
  userUid: string;
  /** Open composer for this advocate (from Find a lawyer → Chat) */
  initialLawyerId?: string | null;
  isCompact?: boolean;
  isWidget?: boolean;
  onClose?: () => void;
}

function ticketToLawyerContext(t: Ticket): LawyerSearchResult | null {
  if (!t.lawyerId || !t.lawyerName) return null;
  return {
    userId: t.lawyerId,
    fullName: t.lawyerName,
    phone: "",
    specialization: "",
    province: "",
    officeAddress: "",
    experienceYears: null,
    bio: null,
    profilePhotoUrl: t.lawyerPhotoUrl ?? null,
    barRegistrationNo: "",
  };
}

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

export default function UserTicketDashboard({
  userId,
  userUid,
  initialLawyerId = null,
  isCompact = false,
  isWidget: _isWidget = true,
  onClose,
}: UserTicketDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelledUploadsRef = useRef<Set<string>>(new Set());

  const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(false);
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<unknown>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

  const [replyingTo, setReplyingTo] = useState<TicketMessage | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [keepKeyboardOpen, setKeepKeyboardOpen] = useState(false);
  const [showChatView, setShowChatView] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);

  const [intake, setIntake] = useState<IntakeState>({});
  const [intakeStep, setIntakeStep] = useState<IntakeStep>("category");
  const [caseRefInput, setCaseRefInput] = useState("");

  /** Advocate targeted for the next / current draft thread */
  const [chatWithLawyer, setChatWithLawyer] = useState<LawyerSearchResult | null>(null);

  const autoOpenedLawyerRef = useRef<string | null>(null);
  useEffect(() => {
    autoOpenedLawyerRef.current = null;
  }, [initialLawyerId]);

  useEffect(() => {
    if (!selectedTicket) return;
    const ctx = ticketToLawyerContext(selectedTicket);
    if (ctx) setChatWithLawyer(ctx);
  }, [selectedTicket?.id]);

  const [queueStats, setQueueStats] = useState<QueueStats>({
    openCount: 0,
    inProgressCount: 0,
    estimatedWaitMinutes: 0,
  });

  const [isUserBlocked, setIsUserBlocked] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`user_blocked_${userId}`) === "true";
    }
    return false;
  });

  const ticketIsActive = (t: Ticket) =>
    t.status !== "resolved" && t.status !== "closed";

  const hasActiveTicketForLawyer = (lawyerId: string | undefined) =>
    !!lawyerId && tickets.some((t) => t.lawyerId === lawyerId && ticketIsActive(t));

  const canCreateTicket =
    !isUserBlocked &&
    !!chatWithLawyer &&
    !hasActiveTicketForLawyer(chatWithLawyer.userId);

  const resetIntake = () => {
    setIntake({});
    setIntakeStep("category");
    setCaseRefInput("");
  };

  const needsCaseRefPrompt = (cat: IntakeCategory) =>
    ["case_update", "billing_fees", "documents_evidence", "hearing_scheduling"].includes(cat);

  useEffect(() => {
    if (!initialLawyerId?.trim()) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/lawyers/${encodeURIComponent(initialLawyerId.trim())}`,
        );
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        if (!cancelled && data.lawyer) setChatWithLawyer(data.lawyer as LawyerSearchResult);
      } catch {
        if (!cancelled) {
          setChatWithLawyer(null);
          toast.error("Could not load advocate profile.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialLawyerId]);

  useEffect(() => {
    if (!ticketsLoaded || !chatWithLawyer) return;
    const lid = chatWithLawyer.userId;
    const match = tickets.find((t) => t.lawyerId === lid && ticketIsActive(t));
    if (match) {
      setSelectedTicket(match);
      setShowNewConversation(false);
      return;
    }
    if (initialLawyerId?.trim() === lid && autoOpenedLawyerRef.current !== lid) {
      autoOpenedLawyerRef.current = lid;
      setSelectedTicket(null);
      setShowNewConversation(true);
    }
  }, [ticketsLoaded, chatWithLawyer?.userId, tickets, initialLawyerId]);

  useEffect(() => {
    const u = listenToGlobalQueueStats(setQueueStats);
    return () => u();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const u = listenToUserBlockStatus(userId, async (blocked) => {
      setIsUserBlocked(blocked);
      if (typeof window !== "undefined") {
        localStorage.setItem(`user_blocked_${userId}`, blocked ? "true" : "false");
      }
      if (blocked) {
        try {
          await closeAllUserTickets(userId);
          setTickets((prev) =>
            prev.map((t) => ({ ...t, status: "closed" as const })),
          );
        } catch (e) {
          console.error(e);
        }
      }
    });
    return () => u();
  }, [userId]);

  useEffect(() => {
    const r = () => setIsMobile(typeof window !== "undefined" && window.innerWidth <= 640);
    r();
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const cacheKey = `cachedTickets_${userId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < TICKET_CACHE_DURATION) {
          const sorted = (parsed.tickets as Ticket[]).sort((a, b) => {
            if (a.status === "closed" && b.status !== "closed") return 1;
            if (b.status === "closed" && a.status !== "closed") return -1;
            const at = a.recentActivity?.toDate?.() ?? new Date(0);
            const bt = b.recentActivity?.toDate?.() ?? new Date(0);
            return bt.getTime() - at.getTime();
          });
          setTickets(sorted);
          setTicketsLoaded(true);
          const id = searchParams.get("id");
          if (id) {
            const t = sorted.find((x) => x.ticketId === id);
            if (t) {
              setSelectedTicket(t);
              if (isCompact) setShowChatView(true);
            }
          } else if (!isMobile && sorted.length) {
            const active = sorted.find((x) => x.status !== "closed");
            if (active) setSelectedTicket(active);
          }
        }
      }
    } catch {
      /* ignore */
    }

    (async () => {
      try {
        const userTickets = await getUserTickets(userId);
        const sorted = userTickets.sort((a, b) => {
          if (a.status === "closed" && b.status !== "closed") return 1;
          if (b.status === "closed" && a.status !== "closed") return -1;
          const at = a.recentActivity?.toDate?.() ?? new Date(0);
          const bt = b.recentActivity?.toDate?.() ?? new Date(0);
          return bt.getTime() - at.getTime();
        });
        setTickets(sorted);
        setTicketsLoaded(true);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ tickets: userTickets, timestamp: Date.now() }),
        );
        const id = searchParams.get("id");
        if (id) {
          const t = sorted.find((x) => x.ticketId === id);
          if (t) {
            setSelectedTicket(t);
            if (isCompact) setShowChatView(true);
          }
        } else if (!isMobile && sorted.length && !selectedTicket) {
          const active = sorted.find((x) => x.status !== "closed");
          if (active) setSelectedTicket(active);
        }
      } catch (e) {
        console.error(e);
      }
    })();

    const u = listenToUserTickets(userId, (updated) => {
      const sorted = updated.sort((a, b) => {
        if (a.status === "closed" && b.status !== "closed") return 1;
        if (b.status === "closed" && a.status !== "closed") return -1;
        const at = a.recentActivity?.toDate?.() ?? new Date(0);
        const bt = b.recentActivity?.toDate?.() ?? new Date(0);
        return bt.getTime() - at.getTime();
      });
      setTickets(sorted);
      setTicketsLoaded(true);
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ tickets: sorted, timestamp: Date.now() }),
        );
      } catch {
        /* ignore */
      }
    });
    return () => u();
  }, [userId, searchParams, isCompact, isMobile]);

  useEffect(() => {
    if (!selectedTicket || !tickets.length) return;
    const u = tickets.find((t) => t.ticketId === selectedTicket.ticketId);
    if (u && (u.status !== selectedTicket.status || u.unreadCount !== selectedTicket.unreadCount)) {
      setSelectedTicket(u);
    }
  }, [tickets, selectedTicket?.ticketId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchInitialMessages = async (uid: string, ticketId: string) => {
    setInitialMessagesLoaded(false);
    const cacheKey = `ticket_messages_${uid}_${ticketId}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          setMessages(parsed.messages as ChatMessage[]);
          setOldestMessageTimestamp(parsed.oldestTimestamp);
          setHasMoreMessages(parsed.hasMore);
          setInitialMessagesLoaded(true);
          setMessagesLoading(false);
          markTicketMessagesAsRead(uid, ticketId);
          setTimeout(scrollToBottom, 50);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    const messagesRef = collection(db, "chats", uid, "tickets", ticketId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "desc"), limit(INITIAL_MESSAGES_LIMIT));
    const snap = await getDocs(q);
    if (snap.empty) {
      setHasMoreMessages(false);
      setInitialMessagesLoaded(true);
      setMessagesLoading(false);
      return;
    }
    const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TicketMessage[];
    fetched.sort(
      (a, b) => (a.timestamp?.seconds ?? 0) - (b.timestamp?.seconds ?? 0),
    );
    setMessages(fetched);
    const oldest = snap.docs[snap.docs.length - 1].data().timestamp;
    setOldestMessageTimestamp(oldest);
    setHasMoreMessages(snap.docs.length === INITIAL_MESSAGES_LIMIT);
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        messages: fetched,
        oldestTimestamp: oldest,
        hasMore: snap.docs.length === INITIAL_MESSAGES_LIMIT,
        timestamp: Date.now(),
      }),
    );
    setInitialMessagesLoaded(true);
    setMessagesLoading(false);
    markTicketMessagesAsRead(uid, ticketId);
    setTimeout(scrollToBottom, 80);
  };

  useEffect(() => {
    if (!userId || !selectedTicket) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }
    setMessagesLoading(true);
    fetchInitialMessages(userId, selectedTicket.ticketId);
    const u = listenToTicketMessages(userId, selectedTicket.ticketId, (newMsgs) => {
      setMessages((prev) => {
        const ids = new Set(newMsgs.map((m) => m.id));
        const map = new Map<string, ChatMessage>();
        prev.forEach((msg) => {
          if (msg.id.startsWith("temp_") || msg.id.startsWith("upload_")) return;
          if (ids.has(msg.id) || prev.length > newMsgs.length) map.set(msg.id, msg);
        });
        newMsgs.forEach((m) => map.set(m.id, m));
        const combined = Array.from(map.values());
        combined.sort((a, b) => (a.timestamp?.seconds ?? 0) - (b.timestamp?.seconds ?? 0));
        return combined;
      });
      markTicketMessagesAsRead(userId, selectedTicket.ticketId);
      setTickets((pt) =>
        pt.map((t) =>
          t.ticketId === selectedTicket.ticketId ? { ...t, unreadCount: 0 } : t,
        ),
      );
      setMessagesLoading(false);
    });
    return () => u();
  }, [userId, selectedTicket?.ticketId]);

  useEffect(() => {
    if (pendingTicketId && tickets.length) {
      const nt = tickets.find((t) => t.ticketId === pendingTicketId);
      if (nt) {
        setSelectedTicket(nt);
        const p = new URLSearchParams(searchParams.toString());
        p.set("id", nt.ticketId);
        if (nt.lawyerId) p.set("lawyerId", nt.lawyerId);
        router.replace(`${pathname}?${p.toString()}`, { scroll: false });
        setPendingTicketId(null);
      }
    }
  }, [tickets, pendingTicketId, router, pathname, searchParams]);

  useEffect(() => {
    if (messages.length && !messagesLoading && !sending) setTimeout(scrollToBottom, 100);
  }, [messages.length, messagesLoading, sending]);

  useEffect(() => {
    if (selectedDocument && docxContainerRef.current && isWordDocument(selectedDocument)) {
      void renderWordDocument(selectedDocument, docxContainerRef.current);
    }
  }, [selectedDocument]);

  const loadMoreMessages = async () => {
    if (!userId || !selectedTicket || !oldestMessageTimestamp || loadingMoreMessages || !hasMoreMessages)
      return;
    setLoadingMoreMessages(true);
    try {
      const messagesRef = collection(
        db,
        "chats",
        userId,
        "tickets",
        selectedTicket.ticketId,
        "messages",
      );
      const q = query(
        messagesRef,
        orderBy("timestamp", "desc"),
        startAfter(oldestMessageTimestamp),
        limit(INITIAL_MESSAGES_LIMIT),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMoreMessages(false);
        return;
      }
      const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TicketMessage[];
      setMessages((prev) => {
        const map = new Map<string, ChatMessage>();
        fetched.forEach((m) => map.set(m.id, m));
        prev.forEach((m) => map.set(m.id, m));
        const arr = Array.from(map.values());
        arr.sort((a, b) => (a.timestamp?.seconds ?? 0) - (b.timestamp?.seconds ?? 0));
        return arr;
      });
      setOldestMessageTimestamp(snap.docs[snap.docs.length - 1].data().timestamp);
      setHasMoreMessages(snap.docs.length === INITIAL_MESSAGES_LIMIT);
    } finally {
      setLoadingMoreMessages(false);
    }
  };

  const buildSubjectFromIntake = (it: IntakeState, fallback: string): string => {
    const cat = it.category ? CATEGORY_LABELS[it.category] : "Legal inquiry";
    if (it.caseReference?.trim()) return `${cat} · Ref ${it.caseReference.trim()}`;
    return cat.length > 60 ? fallback : cat;
  };

  const handleCreateTicketAndSendMessage = async () => {
    const messageText = newMessage.trim();
    if (!messageText) return;
    if (!chatWithLawyer) {
      toast.error("Choose an advocate from Find a lawyer first, then open Chat.");
      return;
    }
    if (!canCreateTicket) {
      toast.error("You already have an open conversation with this advocate.");
      return;
    }
    if (intakeStep !== "done" || !intake.category) {
      toast.error("Please complete the steps above.");
      return;
    }
    setIsTransitioning(true);
    setPendingMessage(messageText);
    setSending(true);
    setNewMessage("");
    try {
      const firstLine = messageText.split("\n")[0].trim();
      const fallback = firstLine.length > 48 ? firstLine.substring(0, 48) : firstLine;
      const subject = buildSubjectFromIntake(intake, fallback) || fallback || "Legal inquiry";
      const intakePayload: TicketIntake = {
        category: intake.category,
        ...(intake.caseReference?.trim()
          ? { caseReference: intake.caseReference.trim() }
          : {}),
      };
      const ticketId = await createTicket(userId, userUid, {
        subject,
        description: messageText,
        caseReference: intake.caseReference?.trim(),
        intake: intakePayload,
        lawyerId: chatWithLawyer.userId,
        lawyerName: chatWithLawyer.fullName,
        lawyerPhotoUrl: chatWithLawyer.profilePhotoUrl ?? null,
      });
      setPendingTicketId(ticketId);
      setShowNewConversation(false);
      resetIntake();
      setTimeout(() => {
        setIsTransitioning(false);
        setPendingMessage("");
      }, 280);
    } catch (e) {
      console.error(e);
      toast.error("Could not start this conversation.");
      setNewMessage(messageText);
      setIsTransitioning(false);
      setPendingMessage("");
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (!newMessage.trim() && pendingImageUrls.length === 0) ||
      sending ||
      Object.keys(loadingImages).length > 0
    )
      return;
    if (!selectedTicket) {
      await handleCreateTicketAndSendMessage();
      return;
    }
    if (editingMessage) {
      await handleEditMessage();
      return;
    }
    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);
    try {
      const messageData: Record<string, unknown> = {
        ticketId: selectedTicket.ticketId,
        senderId: userId,
        senderName: userUid,
        senderType: "user",
        message: messageText,
        timestamp: new Date(),
        isRead: false,
        type: "text",
      };
      const rt = replyingTo;
      if (rt?.id && !rt.id.startsWith("temp_")) {
        messageData.replyTo = {
          id: rt.id,
          message: rt.message || "",
          senderName: rt.senderName || "",
          senderType: rt.senderType || "admin",
          imageUrls: rt.imageUrls || [],
        };
      }
      if (pendingImageUrls.length) {
        const u0 = pendingImageUrls[0];
        const isImage =
          u0.includes("image") || /\.(jpg|jpeg|png|gif|webp)$/i.test(u0) || u0.startsWith("blob:");
        const isVideo = u0.includes("video") || /\.(mp4|mov)$/i.test(u0);
        const isDoc =
          u0.includes("document") || /\.(pdf|doc|docx)$/i.test(u0) || u0.includes("upload");
        if (isImage) {
          messageData.type = pendingImageUrls.length === 1 ? "image" : "images";
        } else if (isVideo) messageData.type = "video";
        else if (isDoc) messageData.type = "document";
        messageData.imageUrls = [...pendingImageUrls];
        if (pendingImageUrls.length === 1) {
          messageData.imageUrl = pendingImageUrls[0];
          if (isDoc) {
            const parts = pendingImageUrls[0].split("/");
            messageData.documentName = parts[parts.length - 1]?.split("?")[0];
          }
        }
      }
      const optimistic: ChatMessage = {
        id: "temp_" + Date.now(),
        messageId: "temp_" + Date.now(),
        ticketId: selectedTicket.ticketId,
        senderId: userId,
        senderName: userUid,
        senderType: "user",
        message: messageText,
        isRead: false,
        type: (messageData.type as TicketMessage["type"]) ?? "text",
        timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as TicketMessage["timestamp"],
        ...(messageData.replyTo ? { replyTo: messageData.replyTo as TicketMessage["replyTo"] } : {}),
        ...(messageData.imageUrls ? { imageUrls: messageData.imageUrls as string[] } : {}),
        ...(messageData.imageUrl ? { imageUrl: messageData.imageUrl as string } : {}),
        ...(messageData.documentName ? { documentName: messageData.documentName as string } : {}),
      };
      setMessages((m) => [...m, optimistic]);
      await addTicketMessage(
        userId,
        selectedTicket.ticketId,
        messageData as Parameters<typeof addTicketMessage>[2],
      );
      setPendingImageUrls([]);
      setLoadingImages({});
      setReplyingTo(null);
    } catch (err) {
      console.error(err);
      setNewMessage(messageText);
      toast.error("Failed to send.");
      setMessages((m) => m.filter((x) => !x.id.startsWith("temp_")));
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async () => {
    const em = editingMessage;
    if (!em || !selectedTicket) return;
    try {
      const updateData: Record<string, unknown> = { edited: true };
      if (newMessage.trim()) updateData.message = newMessage.trim();
      if (pendingImageUrls.length) {
        updateData.type = pendingImageUrls.length === 1 ? "image" : "images";
        updateData.imageUrls = pendingImageUrls;
        updateData.imageUrl = pendingImageUrls[0];
      } else if (em.type === "image" || em.type === "images") {
        updateData.type = "text";
        updateData.imageUrls = null;
        updateData.imageUrl = null;
      }
      const ref = doc(
        db,
        "chats",
        userId,
        "tickets",
        selectedTicket.ticketId,
        "messages",
        em.id,
      );
      await updateDoc(ref, updateData);
      setEditingMessage(null);
      setNewMessage("");
      setPendingImageUrls([]);
      toast.success("Message updated");
    } catch {
      toast.error("Update failed");
    }
  };

  const canEditMessage = (message: TicketMessage) => {
    if (message.senderType !== "user") return false;
    const t =
      message.timestamp?.toDate?.().getTime() ??
      (message.timestamp?.seconds ? message.timestamp.seconds * 1000 : 0);
    return Date.now() - t < 10 * 60 * 1000;
  };

  const isWordDocument = (url: string) => /\.(doc|docx)$/i.test(url);
  const isPdfDocument = (url: string) => /\.pdf$/i.test(url) || url.includes("pdf");

  const renderWordDocument = async (url: string, el: HTMLElement) => {
    el.innerHTML = "";
    const res = await fetch(url);
    const blob = await res.blob();
    await renderAsync(blob, el, undefined, {
      className: "docx-preview",
      inWrapper: true,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !selectedTicket) {
      toast.error("Open a conversation first.");
      return;
    }
    const files = Array.from(e.target.files);
    const fileType = files[0].type.startsWith("image")
      ? "image"
      : files[0].type.startsWith("video")
        ? "video"
        : "document";
    for (const f of files) {
      const max =
        fileType === "video" ? 30 * 1024 * 1024 : 10 * 1024 * 1024;
      if (f.size > max) {
        toast.error(`File too large (max ${max / 1024 / 1024}MB)`);
        return;
      }
    }
    const uploadMsgId = "upload_" + Date.now();
    const blobs = files.map((f) => URL.createObjectURL(f));
    let msgType: "image" | "images" | "video" | "document" =
      fileType === "image" ? (files.length > 1 ? "images" : "image") : fileType === "video" ? "video" : "document";
    setMessages((prev) => [
      ...prev,
      {
        id: uploadMsgId,
        messageId: uploadMsgId,
        ticketId: selectedTicket.ticketId,
        senderId: userId,
        senderName: userUid,
        senderType: "user",
        message: "",
        timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as TicketMessage["timestamp"],
        isRead: false,
        type: msgType,
        imageUrls: blobs,
        imageUrl: blobs[0],
        uploading: true,
      },
    ]);
    setUploadingImage(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        if (file.type.startsWith("video")) {
          urls.push(await uploadVideoToCloudinary(file));
        } else if (file.type.startsWith("image")) {
          urls.push(await uploadImageToCloudinaryDirect(file));
        } else {
          urls.push(await uploadDocumentToCloudinaryDirect(file));
        }
      }
      if (cancelledUploadsRef.current.has(uploadMsgId)) {
        cancelledUploadsRef.current.delete(uploadMsgId);
        setMessages((p) => p.filter((x) => x.id !== uploadMsgId));
        return;
      }
      const messageData: Record<string, unknown> = {
        ticketId: selectedTicket.ticketId,
        senderId: userId,
        senderName: userUid,
        senderType: "user",
        message: "",
        timestamp: new Date(),
        isRead: false,
        type: msgType,
        imageUrls: urls,
      };
      if (urls.length === 1) {
        messageData.imageUrl = urls[0];
        if (msgType === "document") {
          const p = urls[0].split("/");
          messageData.documentName = p[p.length - 1]?.split("?")[0];
        }
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === uploadMsgId ? { ...m, imageUrls: urls, imageUrl: urls[0], uploading: false } : m,
        ),
      );
      await addTicketMessage(
        userId,
        selectedTicket.ticketId,
        messageData as Parameters<typeof addTicketMessage>[2],
      );
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || "Upload failed. Configure Cloudinary env vars.");
      setMessages((p) => p.filter((x) => x.id !== uploadMsgId));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startNewConversation = () => {
    if (isUserBlocked) {
      toast.error("Your account cannot start new conversations.");
      return;
    }
    if (!chatWithLawyer) {
      toast.error("Open Find a lawyer, choose an advocate, then tap Chat—or pick a thread below.");
      return;
    }
    if (!canCreateTicket) {
      toast.error("You already have an open conversation with this advocate.");
      return;
    }
    setSelectedTicket(null);
    setShowNewConversation(true);
    resetIntake();
  };

  const handleTicketSelect = (t: Ticket) => {
    setSelectedTicket(t);
    setShowNewConversation(false);
    const ctx = ticketToLawyerContext(t);
    if (ctx) setChatWithLawyer(ctx);
    if (isCompact) setShowChatView(true);
    const p = new URLSearchParams(searchParams.toString());
    p.set("id", t.ticketId);
    if (t.lawyerId) p.set("lawyerId", t.lawyerId);
    else p.delete("lawyerId");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    setSidebarOpen(false);
  };

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

  const groupMessagesByDate = (msgs: ChatMessage[]) => {
    const g: Record<string, ChatMessage[]> = {};
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
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dn = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    if (dn(d).getTime() === dn(today).getTime()) return formatTime(ts);
    if (dn(d).getTime() === dn(yesterday).getTime()) return "Yesterday";
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" });
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

  return (
    <div
      className={`${isCompact ? "h-full" : "h-[var(--ticket-h,100dvh)]"} flex w-full overflow-hidden bg-gradient-to-br from-[#1a0f0e] via-[#140c0a] to-[#1a0f0e]`}
    >
      <UserTicketSidebar
        tickets={tickets}
        selectedTicket={selectedTicket}
        ticketsLoaded={ticketsLoaded}
        isCompact={isCompact}
        showChatView={showChatView}
        sidebarOpen={sidebarOpen}
        onTicketSelect={handleTicketSelect}
        onCreateTicket={() => {
          startNewConversation();
          if (isCompact) setShowChatView(true);
          setSidebarOpen(false);
        }}
        onClose={onClose}
        onSidebarClose={() => setSidebarOpen(false)}
        onNavigateBack={() => router.push("/dashboard")}
        formatTicketDate={formatTicketDate}
        getStatusColor={getStatusColor}
        canCreateTicket={canCreateTicket}
      />

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
                    className="shrink-0 rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white"
                    onClick={() => setShowChatView(false)}
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white md:hidden"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                )}
                <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-white md:text-lg">
                  {selectedTicket.subject}
                </h1>
                <span
                  className={`shrink-0 rounded-md border border-[#d4af37]/30 px-2 py-0.5 text-[10px] capitalize md:text-xs ${getStatusColor(selectedTicket.status)}`}
                >
                  {selectedTicket.status}
                </span>
                {!isCompact && (
                  <button
                    type="button"
                    className="rounded-lg p-2 text-white/60 hover:text-[#d4af37] md:hidden"
                    onClick={() => router.push("/dashboard")}
                  >
                    <Home className="h-5 w-5" />
                  </button>
                )}
              </div>
              {selectedTicket.status === "open" &&
                queueStats.openCount > 0 &&
                !(messages as { senderType?: string }[]).some((m) => m.senderType === "admin") && (
                  <div className="px-3 pb-2 md:px-6">
                    <div className="inline-flex items-center gap-2 rounded-md border border-[#d4af37]/40 bg-[#d4af37]/10 px-2 py-1 text-[11px] text-[#d4af37]">
                      Approx{" "}
                      {queueStats.estimatedWaitMinutes >= 60
                        ? `${Math.floor(queueStats.estimatedWaitMinutes / 60)}h ${queueStats.estimatedWaitMinutes % 60}m`
                        : `${queueStats.estimatedWaitMinutes} min`}{" "}
                      estimated wait for a response
                    </div>
                  </div>
                )}
            </div>

            <div className="scrollbar-themed min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6">
              {hasMoreMessages && (
                <div className="flex justify-center pb-3">
                  <button
                    type="button"
                    disabled={loadingMoreMessages}
                    onClick={loadMoreMessages}
                    className="rounded-lg border border-[#d4af37]/50 px-4 py-2 text-sm text-[#d4af37] hover:bg-[#d4af37]/10"
                  >
                    {loadingMoreMessages ? "Loading…" : "Load older messages"}
                  </button>
                </div>
              )}
              {messagesLoading && !initialMessagesLoaded ? (
                <p className="text-center text-white/40">Loading messages…</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupMessagesByDate(messages)).map(
                    ([label, list]) => (
                      <div key={label} className="space-y-3">
                        <div className="flex justify-center">
                          <span className="rounded-full border border-[#d4af37]/25 bg-[#2a1815]/80 px-4 py-1 text-xs text-white/60">
                            {label}
                          </span>
                        </div>
                        {list.map((message) => (
                          <div
                            key={message.id}
                            className={`flex items-start ${message.senderType === "user" ? "justify-end" : "justify-start"} gap-2`}
                          >
                            {message.senderType === "user" && (
                              <div className="mt-1 flex gap-1">
                                <button
                                  type="button"
                                  className="rounded-lg border border-[#d4af37]/30 bg-[#2a1815]/80 p-1.5 text-[#d4af37]"
                                  onClick={() => setReplyingTo(message)}
                                >
                                  <Reply className="h-3.5 w-3.5" />
                                </button>
                                {canEditMessage(message) && (
                                  <button
                                    type="button"
                                    className="rounded-lg border border-[#d4af37]/30 bg-[#2a1815]/80 p-1.5 text-[#d4af37]"
                                    onClick={() => {
                                      setEditingMessage(message);
                                      setNewMessage(message.message || "");
                                    }}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
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
                                  className="mb-2 max-h-48 cursor-pointer rounded object-contain"
                                  onClick={() => setSelectedImage(String(message.imageUrl))}
                                />
                              )}
                              {message.type === "video" && message.imageUrl && (
                                <video
                                  src={String(message.imageUrl)}
                                  className="mb-2 max-h-48 rounded"
                                  controls
                                  controlsList="nodownload"
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

            {selectedTicket.status !== "closed" && !isUserBlocked ? (
              <div className="shrink-0 border-t border-[#d4af37]/20 bg-[#1a0f0e]/95 p-3 backdrop-blur md:p-4">
                {replyingTo && (
                  <div className="mb-2 flex items-start justify-between rounded-lg border border-[#d4af37]/30 bg-[#2a1815] p-2 text-xs text-white/70">
                    <span>Replying to legal team</span>
                    <button type="button" onClick={() => setReplyingTo(null)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/mp4,video/quicktime,.pdf,.doc,.docx"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                />
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <button
                    type="button"
                    className="shrink-0 rounded-xl p-2 text-[#d4af37] disabled:opacity-40"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={1}
                    placeholder="Message your legal team…"
                    className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-[#d4af37]/30 bg-[#140c0a]/80 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#d4af37]/60 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!newMessage.trim() && pendingImageUrls.length === 0)}
                    className="shrink-0 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#3e2723] p-3 text-white disabled:opacity-40"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="shrink-0 border-t border-white/10 p-4 text-center text-sm text-white/50">
                This thread is closed. You cannot send new messages here.
              </div>
            )}
          </>
        ) : tickets.length === 0 || showNewConversation ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-[#d4af37]/20 px-4 py-3 md:hidden">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSidebarOpen(true)} className="text-white/60">
                  <Menu className="h-5 w-5" />
                </button>
                <h2 className="font-semibold text-white">New message</h2>
              </div>
            </div>
            <div className="scrollbar-themed min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {chatWithLawyer ? (
                <div className="rounded-2xl border border-[#d4af37]/35 bg-[#2a1815]/70 px-4 py-3 text-sm text-white/90">
                  New thread with{" "}
                  <span className="font-semibold text-[#d4af37]">{chatWithLawyer.fullName}</span>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-[#2a1815]/40 px-4 py-3 text-sm text-white/70">
                  Choose an advocate under{" "}
                  <span className="font-medium text-[#d4af37]">Find a lawyer</span>, then tap{" "}
                  <span className="font-medium text-white">Chat</span> to message them here.
                </div>
              )}
              <div className="rounded-2xl border border-[#d4af37]/25 bg-[#2a1815]/60 p-3 text-sm text-white/85">
                What can we help you with?
              </div>
              <div className="flex flex-wrap gap-2">
                {LAWWAY_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setIntake({ category: c });
                      setCaseRefInput("");
                      if (needsCaseRefPrompt(c)) setIntakeStep("case_ref");
                      else setIntakeStep("done");
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                      intake.category === c
                        ? "border-[#d4af37] bg-[#d4af37]/20 text-white"
                        : "border-[#d4af37]/30 text-white/80 hover:border-[#d4af37]/60"
                    }`}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>

              {intake.category && needsCaseRefPrompt(intake.category) && intakeStep === "case_ref" && (
                <div className="space-y-2">
                  <p className="text-xs text-white/50">
                    Optional: matter or case reference (court file no., internal ID)
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={caseRefInput}
                      onChange={(e) => setCaseRefInput(e.target.value)}
                      className="flex-1 rounded-xl border border-[#d4af37]/30 bg-[#140c0a] px-3 py-2 text-sm text-white"
                      placeholder="e.g. LW-2024-8921"
                    />
                    <button
                      type="button"
                      className="rounded-xl bg-[#d4af37] px-4 py-2 text-sm font-medium text-[#3e2723]"
                      onClick={() => {
                        setIntake((prev) => ({
                          ...prev,
                          caseReference: caseRefInput.trim() || undefined,
                        }));
                        setIntakeStep("done");
                      }}
                    >
                      Continue
                    </button>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-[#d4af37]/80 underline"
                    onClick={() => setIntakeStep("done")}
                  >
                    Skip
                  </button>
                </div>
              )}

              {intakeStep === "done" && intake.category && (
                <p className="text-sm text-[#d4af37]/90">
                  Describe your question or situation in detail below. Do not include passwords or full card numbers.
                </p>
              )}
            </div>
            {canCreateTicket ? (
              <form
                onSubmit={handleSendMessage}
                className="shrink-0 border-t border-[#d4af37]/20 bg-[#1a0f0e] p-3"
              >
                <div className="flex gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={intakeStep !== "done"}
                    placeholder={
                      intakeStep !== "done"
                        ? "Complete the steps above first…"
                        : "Type your message…"
                    }
                    className="max-h-36 min-h-[48px] flex-1 resize-none rounded-xl border border-[#d4af37]/30 bg-[#140c0a] px-3 py-2 text-sm text-white disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim() || intakeStep !== "done"}
                    className="self-end rounded-xl bg-gradient-to-br from-[#d4af37] to-[#3e2723] p-3 text-white disabled:opacity-40"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            ) : (
              <p className="shrink-0 p-4 text-center text-sm text-white/50">
                {chatWithLawyer
                  ? `You already have an open conversation with ${chatWithLawyer.fullName}. Open it from the list, or wait until it is closed.`
                  : "Choose an advocate from Find a lawyer to start a new thread, or open an existing conversation from the list."}
              </p>
            )}
          </div>
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
              {isWordDocument(selectedDocument) ? (
                <div
                  ref={docxContainerRef}
                  className="min-h-[50vh] bg-white p-4 text-black"
                />
              ) : isPdfDocument(selectedDocument) ? (
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
