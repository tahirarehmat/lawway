import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getCaseDetail } from "@/lib/cases";

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
    const caseDetail = await getCaseDetail(
      caseId,
      session.userId,
      session.role,
    );

    return NextResponse.json(
      { case: caseDetail, caseDetail },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Get case failed:", error);
    const message = error instanceof Error ? error.message : "Unable to load case.";
    const status =
      message === "Forbidden." || message.includes("access")
        ? 403
        : message.toLowerCase().includes("not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
