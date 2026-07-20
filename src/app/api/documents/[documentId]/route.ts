import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  deleteCaseDocument,
  updateDocumentVisibility,
} from "@/lib/case-documents";
import type { CaseEventVisibility } from "@/lib/case-events";

type RouteContext = { params: Promise<{ documentId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.role !== "client") {
      return NextResponse.json(
        { error: "Only clients can change document visibility." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as { visibleTo?: CaseEventVisibility };
    if (body.visibleTo !== "client_only" && body.visibleTo !== "both") {
      return NextResponse.json(
        { error: "Visibility must be client_only or both." },
        { status: 400 },
      );
    }

    const { documentId } = await context.params;
    const document = await updateDocumentVisibility(
      documentId,
      session.userId,
      body.visibleTo,
    );
    return NextResponse.json({ document });
  } catch (error) {
    console.error("Document visibility update failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to update document.";
    const status = message.includes("Forbidden")
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
    if (session.role !== "client" && session.role !== "lawyer") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { documentId } = await context.params;
    await deleteCaseDocument(documentId, session.userId, session.role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Document delete failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to delete document.";
    const status = message.includes("Forbidden")
      ? 403
      : message.includes("not found")
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
