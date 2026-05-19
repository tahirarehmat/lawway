import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { addCaseStage } from "@/lib/case-stages";

type RouteContext = { params: Promise<{ caseId: string }> };

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
      title?: string;
      description?: string | null;
    };

    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Stage title is required." }, { status: 400 });
    }

    const stages = await addCaseStage(caseId, session.userId, {
      title,
      description: body.description ?? null,
    });

    return NextResponse.json({ stages }, { status: 201 });
  } catch (error) {
    console.error("Add stage failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to add stage.";
    const status =
      message === "Forbidden."
        ? 403
        : message.includes("not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
