"use client";

import Link from "next/link";
import { MessageCircle, Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type NotYourLawyerModalProps = {
  lawyerName: string;
  bookHref: string;
  onClose: () => void;
  onBook?: () => void;
};

export function NotYourLawyerModal({
  lawyerName,
  bookHref,
  onClose,
  onBook,
}: NotYourLawyerModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="not-your-lawyer-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.9)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 rounded-[10px] p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" aria-hidden />
        </button>

        <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--gold,#f5b73c)]/15 text-[var(--gold,#f5b73c)]">
          <Scale className="size-6" strokeWidth={1.75} aria-hidden />
        </div>

        <h2
          id="not-your-lawyer-title"
          className="mt-4 text-xl font-semibold tracking-tight text-foreground"
        >
          That&apos;s not your lawyer yet
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Send a consultation request to{" "}
          <span className="font-medium text-foreground">{lawyerName}</span> and wait
          for acceptance before chatting.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1"
            onClick={onClose}
          >
            Close
          </Button>
          <Link
            href={bookHref}
            onClick={() => {
              onBook?.();
              onClose();
            }}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <MessageCircle className="size-4" aria-hidden />
            Book consultation
          </Link>
        </div>
      </div>
    </div>
  );
}
