import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type VideoCallStatus = "ringing" | "connected" | "ended";

export type VideoCallTranscriptLine = {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  at: number;
};

export type VideoCallInterim = {
  speakerId: string;
  speakerName: string;
  text: string;
  at: number;
};

export type VideoCallDoc = {
  callId: string;
  caseId: string;
  caseTitle: string;
  clientId: string;
  lawyerId: string;
  clientName: string;
  lawyerName: string;
  status: VideoCallStatus;
  mode: "video" | "voice";
  starterId: string;
  starterRole: "client" | "lawyer";
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  transcript: VideoCallTranscriptLine[];
  /** Live partial speech keyed by speaker user id */
  interim: Record<string, VideoCallInterim>;
  startedAtMs: number | null;
  endedAtMs: number | null;
  endedById: string | null;
  endedByName: string | null;
};

type CallFirestore = {
  caseId: string;
  caseTitle: string;
  clientId: string;
  lawyerId: string;
  clientName: string;
  lawyerName: string;
  status: VideoCallStatus;
  mode: "video" | "voice";
  starterId: string;
  starterRole: "client" | "lawyer";
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  transcript: VideoCallTranscriptLine[];
  interim?: Record<string, VideoCallInterim>;
  startedAtMs: number | null;
  endedAtMs: number | null;
  endedById: string | null;
  endedByName: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function mapCall(id: string, data: CallFirestore): VideoCallDoc {
  return {
    callId: id,
    caseId: data.caseId,
    caseTitle: data.caseTitle,
    clientId: data.clientId,
    lawyerId: data.lawyerId,
    clientName: data.clientName,
    lawyerName: data.lawyerName,
    status: data.status,
    mode: data.mode ?? "video",
    starterId: data.starterId,
    starterRole: data.starterRole,
    offer: data.offer ?? null,
    answer: data.answer ?? null,
    transcript: Array.isArray(data.transcript) ? data.transcript : [],
    interim:
      data.interim && typeof data.interim === "object" ? data.interim : {},
    startedAtMs: data.startedAtMs ?? null,
    endedAtMs: data.endedAtMs ?? null,
    endedById: data.endedById ?? null,
    endedByName: data.endedByName ?? null,
  };
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

export async function findActiveCallForCase(
  caseId: string,
): Promise<VideoCallDoc | null> {
  const q = query(collection(db, "videoCalls"), where("caseId", "==", caseId));
  const snap = await getDocs(q);
  const active = snap.docs
    .map((d) => mapCall(d.id, d.data() as CallFirestore))
    .find((c) => c.status === "ringing" || c.status === "connected");
  return active ?? null;
}

export async function startVideoCall(input: {
  caseId: string;
  caseTitle: string;
  clientId: string;
  lawyerId: string;
  clientName: string;
  lawyerName: string;
  starterId: string;
  starterRole: "client" | "lawyer";
  mode?: "video" | "voice";
  offer: RTCSessionDescriptionInit;
}): Promise<VideoCallDoc> {
  const existing = await findActiveCallForCase(input.caseId);
  if (existing) return existing;

  const ref = await addDoc(collection(db, "videoCalls"), {
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    clientId: input.clientId,
    lawyerId: input.lawyerId,
    clientName: input.clientName,
    lawyerName: input.lawyerName,
    status: "ringing" satisfies VideoCallStatus,
    mode: input.mode ?? "video",
    starterId: input.starterId,
    starterRole: input.starterRole,
    offer: input.offer,
    answer: null,
    transcript: [],
    interim: {},
    startedAtMs: null,
    endedAtMs: null,
    endedById: null,
    endedByName: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } satisfies CallFirestore);

  return {
    callId: ref.id,
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    clientId: input.clientId,
    lawyerId: input.lawyerId,
    clientName: input.clientName,
    lawyerName: input.lawyerName,
    status: "ringing",
    mode: input.mode ?? "video",
    starterId: input.starterId,
    starterRole: input.starterRole,
    offer: input.offer,
    answer: null,
    transcript: [],
    interim: {},
    startedAtMs: null,
    endedAtMs: null,
    endedById: null,
    endedByName: null,
  };
}

export async function setCallAnswer(
  callId: string,
  answer: RTCSessionDescriptionInit,
): Promise<void> {
  await updateDoc(doc(db, "videoCalls", callId), {
    answer,
    status: "connected" satisfies VideoCallStatus,
    startedAtMs: Date.now(),
    updatedAt: serverTimestamp(),
  });
}

/** Starter remounted — publish a fresh offer that matches the current PeerConnection. */
export async function refreshCallOffer(
  callId: string,
  offer: RTCSessionDescriptionInit,
): Promise<void> {
  await updateDoc(doc(db, "videoCalls", callId), {
    offer,
    answer: null,
    status: "ringing" satisfies VideoCallStatus,
    startedAtMs: null,
    updatedAt: serverTimestamp(),
  });
}

export async function markCallConnected(callId: string): Promise<void> {
  await updateDoc(doc(db, "videoCalls", callId), {
    status: "connected" satisfies VideoCallStatus,
    startedAtMs: Date.now(),
    updatedAt: serverTimestamp(),
  });
}

export async function addIceCandidate(
  callId: string,
  fromUserId: string,
  candidate: RTCIceCandidateInit,
): Promise<void> {
  await addDoc(collection(db, "videoCalls", callId, "ice"), {
    fromUserId,
    candidate,
    createdAt: serverTimestamp(),
  });
}

export function listenToCall(
  callId: string,
  onChange: (call: VideoCallDoc | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, "videoCalls", callId), (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    onChange(mapCall(snap.id, snap.data() as CallFirestore));
  });
}

export function listenToIceCandidates(
  callId: string,
  localUserId: string,
  onCandidate: (candidate: RTCIceCandidateInit) => void,
): Unsubscribe {
  return onSnapshot(collection(db, "videoCalls", callId, "ice"), (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type !== "added") return;
      const data = change.doc.data() as {
        fromUserId?: string;
        candidate?: RTCIceCandidateInit;
      };
      if (!data.candidate || data.fromUserId === localUserId) return;
      onCandidate(data.candidate);
    });
  });
}

export function listenForIncomingCalls(input: {
  userId: string;
  role: "client" | "lawyer";
  onCall: (call: VideoCallDoc | null) => void;
}): Unsubscribe {
  const field = input.role === "client" ? "clientId" : "lawyerId";
  const q = query(
    collection(db, "videoCalls"),
    where(field, "==", input.userId),
  );

  return onSnapshot(q, (snap) => {
    const calls = snap.docs
      .map((d) => mapCall(d.id, d.data() as CallFirestore))
      .filter(
        (c) =>
          c.status === "ringing" &&
          c.starterId !== input.userId,
      )
      .sort((a, b) => (b.startedAtMs ?? 0) - (a.startedAtMs ?? 0));
    input.onCall(calls[0] ?? null);
  });
}

export async function appendTranscriptLine(
  callId: string,
  line: Omit<VideoCallTranscriptLine, "id">,
): Promise<VideoCallTranscriptLine> {
  const next: VideoCallTranscriptLine = {
    ...line,
    id: `${line.at}_${line.speakerId}_${Math.random().toString(36).slice(2, 8)}`,
  };
  await updateDoc(doc(db, "videoCalls", callId), {
    transcript: arrayUnion(next),
    [`interim.${line.speakerId}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });
  return next;
}

/** Push live partial speech so the other party sees captions in real time */
export async function setSpeakerInterim(
  callId: string,
  speakerId: string,
  speakerName: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    await updateDoc(doc(db, "videoCalls", callId), {
      [`interim.${speakerId}`]: deleteField(),
      updatedAt: serverTimestamp(),
    });
    return;
  }
  const payload: VideoCallInterim = {
    speakerId,
    speakerName,
    text: trimmed,
    at: Date.now(),
  };
  await updateDoc(doc(db, "videoCalls", callId), {
    [`interim.${speakerId}`]: payload,
    updatedAt: serverTimestamp(),
  });
}

export async function endVideoCall(input: {
  callId: string;
  endedById: string;
  endedByName: string;
}): Promise<void> {
  await updateDoc(doc(db, "videoCalls", input.callId), {
    status: "ended" satisfies VideoCallStatus,
    endedAtMs: Date.now(),
    endedById: input.endedById,
    endedByName: input.endedByName,
    updatedAt: serverTimestamp(),
  });
}

/** Best-effort cleanup of ICE candidates after call ends */
export async function cleanupCallIce(callId: string): Promise<void> {
  try {
    const iceSnap = await getDocs(collection(db, "videoCalls", callId, "ice"));
    await Promise.all(iceSnap.docs.map((d) => deleteDoc(d.ref)));
  } catch {
    /* ignore */
  }
}

export async function ensureCallDoc(callId: string): Promise<void> {
  await setDoc(
    doc(db, "videoCalls", callId),
    { updatedAt: serverTimestamp() },
    { merge: true },
  );
}
