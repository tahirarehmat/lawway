"use client";

import Image from "next/image";
import { ChevronRight, MapPin, Scale } from "lucide-react";
import type { LawyerSearchResult } from "@/lib/lawyers";
import { lawyerBadge, lawyerInitials } from "@/lib/lawyers";
import { cn } from "@/lib/utils";

type LawyerSearchResultCardProps = {
  lawyer: LawyerSearchResult;
  onSelect: () => void;
};

function formatExperienceShort(years: number | null): string {
  if (years == null) return "Experience not listed";
  return `${years}+ years experience`;
}

export function LawyerSearchResultCard({
  lawyer,
  onSelect,
}: LawyerSearchResultCardProps) {
  const badge = lawyerBadge(lawyer.experienceYears);
  const location = lawyer.officeAddress
    ? `${lawyer.province} · ${lawyer.officeAddress}`
    : lawyer.province;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition hover:border-primary/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:gap-5 sm:p-5"
    >
      {lawyer.profilePhotoUrl ? (
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-black/5 sm:size-16">
          <Image
            src={lawyer.profilePhotoUrl}
            alt=""
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary font-serif text-lg font-medium text-primary sm:size-16 sm:text-xl">
          {lawyerInitials(lawyer.fullName)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif text-lg font-medium text-secondary transition group-hover:text-secondary/90">
            {lawyer.fullName}
          </h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        </div>

        <p className="mt-1 flex items-center gap-1.5 text-sm text-primary">
          <Scale className="size-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="truncate">{lawyer.specialization}</span>
        </p>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral/60">
          <span>{formatExperienceShort(lawyer.experienceYears)}</span>
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{location}</span>
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 text-primary/70 transition group-hover:text-primary">
        <span className="hidden text-xs font-medium sm:inline">View profile</span>
        <ChevronRight className="size-5" aria-hidden />
      </div>
    </button>
  );
}
