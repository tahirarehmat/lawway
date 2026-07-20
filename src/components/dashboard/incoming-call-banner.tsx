"use client";

import { useEffect, useState } from "react";
import { Phone, Video } from "lucide-react";
import {
  listenForIncomingCalls,
  type VideoCallDoc,
} from "@/lib/videoCallFirebase";
import { Button } from "@/components/ui/button";

type IncomingCallBannerProps = {
  userId: string;
  role: "client" | "lawyer";
  /** Only show for this case when set */
  caseId?: string;
  onAccept: (call: VideoCallDoc) => void;
  onDismiss: (call: VideoCallDoc) => void;
};

export function IncomingCallBanner({
  userId,
  role,
  caseId,
  onAccept,
  onDismiss,
}: IncomingCallBannerProps) {
  const [incoming, setIncoming] = useState<VideoCallDoc | null>(null);

  useEffect(() => {
    const unsub = listenForIncomingCalls({
      userId,
      role,
      onCall: (call) => {
        if (!call) {
          setIncoming(null);
          return;
        }
        if (caseId && call.caseId !== caseId) return;
        setIncoming(call);
      },
    });
    return () => unsub();
  }, [userId, role, caseId]);

  if (!incoming) return null;

  const fromName =
    role === "lawyer" ? incoming.clientName : incoming.lawyerName;
  const isVoice = incoming.mode === "voice";

  return (
    <div className="fixed inset-x-0 top-4 z-[110] flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-primary/30 bg-card px-4 py-3 shadow-lg">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          {isVoice ? (
            <Phone className="size-5 animate-pulse" />
          ) : (
            <Video className="size-5 animate-pulse" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Incoming {isVoice ? "voice" : "video"} call
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {fromName} · {incoming.caseTitle}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            onDismiss(incoming);
            setIncoming(null);
          }}
        >
          Decline
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onAccept(incoming);
            setIncoming(null);
          }}
        >
          Join
        </Button>
      </div>
    </div>
  );
}
