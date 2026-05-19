"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Phone, Video } from "lucide-react";
import type { CaseDetail } from "@/lib/cases";
import { ensureCaseChatTicket } from "@/lib/ticketFirebase";
import { DemoMeetingModal } from "@/components/dashboard/demo-meeting-modal";
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
  const [meetingOpen, setMeetingOpen] = useState(false);

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

  function startVoiceDemo() {
    toast.message("Voice call (demo)", {
      description: `Connecting with ${remoteName}… Full calling coming soon.`,
      duration: 4000,
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={openingChat}
          onClick={() => void openChat()}
          className="inline-flex gap-2 bg-secondary text-white hover:bg-secondary/90"
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
          className="gap-1.5 border-black/10"
          onClick={startVoiceDemo}
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
            "gap-1.5 border-primary/40 text-secondary hover:bg-primary/10",
          )}
          onClick={() => setMeetingOpen(true)}
        >
          <Video className="size-3.5" aria-hidden />
          Meeting
        </Button>
      </div>

      <DemoMeetingModal
        open={meetingOpen}
        caseId={caseDetail.caseId}
        caseTitle={caseDetail.title}
        localName={localDisplayName}
        remoteName={remoteName}
        role={role}
        onClose={() => setMeetingOpen(false)}
        onMeetingRecorded={onMeetingRecorded}
      />
    </>
  );
}
