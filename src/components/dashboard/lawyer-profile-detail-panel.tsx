"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  Award,
  Briefcase,
  ChevronLeft,
  MapPin,
  Phone,
  Scale,
  X,
} from "lucide-react";
import type { LawyerSearchResult } from "@/lib/lawyers";
import { lawyerBadge, lawyerInitials } from "@/lib/lawyers";
import { LawyerContactActions } from "@/components/dashboard/lawyer-contact-actions";
import { cn } from "@/lib/utils";

type LawyerProfileDetailPanelProps = {
  lawyer: LawyerSearchResult;
  onClose: () => void;
};

function formatExperience(years: number | null): string {
  if (years == null) return "Not specified";
  return `${years} year${years === 1 ? "" : "s"} of practice`;
}

export function LawyerProfileDetailPanel({
  lawyer,
  onClose,
}: LawyerProfileDetailPanelProps) {
  const badge = lawyerBadge(lawyer.experienceYears);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lawyer-profile-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close profile"
      />

      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-border bg-background shadow-[0_12px_32px_rgba(28,25,23,0.08)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Back to results
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-col items-center text-center">
            {lawyer.profilePhotoUrl ? (
              <div className="relative size-24 overflow-hidden rounded-full border border-border">
                <Image
                  src={lawyer.profilePhotoUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-foreground">
                {lawyerInitials(lawyer.fullName)}
              </div>
            )}
            <span
              className={cn(
                "mt-4 rounded-full px-3 py-1 text-[10px] font-semibold tracking-wider uppercase",
                badge.className,
              )}
            >
              {badge.label}
            </span>
            <h2
              id="lawyer-profile-title"
              className="mt-3 text-2xl font-semibold tracking-tight text-foreground"
            >
              {lawyer.fullName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{lawyer.specialization}</p>
          </div>

          <div className="mt-8 space-y-4">
            <DetailRow
              icon={Briefcase}
              label="Experience"
              value={formatExperience(lawyer.experienceYears)}
            />
            <DetailRow icon={MapPin} label="Province" value={lawyer.province} />
            <DetailRow icon={MapPin} label="Office" value={lawyer.officeAddress} />
            <DetailRow
              icon={Scale}
              label="Bar registration"
              value={lawyer.barRegistrationNo}
            />
            <DetailRow icon={Phone} label="Phone" value={lawyer.phone} />
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-foreground">
              <Award className="size-4 text-muted-foreground" aria-hidden />
              <h3 className="text-sm font-semibold">About</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {lawyer.bio?.trim() ||
                "This advocate has not added a biography yet. You can still request a consultation through Lawway."}
            </p>
          </div>
        </div>

        <div className="border-t border-border bg-card px-6 py-4">
          <LawyerContactActions lawyer={lawyer} onNavigateAway={onClose} />
        </div>
      </aside>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="dashboard-icon-wrap size-9 shrink-0">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
