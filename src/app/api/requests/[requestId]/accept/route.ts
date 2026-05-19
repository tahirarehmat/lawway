import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { acceptCaseRequest } from "@/lib/case-requests";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "lawyer") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { requestId } = await context.params;
    const result = await acceptCaseRequest(requestId, session.userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Accept request failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to accept request.";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
