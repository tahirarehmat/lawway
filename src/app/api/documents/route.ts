import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  createCaseDocument,
  listCaseDocumentsForUser,
  type CreateCaseDocumentInput,
} from "@/lib/case-documents";
import type { CaseEventVisibility } from "@/lib/case-events";

const VISIBILITY = new Set<CaseEventVisibility>([
  "client_only",
  "lawyer_only",
  "both",
]);

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.role !== "client" && session.role !== "lawyer") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const documents = await listCaseDocumentsForUser(
      session.userId,
      session.role,
    );
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Documents list failed:", error);
    return NextResponse.json(
      { error: "Unable to load documents." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.role !== "client" && session.role !== "lawyer") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as Partial<CreateCaseDocumentInput>;
    if (!body.caseId?.trim()) {
      return NextResponse.json({ error: "Case is required." }, { status: 400 });
    }
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    if (!body.fileName?.trim() || !body.fileUrl?.trim()) {
      return NextResponse.json(
        { error: "File upload is required." },
        { status: 400 },
      );
    }

    const visibleTo =
      body.visibleTo && VISIBILITY.has(body.visibleTo)
        ? body.visibleTo
        : undefined;

    const document = await createCaseDocument(session.userId, session.role, {
      caseId: body.caseId.trim(),
      title: body.title.trim(),
      fileName: body.fileName.trim(),
      fileUrl: body.fileUrl.trim(),
      mimeType: body.mimeType ?? null,
      fileSizeBytes: body.fileSizeBytes ?? null,
      visibleTo,
      notes: body.notes ?? null,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Document create failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to save document.";
    const status =
      message.includes("not found") || message.includes("Forbidden")
        ? message.includes("Forbidden")
          ? 403
          : 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
