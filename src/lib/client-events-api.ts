import type { ClientCaseEvent } from "@/lib/case-events";
import type { EventTimeFilter } from "@/lib/case-events";

export async function fetchClientEvents(
  filter: EventTimeFilter = "all",
): Promise<ClientCaseEvent[]> {
  const params = new URLSearchParams();
  if (filter !== "all") {
    params.set("filter", filter);
  }

  const qs = params.toString();
  const res = await fetch(`/api/events${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to load events.");
  }

  const data = (await res.json()) as { events: ClientCaseEvent[] };
  return data.events;
}
