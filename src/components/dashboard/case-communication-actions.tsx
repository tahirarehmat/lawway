"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Phone, Video } from "lucide-react";
import type { CaseDetail } from "@/lib/cases";
import { ensureCaseChatTicket } from "@/lib/ticketFirebase";
import { endVideoCall, type VideoCallDoc } from "@/lib/videoCallFirebase";
import { VideoCallModal } from "@/components/dashboard/video-call-modal";
import { IncomingCallBanner } from "@/components/dashboard/incoming-call-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CaseCommunicationActionsProps = {
  caseDetail: CaseDetail;
  role: "client" | "lawyer";
  /** Client sign-in email (session email for clients; case client email for lawyers). */
  clientUid: string;
  localDisplayName: string;
  onMeetingRecorded: () => void;
};

export function CaseCommunicationActions({
  caseDetail,
  role,
  clientUid,
  localDisplayName,
  onMeetingRecorded,
}: CaseCommunicationActionsProps) {
  const router = useRouter();
  const [openingChat, setOpeningChat] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [callMode, setCallMode] = useState<"video" | "voice">("video");
  const [joinCallId, setJoinCallId] = useState<string | null>(null);

  const localUserId =
    role === "lawyer" ? caseDetail.lawyerId : caseDetail.clientId;
  const remoteName =
    role === "lawyer" ? caseDetail.clientName : caseDetail.lawyerName;

  async function openChat() {
    setOpeningChat(true);
    try {
      const ticketId = await ensureCaseChatTicket({
        clientId: caseDetail.clientId,
        clientUid,
        lawyerId: caseDetail.lawyerId,
        lawyerName: caseDetail.lawyerName,
        caseId: caseDetail.caseId,
        caseTitle: caseDetail.title,
      });

      const params = new URLSearchParams({
        fromCase: "1",
        caseId: caseDetail.caseId,
        caseTitle: caseDetail.title,
        id: ticketId,
      });

      if (role === "lawyer") {
        params.set("clientId", caseDetail.clientId);
      } else {
        params.set("lawyerId", caseDetail.lawyerId);
      }

      router.push(`/dashboard/tickets?${params.toString()}`);
    } catch (err) {
      console.error(err);
      toast.error("Could not open chat. Try again from Messages.");
    } finally {
      setOpeningChat(false);
    }
  }

  function startCall(mode: "video" | "voice", joinId: string | null = null) {
    setCallMode(mode);
    setJoinCallId(joinId);
    setCallOpen(true);
  }

  async function declineCall(call: VideoCallDoc) {
    try {
      await endVideoCall({
        callId: call.callId,
        endedById: localUserId,
        endedByName: localDisplayName,
      });
      toast.message("Call declined");
    } catch {
      toast.error("Could not decline call.");
    }
  }

  return (
    <>
      <IncomingCallBanner
        userId={localUserId}
        role={role}
        caseId={caseDetail.caseId}
        onAccept={(call) => startCall(call.mode, call.callId)}
        onDismiss={(call) => void declineCall(call)}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={openingChat}
          onClick={() => void openChat()}
          className="inline-flex gap-2"
        >
          <MessageCircle className="size-4" aria-hidden />
          {openingChat
            ? "Opening chat…"
            : role === "lawyer"
              ? "Message client"
              : "Message counsel"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => startCall("voice")}
        >
          <Phone className="size-3.5" aria-hidden />
          Voice call
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5",
          )}
          onClick={() => startCall("video")}
        >
          <Video className="size-3.5" aria-hidden />
          Meeting
        </Button>
      </div>

      <VideoCallModal
        open={callOpen}
        caseId={caseDetail.caseId}
        caseTitle={caseDetail.title}
        clientId={caseDetail.clientId}
        lawyerId={caseDetail.lawyerId}
        clientName={caseDetail.clientName}
        lawyerName={caseDetail.lawyerName}
        localUserId={localUserId}
        localName={localDisplayName}
        remoteName={remoteName}
        role={role}
        mode={callMode}
        joinCallId={joinCallId}
        onClose={() => {
          setCallOpen(false);
          setJoinCallId(null);
        }}
        onMeetingRecorded={onMeetingRecorded}
      />
    </>
  );
}
