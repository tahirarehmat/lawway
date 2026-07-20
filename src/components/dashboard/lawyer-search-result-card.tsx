"use client";

import Image from "next/image";
import { Scale, User } from "lucide-react";
import type { LawyerSearchResult } from "@/lib/lawyers";

type LawyerSearchResultCardProps = {
  lawyer: LawyerSearchResult;
  onSelect: () => void;
};

export function LawyerSearchResultCard({
  lawyer,
  onSelect,
}: LawyerSearchResultCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="dashboard-card-interactive group flex h-full w-full min-w-0 flex-col overflow-hidden p-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {lawyer.profilePhotoUrl ? (
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-lg ring-1 ring-[var(--gold,#f5b73c)]/35">
          <Image
            src={lawyer.profilePhotoUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--gold,#f5b73c)]/15 text-[var(--gold,#f5b73c)] ring-1 ring-[var(--gold,#f5b73c)]/35">
          <User className="size-14 sm:size-16" strokeWidth={1.25} aria-hidden />
        </div>
      )}

      <div className="mt-3 flex min-w-0 w-full flex-col items-center overflow-hidden">
        <h3 className="w-full truncate text-sm font-semibold tracking-tight text-foreground">
          {lawyer.fullName}
        </h3>
        <p className="mt-1.5 flex max-w-full items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Scale
            className="size-3.5 shrink-0 text-[var(--gold,#f5b73c)]/80"
            aria-hidden
          />
          <span className="truncate">{lawyer.specialization}</span>
        </p>
      </div>
    </button>
  );
}
