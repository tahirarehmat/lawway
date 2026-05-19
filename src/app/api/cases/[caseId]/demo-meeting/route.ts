import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { recordDemoMeeting } from "@/lib/case-events";

type RouteContext = { params: Promise<{ caseId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "client" && session.role !== "lawyer") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { caseId } = await context.params;
    const body = (await request.json()) as { summary?: string };
    const summary = String(body.summary ?? "").trim();

    if (!summary) {
      return NextResponse.json(
        { error: "Meeting summary is required." },
        { status: 400 },
      );
    }

    const event = await recordDemoMeeting(
      caseId,
      session.userId,
      session.role,
      summary,
    );

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Demo meeting failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to record meeting.";
    const status =
      message === "Forbidden."
        ? 403
        : message.includes("not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
