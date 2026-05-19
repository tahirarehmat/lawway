import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { advanceStage, removeCaseStage, type StageAction } from "@/lib/case-stages";

const VALID_ACTIONS = new Set<StageAction>([
  "stage_started",
  "stage_completed",
  "stage_skipped",
]);

type RouteContext = {
  params: Promise<{ caseId: string; stageId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "lawyer") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { caseId, stageId } = await context.params;
    const body = (await request.json()) as { action?: string; note?: string };
    const action = body.action as StageAction;

    if (!action || !VALID_ACTIONS.has(action)) {
      return NextResponse.json({ error: "Invalid stage action." }, { status: 400 });
    }

    const stages = await advanceStage(
      caseId,
      stageId,
      session.userId,
      action,
      body.note,
    );

    return NextResponse.json({ stages });
  } catch (error) {
    console.error("Advance stage failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to update stage.";
    const status =
      message === "Forbidden."
        ? 403
        : message.includes("not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "lawyer") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { caseId, stageId } = await context.params;
    const stages = await removeCaseStage(caseId, stageId, session.userId);

    return NextResponse.json({ stages });
  } catch (error) {
    console.error("Remove stage failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to remove stage.";
    const status =
      message === "Forbidden."
        ? 403
        : message.includes("not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
