import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { listDocumentsForCase } from "@/lib/case-documents";

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
    const documents = await listDocumentsForCase(
      caseId,
      session.userId,
      session.role,
    );
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Case documents list failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to load documents.";
    const status =
      message.includes("Forbidden") || message.includes("not found")
        ? message.includes("Forbidden")
          ? 403
          : 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
