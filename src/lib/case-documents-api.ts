import type { CaseDocument, CreateCaseDocumentInput } from "@/lib/case-documents";
import type { CaseEventVisibility } from "@/lib/case-events";

async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Request failed.";
}

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

export async function fetchCaseDocuments(): Promise<CaseDocument[]> {
  const res = await fetch("/api/documents", fetchOpts);
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { documents: CaseDocument[] };
  return data.documents;
}

export async function fetchDocumentsForCase(
  caseId: string,
): Promise<CaseDocument[]> {
  const res = await fetch(
    `/api/cases/${encodeURIComponent(caseId)}/documents`,
    fetchOpts,
  );
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { documents: CaseDocument[] };
  return data.documents;
}

export async function createCaseDocument(
  body: CreateCaseDocumentInput,
): Promise<CaseDocument> {
  const res = await fetch("/api/documents", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { document: CaseDocument };
  return data.document;
}

export async function updateDocumentVisibility(
  documentId: string,
  visibleTo: Extract<CaseEventVisibility, "client_only" | "both">,
): Promise<CaseDocument> {
  const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibleTo }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { document: CaseDocument };
  return data.document;
}

export async function deleteCaseDocument(documentId: string): Promise<void> {
  const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
}
