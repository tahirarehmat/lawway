import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { cancelCaseRequest } from "@/lib/case-requests";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "lawyer" && session.role !== "client") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { requestId } = await context.params;
    const result = await cancelCaseRequest(
      requestId,
      session.userId,
      session.role,
    );

    return NextResponse.json({ request: result });
  } catch (error) {
    console.error("Cancel request failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to cancel request.";
    const status =
      message.includes("not found") || message.includes("cannot") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
