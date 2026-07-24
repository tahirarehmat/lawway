import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  limit,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Legal matter categories for Lawway client ↔ firm messaging */
export type IntakeCategory =
  | "general_inquiry"
  | "case_update"
  | "billing_fees"
  | "documents_evidence"
  | "hearing_scheduling"
  | "urgent_matter"
  | "other";

export interface TicketIntake {
  category: IntakeCategory;
  /** e.g. internal matter ID or court reference */
  caseReference?: string;
}

export interface Ticket {
  id: string;
  ticketId: string;
  userId: string;
  userUid: string;
  /** Advocate this thread is with (client ↔ lawyer routing) */
  lawyerId?: string;
  lawyerName?: string;
  lawyerPhotoUrl?: string | null;
  subject: string;
  description: string;
  category?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  caseReference?: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  assignedTo?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  recentActivity: Timestamp;
  lastMessage?: string;
  unreadCount: number;
  adminUnreadCount?: number;
  intake?: TicketIntake;
}

/** Ticket row plus client account id (from path /chats/{clientUserId}/tickets/...) for lawyer inbox */
export type LawyerInboxTicket = Ticket & { clientUserId: string };

export interface TicketMessage {
  id: string;
  messageId: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderType: "user" | "admin";
  message: string;
  timestamp: Timestamp;
  isRead: boolean;
  attachments?: string[];
  type?: "text" | "image" | "images" | "video" | "document";
  imageUrl?: string;
  imageUrls?: string[];
  edited?: boolean;
  documentName?: string;
  replyTo?: {
    id: string;
    message: string;
    senderName: string;
    senderType: string;
    imageUrls?: string[];
  };
}

export interface CreateTicketData {
  subject: string;
  description: string;
  /** Required for client-created threads */
  lawyerId: string;
  lawyerName: string;
  lawyerPhotoUrl?: string | null;
  caseReference?: string;
  intake?: TicketIntake;
}

/** Optional: wire to your backend worker later */
const notifyAutoResponder = (_userId: string, _ticketId: string) => {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/tickets/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: _userId, ticketId: _ticketId }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
};

export const createTicket = async (
  userId: string,
  userUid: string,
  ticketData: CreateTicketData,
): Promise<string> => {
  try {
    const chatRef = doc(db, "chats", userId);
    const chatDoc = await getDoc(chatRef);

    if (!chatDoc.exists()) {
      await setDoc(chatRef, {
        id: userId,
        userUid: userUid,
        lastMessage: "",
        recentActivity: serverTimestamp(),
        unreadCount: 0,
      });
    }

    const ticketsRef = collection(db, "chats", userId, "tickets");
    const ticketRef = doc(ticketsRef);
    const ticketId = ticketRef.id;

    const currentTimestamp = serverTimestamp() as Timestamp;

    const ticket: Record<string, unknown> = {
      ticketId,
      userId,
      userUid,
      lawyerId: ticketData.lawyerId,
      lawyerName: ticketData.lawyerName,
      subject: ticketData.subject,
      description: ticketData.description,
      status: "open",
      assignedTo: ticketData.lawyerId,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
      recentActivity: currentTimestamp,
      lastMessage: ticketData.description,
      unreadCount: 0,
      adminUnreadCount: 1,
    };

    if (ticketData.lawyerPhotoUrl != null) {
      ticket.lawyerPhotoUrl = ticketData.lawyerPhotoUrl;
    }

    if (ticketData.caseReference) {
      ticket.caseReference = ticketData.caseReference;
    }

    if (ticketData.intake) {
      ticket.intake = ticketData.intake;
    }

    await setDoc(ticketRef, ticket);

    await addTicketMessage(userId, ticketId, {
      ticketId,
      senderId: userId,
      senderName: userUid,
      senderType: "user",
      message: ticketData.description,
      timestamp: serverTimestamp() as Timestamp,
      isRead: false,
      type: "text",
    });

    notifyAutoResponder(userId, ticketId);

    return ticketId;
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw error;
  }
};

/** Opens or creates a client ↔ lawyer thread tied to an accepted case. */
export async function ensureCaseChatTicket(params: {
  clientId: string;
  clientUid: string;
  lawyerId: string;
  lawyerName: string;
  caseId: string;
  caseTitle: string;
}): Promise<string> {
  const ticketsRef = collection(db, "chats", params.clientId, "tickets");
  const snap = await getDocs(
    query(ticketsRef, where("lawyerId", "==", params.lawyerId)),
  );

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Ticket;
    if (data.status !== "closed" && data.status !== "resolved") {
      return data.ticketId;
    }
  }

  return createTicket(params.clientId, params.clientUid, {
    subject: `Case: ${params.caseTitle}`,
    description: `Secure messaging for case “${params.caseTitle}”.`,
    lawyerId: params.lawyerId,
    lawyerName: params.lawyerName,
    caseReference: params.caseId,
  });
};

export const getUserTickets = async (userId: string): Promise<Ticket[]> => {
  try {
    const ticketsRef = collection(db, "chats", userId, "tickets");
    const q = query(ticketsRef, orderBy("recentActivity", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as Ticket,
    );
  } catch (error) {
    console.error("Error getting user tickets:", error);
    throw error;
  }
};

export const getTicket = async (
  userId: string,
  ticketId: string,
): Promise<Ticket | null> => {
  try {
    const ticketRef = doc(db, "chats", userId, "tickets", ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (ticketDoc.exists()) {
      return {
        id: ticketDoc.id,
        ...ticketDoc.data(),
      } as Ticket;
    }
    return null;
  } catch (error) {
    console.error("Error getting ticket:", error);
    throw error;
  }
};

export const updateTicketStatus = async (
  userId: string,
  ticketId: string,
  status: Ticket["status"],
): Promise<void> => {
  try {
    const ticketRef = doc(db, "chats", userId, "tickets", ticketId);
    await updateDoc(ticketRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    throw error;
  }
};

export const addTicketMessage = async (
  userId: string,
  ticketId: string,
  messageData: Omit<TicketMessage, "id" | "messageId" | "timestamp"> & {
    timestamp?: TicketMessage["timestamp"];
  },
): Promise<string> => {
  try {
    const currentTimestamp = serverTimestamp();

    const chatRef = doc(db, "chats", userId);
    const chatDoc = await getDoc(chatRef);

    if (!chatDoc.exists()) {
      await setDoc(chatRef, {
        id: userId,
        userUid: messageData.senderName,
        lastMessage: "",
        recentActivity: currentTimestamp,
        unreadCount: 0,
      });
    }

    const messagesRef = collection(
      db,
      "chats",
      userId,
      "tickets",
      ticketId,
      "messages",
    );
    const messageRef = await addDoc(messagesRef, {
      ...messageData,
      timestamp: currentTimestamp,
    });

    const ticketRef = doc(db, "chats", userId, "tickets", ticketId);

    const updateData: Record<string, unknown> = {
      lastMessage:
        (messageData.message && String(messageData.message).trim()) ||
        (messageData.type && messageData.type !== "text" ? "Attachment" : "—"),
      recentActivity: currentTimestamp,
      updatedAt: serverTimestamp(),
    };

    if (messageData.senderType === "admin") {
      updateData.unreadCount = increment(1);
      updateData.adminUnreadCount = 0;
    } else {
      updateData.unreadCount = 0;
      updateData.adminUnreadCount = increment(1);
    }

    await updateDoc(ticketRef, updateData);

    if (messageData.senderType === "user") {
      notifyAutoResponder(userId, ticketId);
    }

    return messageRef.id;
  } catch (error) {
    console.error("Error adding ticket message:", error);
    throw error;
  }
};

export const getTicketMessages = async (
  userId: string,
  ticketId: string,
): Promise<TicketMessage[]> => {
  try {
    const messagesRef = collection(
      db,
      "chats",
      userId,
      "tickets",
      ticketId,
      "messages",
    );
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (d) =>
        ({
          id: d.id,
          messageId: d.id,
          ...d.data(),
        }) as TicketMessage,
    );
  } catch (error) {
    console.error("Error getting ticket messages:", error);
    throw error;
  }
};

const MESSAGE_BATCH_LIMIT = 20;

export const listenToTicketMessages = (
  userId: string,
  ticketId: string,
  callback: (messages: TicketMessage[]) => void,
) => {
  try {
    const messagesRef = collection(
      db,
      "chats",
      userId,
      "tickets",
      ticketId,
      "messages",
    );
    const q = query(
      messagesRef,
      orderBy("timestamp", "desc"),
      limit(MESSAGE_BATCH_LIMIT),
    );

    return onSnapshot(q, (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      const messages = snapshot.docs
        .map(
          (d) =>
            ({ id: d.id, messageId: d.id, ...d.data() }) as TicketMessage,
        )
        .reverse();
      callback(messages);
    });
  } catch (error) {
    console.error("Error setting up ticket messages listener:", error);
    return () => {};
  }
};

export const listenToUserTickets = (
  userId: string,
  callback: (tickets: Ticket[]) => void,
) => {
  try {
    const ticketsRef = collection(db, "chats", userId, "tickets");
    const q = query(ticketsRef, orderBy("recentActivity", "desc"));

    return onSnapshot(q, (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      const tickets = snapshot.docs.map(
        (d) =>
          ({
            id: d.id,
            ...d.data(),
          }) as Ticket,
      );
      callback(tickets);
    });
  } catch (error) {
    console.error("Error setting up user tickets listener:", error);
    return () => {};
  }
};

export const markTicketMessagesAsRead = async (
  userId: string,
  ticketId: string,
): Promise<void> => {
  try {
    const messagesRef = collection(
      db,
      "chats",
      userId,
      "tickets",
      ticketId,
      "messages",
    );
    const q = query(
      messagesRef,
      where("isRead", "==", false),
      where("senderType", "==", "admin"),
    );
    const snapshot = await getDocs(q);

    if (snapshot.docs.length > 0) {
      const batch = writeBatch(db);

      snapshot.docs.forEach((docSnapshot) => {
        const messageRef = doc(
          db,
          "chats",
          userId,
          "tickets",
          ticketId,
          "messages",
          docSnapshot.id,
        );
        batch.update(messageRef, { isRead: true });
      });

      await batch.commit();

      const ticketRef = doc(db, "chats", userId, "tickets", ticketId);
      await updateDoc(ticketRef, {
        unreadCount: 0,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error marking ticket messages as read:", error);
    throw error;
  }
};

export const deleteTicket = async (
  userId: string,
  ticketId: string,
): Promise<void> => {
  try {
    const ticketRef = doc(db, "chats", userId, "tickets", ticketId);
    await deleteDoc(ticketRef);
  } catch (error) {
    console.error("Error deleting ticket:", error);
    throw error;
  }
};

export const deleteTicketMessage = async (
  userId: string,
  ticketId: string,
  messageId: string,
): Promise<void> => {
  try {
    const messageRef = doc(
      db,
      "chats",
      userId,
      "tickets",
      ticketId,
      "messages",
      messageId,
    );
    await deleteDoc(messageRef);
  } catch (error) {
    console.error("Error deleting ticket message:", error);
    throw error;
  }
};

export const getUserTicketStats = async (userId: string) => {
  try {
    const tickets = await getUserTickets(userId);

    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      inProgress: tickets.filter((t) => t.status === "in-progress").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
      closed: tickets.filter((t) => t.status === "closed").length,
      unread: tickets.reduce((sum, t) => sum + t.unreadCount, 0),
    };
  } catch (error) {
    console.error("Error getting user ticket stats:", error);
    throw error;
  }
};

export interface QueueStats {
  openCount: number;
  inProgressCount: number;
  estimatedWaitMinutes: number;
}

const MINUTES_PER_TICKET = 10;

export const getGlobalQueueStats = async (): Promise<QueueStats> => {
  try {
    const ticketsGroupRef = collectionGroup(db, "tickets");
    const activeQuery = query(
      ticketsGroupRef,
      where("status", "in", ["open", "in-progress"]),
    );
    const activeSnapshot = await getDocs(activeQuery);

    let unreadTicketsCount = 0;
    let inProgressCount = 0;

    activeSnapshot.docs.forEach((d) => {
      const data = d.data();
      if (data.adminUnreadCount && data.adminUnreadCount > 0) {
        unreadTicketsCount++;
      }
      if (data.status === "in-progress") {
        inProgressCount++;
      }
    });

    const estimatedWaitMinutes = unreadTicketsCount * MINUTES_PER_TICKET;

    return {
      openCount: unreadTicketsCount,
      inProgressCount,
      estimatedWaitMinutes,
    };
  } catch (error) {
    console.error("Error getting global queue stats:", error);
    return {
      openCount: 0,
      inProgressCount: 0,
      estimatedWaitMinutes: 0,
    };
  }
};

export const listenToGlobalQueueStats = (
  callback: (stats: QueueStats) => void,
) => {
  try {
    const ticketsGroupRef = collectionGroup(db, "tickets");
    const q = query(ticketsGroupRef);

    return onSnapshot(q, (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      let unreadTicketsCount = 0;
      let inProgressCount = 0;

      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.status === "open" || data.status === "in-progress") {
          if (data.adminUnreadCount && data.adminUnreadCount > 0) {
            unreadTicketsCount++;
          }
          if (data.status === "in-progress") {
            inProgressCount++;
          }
        }
      });

      const estimatedWaitMinutes = unreadTicketsCount * MINUTES_PER_TICKET;

      callback({
        openCount: unreadTicketsCount,
        inProgressCount,
        estimatedWaitMinutes,
      });
    });
  } catch (error) {
    console.error("Error setting up global queue listener:", error);
    return () => {};
  }
};

export const getTicketQueuePosition = async (
  ticketCreatedAt: Timestamp,
): Promise<number> => {
  try {
    const ticketsGroupRef = collectionGroup(db, "tickets");
    const q = query(ticketsGroupRef, where("createdAt", "<", ticketCreatedAt));
    const snapshot = await getDocs(q);

    let position = 0;
    snapshot.docs.forEach((d) => {
      const data = d.data();
      if (data.status === "open") {
        position++;
      }
    });

    return position + 1;
  } catch (error) {
    console.error("Error getting ticket queue position:", error);
    return 1;
  }
};

export const isUserBlocked = async (userId: string): Promise<boolean> => {
  try {
    const chatRef = doc(db, "chats", userId);
    const chatDoc = await getDoc(chatRef);

    if (chatDoc.exists()) {
      const chatData = chatDoc.data();
      return chatData.isBlocked === true;
    }

    return false;
  } catch (error) {
    console.error("Error checking if user is blocked:", error);
    return false;
  }
};

export const listenToUserBlockStatus = (
  userId: string,
  callback: (isBlocked: boolean) => void,
) => {
  try {
    const chatRef = doc(db, "chats", userId);

    return onSnapshot(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const chatData = snapshot.data();
        callback(chatData.isBlocked === true);
      } else {
        callback(false);
      }
    });
  } catch (error) {
    console.error("Error setting up block status listener:", error);
    return () => {};
  }
};

/**
 * Inbox for an advocate: all ticket docs across clients where `lawyerId` matches.
 * Requires a Firestore composite index: collection group `tickets` — lawyerId + recentActivity.
 */
export const listenToTicketsForLawyer = (
  lawyerId: string,
  callback: (tickets: LawyerInboxTicket[]) => void,
): (() => void) => {
  try {
    const ticketsGroup = collectionGroup(db, "tickets");
    const q = query(
      ticketsGroup,
      where("lawyerId", "==", lawyerId),
      orderBy("recentActivity", "desc"),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) {
          return;
        }

        const tickets: LawyerInboxTicket[] = snapshot.docs.map((d) => {
          const clientChatDoc = d.ref.parent.parent;
          const clientUserId = clientChatDoc?.id ?? "";
          return {
            id: d.id,
            clientUserId,
            ...d.data(),
          } as LawyerInboxTicket;
        });
        callback(tickets);
      },
      (err) => console.error("listenToTicketsForLawyer:", err),
    );
  } catch (error) {
    console.error("Error setting up lawyer tickets listener:", error);
    return () => {};
  }
};

/** Call when the lawyer opens a thread so `adminUnreadCount` (client→lawyer) clears */
export const markLawyerInboxSeen = async (
  clientUserId: string,
  ticketDocumentId: string,
): Promise<void> => {
  try {
    const ticketRef = doc(
      db,
      "chats",
      clientUserId,
      "tickets",
      ticketDocumentId,
    );
    await updateDoc(ticketRef, {
      adminUnreadCount: 0,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error marking lawyer inbox seen:", error);
    throw error;
  }
};

export const closeAllUserTickets = async (userId: string): Promise<number> => {
  try {
    const ticketsRef = collection(db, "chats", userId, "tickets");
    const snapshot = await getDocs(ticketsRef);

    let closedCount = 0;
    const batch = writeBatch(db);

    snapshot.docs.forEach((docSnapshot) => {
      const ticketData = docSnapshot.data();
      if (ticketData.status !== "closed") {
        batch.update(docSnapshot.ref, {
          status: "closed",
          updatedAt: serverTimestamp(),
        });
        closedCount++;
      }
    });

    if (closedCount > 0) {
      await batch.commit();
    }

    return closedCount;
  } catch (error) {
    console.error("Error closing all user tickets:", error);
    throw error;
  }
};
