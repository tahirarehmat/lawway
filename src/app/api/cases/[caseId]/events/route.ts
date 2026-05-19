import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  createCaseEvent,
  getCaseEventsForUser,
  type CaseEventType,
  type CaseEventPriority,
  type CaseEventStatus,
} from "@/lib/case-events";

const VALID_TYPES = new Set<CaseEventType>([
  "hearing",
  "meeting",
  "deadline",
  "document_required",
  "filing_update",
  "status_update",
  "reminder",
  "general_note",
]);

type RouteContext = { params: Promise<{ caseId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "client" && session.role !== "lawyer") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { caseId } = await context.params;
    const events = await getCaseEventsForUser(
      caseId,
      session.userId,
      session.role,
    );

    return NextResponse.json(
      { events },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("List case events failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to load events.";
    const missingTable = message.includes("case_events");
    return NextResponse.json(
      {
        error: missingTable
          ? "Case events are not available yet. Run database migrations."
          : message,
        events: [],
      },
      { status: missingTable ? 200 : 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "lawyer") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { caseId } = await context.params;
    const body = (await request.json()) as {
      eventType?: CaseEventType;
      title?: string;
      description?: string | null;
      startsAt?: string | null;
      endsAt?: string | null;
      location?: string | null;
      priority?: CaseEventPriority;
      status?: CaseEventStatus;
    };

    const eventType = body.eventType;
    const title = String(body.title ?? "").trim();

    if (!eventType || !VALID_TYPES.has(eventType)) {
      return NextResponse.json({ error: "Invalid event type." }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const event = await createCaseEvent(session.userId, caseId, {
      eventType,
      title,
      description: body.description,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      location: body.location,
      priority: body.priority,
      status: body.status,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Create case event failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to create event.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
