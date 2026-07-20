import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  filterClientEvents,
  getClientCaseEvents,
  getLawyerCaseEvents,
  listLawyerUpcomingHearings,
  type EventTimeFilter,
} from "@/lib/case-events";

const VALID_FILTERS = new Set<EventTimeFilter>(["all", "upcoming", "past"]);

export async function GET(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterParam = (searchParams.get("filter") ?? "all") as EventTimeFilter;
    const filter = VALID_FILTERS.has(filterParam) ? filterParam : "all";
    const view = searchParams.get("view");
    const hearingsOnly = searchParams.get("type") === "hearing";

    if (session.role === "client") {
      const events = await getClientCaseEvents(session.userId);
      const filtered = filterClientEvents(events, filter);
      return NextResponse.json({ events: filtered });
    }

    if (session.role === "lawyer") {
      // Home dashboard: upcoming hearings snapshot (no view=calendar)
      if (view !== "calendar") {
        const events = await listLawyerUpcomingHearings(session.userId, 20);
        return NextResponse.json({ events });
      }

      let events = await getLawyerCaseEvents(session.userId);
      if (hearingsOnly) {
        events = events.filter((e) => e.eventType === "hearing");
      }
      const filtered = filterClientEvents(events, filter);
      return NextResponse.json({ events: filtered });
    }

    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  } catch (error) {
    console.error("Events fetch failed:", error);
    return NextResponse.json(
      { error: "Unable to load events. Please try again." },
      { status: 500 },
    );
  }
}
