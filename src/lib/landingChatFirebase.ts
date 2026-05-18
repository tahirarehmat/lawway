import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type LandingSenderType = "user" | "ai";

export interface LandingChatMessage {
  id: string;
  message: string;
  senderType: LandingSenderType;
  timestamp: Timestamp | null;
}

const sessions = () => collection(db, "landing_chats");

export async function ensureLandingSession(sessionId: string): Promise<void> {
  const ref = doc(sessions(), sessionId);
  await setDoc(
    ref,
    {
      id: sessionId,
      source: "landing",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function addLandingMessage(
  sessionId: string,
  message: string,
  senderType: LandingSenderType,
): Promise<string> {
  await ensureLandingSession(sessionId);
  const messagesRef = collection(db, "landing_chats", sessionId, "messages");
  const ref = await addDoc(messagesRef, {
    message: message.trim(),
    senderType,
    timestamp: serverTimestamp(),
    isRead: senderType === "user",
  });
  await setDoc(
    doc(sessions(), sessionId),
    {
      lastMessage: message.trim().slice(0, 200),
      lastSender: senderType,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return ref.id;
}

export function listenToLandingMessages(
  sessionId: string,
  callback: (messages: LandingChatMessage[]) => void,
): () => void {
  const messagesRef = collection(db, "landing_chats", sessionId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        message: String(data.message ?? ""),
        senderType: (data.senderType as LandingSenderType) ?? "user",
        timestamp: (data.timestamp as Timestamp) ?? null,
      };
    });
    callback(messages);
  });
}
