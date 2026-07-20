"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { ClientCaseEvent, EventTimeFilter } from "@/lib/case-events";
import { fetchClientEvents } from "@/lib/client-events-api";
import { ClientEventCard } from "@/components/dashboard/client-event-card";
import { ClientEventDetailPanel } from "@/components/dashboard/client-event-detail-panel";
import { ClientEventsSkeleton } from "@/components/dashboard/client-events-skeleton";
import { cn } from "@/lib/utils";

const FILTER_TABS: { value: EventTimeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

export function ClientEvents() {
  const [filter, setFilter] = useState<EventTimeFilter>("all");
  const [events, setEvents] = useState<ClientCaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ClientCaseEvent | null>(null);

  const loadEvents = useCallback(async (activeFilter: EventTimeFilter) => {
    setLoading(true);
    setError(null);
    setSelectedEvent(null);

    try {
      const data = await fetchClientEvents(activeFilter);
      setEvents(data);
    } catch (err) {
      setEvents([]);
      setError(err instanceof Error ? err.message : "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents(filter);
  }, [filter, loadEvents]);

  return (
    <div className="mx-auto ">
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter events">
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
        <div className="dashboard-card-muted px-5 py-4 text-sm text-foreground">{error}</div>
      ) : events.length === 0 ? (
        <div className="dashboard-card-muted flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="dashboard-icon-wrap size-14">
            <CalendarDays className="size-7" aria-hidden />
          </span>
          <p className="mt-4 font-medium text-foreground">No events found</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Events from your active cases will appear here.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {events.length} event{events.length === 1 ? "" : "s"}
          </p>
          <ul className="space-y-3" role="list">
            {events.map((event) => (
              <li key={event.eventId}>
                <ClientEventCard
                  event={event}
                  selected={selectedEvent?.eventId === event.eventId}
                  onSelect={() => setSelectedEvent(event)}
                />
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
