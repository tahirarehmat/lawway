"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, CalendarDays } from "lucide-react";
import type { ClientCaseEvent, EventTimeFilter } from "@/lib/case-events";
import { EVENT_TYPE_LABELS } from "@/lib/case-events";
import { formatEventWhen } from "@/lib/format-event-date";
import { ClientEventDetailPanel } from "@/components/dashboard/client-event-detail-panel";
import { ClientEventsSkeleton } from "@/components/dashboard/client-events-skeleton";
import { cn } from "@/lib/utils";

type CalendarFilter = EventTimeFilter | "hearings";

const FILTER_TABS: { value: CalendarFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "hearings", label: "Hearings" },
];

async function fetchLawyerCalendar(
  filter: CalendarFilter,
): Promise<ClientCaseEvent[]> {
  const params = new URLSearchParams({ view: "calendar" });
  if (filter === "hearings") {
    params.set("filter", "all");
    params.set("type", "hearing");
  } else if (filter !== "all") {
    params.set("filter", filter);
  }

  const res = await fetch(`/api/events?${params.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to load calendar.");
  }
  const data = (await res.json()) as { events: ClientCaseEvent[] };
  return data.events;
}

export function LawyerHearingCalendar() {
  const [filter, setFilter] = useState<CalendarFilter>("upcoming");
  const [events, setEvents] = useState<ClientCaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ClientCaseEvent | null>(
    null,
  );

  const loadEvents = useCallback(async (activeFilter: CalendarFilter) => {
    setLoading(true);
    setError(null);
    setSelectedEvent(null);

    try {
      const data = await fetchLawyerCalendar(activeFilter);
      setEvents(data);
    } catch (err) {
      setEvents([]);
      setError(err instanceof Error ? err.message : "Failed to load calendar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents(filter);
  }, [filter, loadEvents]);

  return (
    <div className="mx-auto">
      <header className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
          Schedule
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Hearing calendar
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Hearings, deadlines, and meetings across your active matters.
        </p>
      </header>

      <div
        className="mb-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter calendar"
      >
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab.value)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "dashboard-card text-muted-foreground hover:border-[var(--dashboard-border-hover)] hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <ClientEventsSkeleton />
      ) : error ? (
        <div className="dashboard-card-muted px-5 py-4 text-sm text-foreground">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="dashboard-card-muted flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="dashboard-icon-wrap size-14">
            <CalendarDays className="size-7" aria-hidden />
          </span>
          <p className="mt-4 font-medium text-foreground">No events found</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Schedule hearings and deadlines from a case file to see them here.
          </p>
          <Link
            href="/dashboard/cases"
            className="mt-5 text-sm font-medium text-primary hover:underline"
          >
            Open My Cases
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {events.length} event{events.length === 1 ? "" : "s"}
          </p>
          <ul className="space-y-3" role="list">
            {events.map((event) => (
              <li key={event.eventId}>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(event)}
                  className={cn(
                    "dashboard-card w-full p-4 text-left transition",
                    selectedEvent?.eventId === event.eventId &&
                      "ring-2 ring-primary/40",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="dashboard-icon-wrap size-10 shrink-0">
                      <Calendar className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-[10px] font-semibold tracking-wide text-primary uppercase">
                        {EVENT_TYPE_LABELS[event.eventType]}
                      </span>
                      <p className="mt-1 font-medium text-foreground">
                        {event.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.caseTitle}
                        {event.clientName ? ` · ${event.clientName}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatEventWhen(event.startsAt)}
                      </p>
                    </span>
                    <Link
                      href={`/dashboard/cases/${event.caseId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-xs font-medium text-primary hover:underline"
                    >
                      Case
                    </Link>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {selectedEvent ? (
        <ClientEventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      ) : null}
    </div>
  );
}
