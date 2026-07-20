"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { ClientCaseEvent } from "@/lib/case-events";
import {
  EVENT_PRIORITY_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
} from "@/lib/case-events";
import { formatEventWhen } from "@/lib/format-event-date";

type ClientEventDetailPanelProps = {
  event: ClientCaseEvent;
  onClose: () => void;
};

export function ClientEventDetailPanel({ event, onClose }: ClientEventDetailPanelProps) {
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
      aria-labelledby="event-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />

      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            {EVENT_TYPE_LABELS[event.eventType]}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] p-2 text-muted-foreground hover:bg-muted"
            aria-label="Close panel"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <h2 id="event-detail-title" className="text-2xl font-semibold tracking-tight text-foreground">
            {event.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{event.caseTitle}</p>
          {event.clientName ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Client: {event.clientName}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Counsel: {event.lawyerName}
            </p>
          )}

          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                When
              </dt>
              <dd className="mt-1 text-foreground">{formatEventWhen(event.startsAt)}</dd>
            </div>
            {event.location ? (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Location
                </dt>
                <dd className="mt-1 text-foreground">{event.location}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </dt>
              <dd className="mt-1 text-foreground">{EVENT_STATUS_LABELS[event.status]}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Priority
              </dt>
              <dd className="mt-1 text-foreground">{EVENT_PRIORITY_LABELS[event.priority]}</dd>
            </div>
            {event.description ? (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Details
                </dt>
                <dd className="mt-1 leading-relaxed text-muted-foreground">{event.description}</dd>
              </div>
            ) : null}
          </dl>

          <Link
            href={`/dashboard/cases/${event.caseId}`}
            className="mt-8 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Open case file
          </Link>
        </div>
      </aside>
    </div>
  );
}
