"use client";

import { CalendarDays } from "lucide-react";
import type { ClientCaseEvent } from "@/lib/case-events";
import { EVENT_TYPE_LABELS } from "@/lib/case-events";
import { formatEventWhen } from "@/lib/format-event-date";
import { cn } from "@/lib/utils";

type ClientEventCardProps = {
  event: ClientCaseEvent;
  selected?: boolean;
  onSelect: () => void;
};

export function ClientEventCard({ event, selected, onSelect }: ClientEventCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "dashboard-card w-full p-4 text-left transition",
        selected && "ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="dashboard-icon-wrap size-10 shrink-0">
          <CalendarDays className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            {EVENT_TYPE_LABELS[event.eventType]}
          </span>
          <p className="mt-1 font-medium text-secondary">{event.title}</p>
          <p className="mt-1 text-xs text-neutral/55">{event.caseTitle}</p>
          <p className="mt-1 text-xs text-neutral/50">{formatEventWhen(event.startsAt)}</p>
        </span>
      </div>
    </button>
  );
}
