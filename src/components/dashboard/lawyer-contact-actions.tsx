"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle } from "lucide-react";
import type { LawyerSearchResult } from "@/lib/lawyers";
import { fetchCases } from "@/lib/cases-api";
import { fetchCaseRequests } from "@/lib/case-requests-api";
import { NotYourLawyerModal } from "@/components/dashboard/not-your-lawyer-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LawyerContactActionsProps = {
  lawyer: LawyerSearchResult;
  className?: string;
  onNavigateAway?: () => void;
};

function consultationHref(lawyer: LawyerSearchResult): string {
  return `/dashboard/requests/new?${new URLSearchParams({
    title: "Consultation request",
    lawyerId: lawyer.userId,
    lawyerName: lawyer.fullName,
  }).toString()}`;
}

async function hasAcceptedRelationship(lawyerUserId: string): Promise<boolean> {
  const [cases, requests] = await Promise.all([
    fetchCases().catch(() => []),
    fetchCaseRequests().catch(() => []),
  ]);

  if (cases.some((c) => c.lawyerId === lawyerUserId)) return true;

  return requests.some(
    (r) =>
      r.status === "accepted" &&
      (r.acceptedByLawyerId === lawyerUserId ||
        r.requestedLawyerId === lawyerUserId),
  );
}

export function LawyerContactActions({
  lawyer,
  className,
  onNavigateAway,
}: LawyerContactActionsProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const bookHref = consultationHref(lawyer);

  async function handleChat() {
    setChecking(true);
    try {
      const connected = await hasAcceptedRelationship(lawyer.userId);
      if (!connected) {
        setShowGateModal(true);
        return;
      }

      onNavigateAway?.();
      router.push(
        `/dashboard/tickets?lawyerId=${encodeURIComponent(lawyer.userId)}`,
      );
    } catch {
      toast.error("Could not verify your relationship with this lawyer.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <div className={cn("flex gap-2", className)}>
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-1 gap-1.5 text-xs sm:text-sm"
          disabled={checking}
          onClick={(e) => {
            e.stopPropagation();
            void handleChat();
          }}
        >
          {checking ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <MessageCircle className="size-3.5" aria-hidden />
          )}
          Chat
        </Button>
        <Link
          href={bookHref}
          onClick={(e) => {
            e.stopPropagation();
            onNavigateAway?.();
          }}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-[10px] bg-primary px-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 sm:text-sm"
        >
          Book consultation
        </Link>
      </div>

      {showGateModal ? (
        <NotYourLawyerModal
          lawyerName={lawyer.fullName}
          bookHref={bookHref}
          onClose={() => setShowGateModal(false)}
          onBook={onNavigateAway}
        />
      ) : null}
    </>
  );
}
