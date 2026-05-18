"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  Award,
  Briefcase,
  ChevronLeft,
  MapPin,
  MessageCircle,
  Phone,
  Scale,
  X,
} from "lucide-react";
import type { LawyerSearchResult } from "@/lib/lawyers";
import { lawyerBadge, lawyerInitials } from "@/lib/lawyers";
import { Button } from "@/components/ui/button";
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
        className="absolute inset-0 bg-secondary/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close profile"
      />

      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-black/10 bg-[#FCF9F6] shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral/70 transition hover:text-secondary"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Back to results
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral/50 transition hover:bg-black/5 hover:text-secondary"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="flex flex-col items-center text-center">
            {lawyer.profilePhotoUrl ? (
              <div className="relative size-24 overflow-hidden rounded-full border-2 border-primary/30">
                <Image
                  src={lawyer.profilePhotoUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full bg-secondary font-serif text-2xl font-medium text-primary">
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
              className="mt-3 font-serif text-2xl font-medium text-secondary"
            >
              {lawyer.fullName}
            </h2>
            <p className="mt-1 text-sm text-primary">{lawyer.specialization}</p>
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

          <div className="mt-8 rounded-xl border border-black/5 bg-white p-5">
            <div className="flex items-center gap-2 text-secondary">
              <Award className="size-4 text-primary" aria-hidden />
              <h3 className="text-sm font-semibold">About</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-neutral/75">
              {lawyer.bio?.trim() ||
                "This advocate has not added a biography yet. You can still request a consultation through Lawway."}
            </p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-black/5 bg-white px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 gap-2 border-black/10 text-secondary"
          >
            <MessageCircle className="size-4" aria-hidden />
            Chat
          </Button>
          <Button
            type="button"
            className="h-11 flex-1 bg-secondary text-white hover:bg-secondary/90"
          >
            Book consultation
          </Button>
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
    <div className="flex gap-3 rounded-xl border border-black/5 bg-white px-4 py-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wide text-neutral/45 uppercase">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-secondary">{value}</p>
      </div>
    </div>
  );
}
