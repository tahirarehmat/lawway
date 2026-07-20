import { getPool } from "@/lib/db";
import { assertCaseAccess } from "@/lib/cases";
import type { CaseEventVisibility } from "@/lib/case-events";

export type CaseDocument = {
  documentId: string;
  caseId: string;
  caseTitle: string;
  clientName: string;
  uploadedBy: string;
  uploaderName: string;
  title: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  visibleTo: CaseEventVisibility;
  notes: string | null;
  createdAt: string;
};

export type CreateCaseDocumentInput = {
  caseId: string;
  title: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  visibleTo?: CaseEventVisibility;
  notes?: string | null;
};

type DocumentRow = {
  document_id: string;
  case_id: string;
  case_title: string;
  client_name: string;
  uploaded_by: string;
  uploader_name: string;
  title: string;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  file_size_bytes: string | number | null;
  visible_to: CaseEventVisibility;
  notes: string | null;
  created_at: Date | string;
};

function toIso(value: Date | string | null): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapRow(row: DocumentRow): CaseDocument {
  return {
    documentId: row.document_id,
    caseId: row.case_id,
    caseTitle: row.case_title,
    clientName: row.client_name,
    uploadedBy: row.uploaded_by,
    uploaderName: row.uploader_name,
    title: row.title,
    fileName: row.file_name,
    fileUrl: row.file_url,
    mimeType: row.mime_type,
    fileSizeBytes:
      row.file_size_bytes == null ? null : Number(row.file_size_bytes),
    visibleTo: row.visible_to,
    notes: row.notes,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
  };
}

const DOCUMENT_SELECT = `
  cd.document_id,
  cd.case_id,
  c.title AS case_title,
  COALESCE(cp.full_name, 'Client') AS client_name,
  cd.uploaded_by,
  COALESCE(
    lp.full_name,
    cp_uploader.full_name,
    u.email,
    'User'
  ) AS uploader_name,
  cd.title,
  cd.file_name,
  cd.file_url,
  cd.mime_type,
  cd.file_size_bytes,
  cd.visible_to,
  cd.notes,
  cd.created_at
`;

const DOCUMENT_FROM = `
  FROM case_documents cd
  INNER JOIN cases c ON c.case_id = cd.case_id
  LEFT JOIN client_profiles cp ON cp.user_id = c.client_id
  LEFT JOIN users u ON u.user_id = cd.uploaded_by
  LEFT JOIN lawyer_profiles lp ON lp.user_id = cd.uploaded_by
  LEFT JOIN client_profiles cp_uploader ON cp_uploader.user_id = cd.uploaded_by
`;

export async function listCaseDocumentsForUser(
  userId: string,
  role: "client" | "lawyer",
): Promise<CaseDocument[]> {
  const pool = getPool();
  const accessClause =
    role === "client" ? "c.client_id = $1" : "c.lawyer_id = $1";
  const visibilityClause =
    role === "client"
      ? "cd.visible_to IN ('client_only', 'both')"
      : "cd.visible_to IN ('lawyer_only', 'both')";

  const { rows } = await pool.query<DocumentRow>(
    `SELECT ${DOCUMENT_SELECT}
     ${DOCUMENT_FROM}
     WHERE ${accessClause} AND ${visibilityClause}
     ORDER BY cd.created_at DESC`,
    [userId],
  );

  return rows.map(mapRow);
}

export async function listDocumentsForCase(
  caseId: string,
  userId: string,
  role: "client" | "lawyer",
): Promise<CaseDocument[]> {
  await assertCaseAccess(caseId, userId, role);

  const pool = getPool();
  const visibilityClause =
    role === "client"
      ? "cd.visible_to IN ('client_only', 'both')"
      : "cd.visible_to IN ('lawyer_only', 'both')";

  const { rows } = await pool.query<DocumentRow>(
    `SELECT ${DOCUMENT_SELECT}
     ${DOCUMENT_FROM}
     WHERE cd.case_id = $1 AND ${visibilityClause}
     ORDER BY cd.created_at DESC`,
    [caseId],
  );

  return rows.map(mapRow);
}

export async function updateDocumentVisibility(
  documentId: string,
  clientId: string,
  visibleTo: Extract<CaseEventVisibility, "client_only" | "both">,
): Promise<CaseDocument> {
  const pool = getPool();
  const access = await pool.query<{
    document_id: string;
    client_id: string;
  }>(
    `SELECT cd.document_id, c.client_id
     FROM case_documents cd
     INNER JOIN cases c ON c.case_id = cd.case_id
     WHERE cd.document_id = $1`,
    [documentId],
  );

  const row = access.rows[0];
  if (!row) throw new Error("Document not found.");
  if (row.client_id !== clientId) throw new Error("Forbidden.");

  const { rows } = await pool.query<DocumentRow>(
    `WITH updated AS (
       UPDATE case_documents
       SET visible_to = $2::case_event_visibility
       WHERE document_id = $1
       RETURNING *
     )
     SELECT
       u.document_id,
       u.case_id,
       c.title AS case_title,
       COALESCE(cp.full_name, 'Client') AS client_name,
       u.uploaded_by,
       COALESCE(lp.full_name, cp_uploader.full_name, usr.email, 'User') AS uploader_name,
       u.title,
       u.file_name,
       u.file_url,
       u.mime_type,
       u.file_size_bytes,
       u.visible_to,
       u.notes,
       u.created_at
     FROM updated u
     INNER JOIN cases c ON c.case_id = u.case_id
     LEFT JOIN client_profiles cp ON cp.user_id = c.client_id
     LEFT JOIN users usr ON usr.user_id = u.uploaded_by
     LEFT JOIN lawyer_profiles lp ON lp.user_id = u.uploaded_by
     LEFT JOIN client_profiles cp_uploader ON cp_uploader.user_id = u.uploaded_by`,
    [documentId, visibleTo],
  );

  const updated = rows[0];
  if (!updated) throw new Error("Failed to update document visibility.");
  return mapRow(updated);
}

export async function createCaseDocument(
  userId: string,
  role: "client" | "lawyer",
  input: CreateCaseDocumentInput,
): Promise<CaseDocument> {
  await assertCaseAccess(input.caseId, userId, role);

  const title = input.title.trim();
  const fileName = input.fileName.trim();
  const fileUrl = input.fileUrl.trim();

  if (!title) throw new Error("Document title is required.");
  if (!fileName) throw new Error("File name is required.");
  if (!fileUrl) throw new Error("File URL is required.");

  const visibleTo =
    input.visibleTo ?? (role === "lawyer" ? "both" : "both");

  const pool = getPool();
  const { rows } = await pool.query<DocumentRow>(
    `WITH inserted AS (
       INSERT INTO case_documents (
         case_id, uploaded_by, title, file_name, file_url,
         mime_type, file_size_bytes, visible_to, notes
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8::case_event_visibility, $9
       )
       RETURNING *
     )
     SELECT
       i.document_id,
       i.case_id,
       c.title AS case_title,
       COALESCE(cp.full_name, 'Client') AS client_name,
       i.uploaded_by,
       COALESCE(lp.full_name, cp_uploader.full_name, u.email, 'User') AS uploader_name,
       i.title,
       i.file_name,
       i.file_url,
       i.mime_type,
       i.file_size_bytes,
       i.visible_to,
       i.notes,
       i.created_at
     FROM inserted i
     INNER JOIN cases c ON c.case_id = i.case_id
     LEFT JOIN client_profiles cp ON cp.user_id = c.client_id
     LEFT JOIN users u ON u.user_id = i.uploaded_by
     LEFT JOIN lawyer_profiles lp ON lp.user_id = i.uploaded_by
     LEFT JOIN client_profiles cp_uploader ON cp_uploader.user_id = i.uploaded_by`,
    [
      input.caseId,
      userId,
      title,
      fileName,
      fileUrl,
      input.mimeType?.trim() || null,
      input.fileSizeBytes ?? null,
      visibleTo,
      input.notes?.trim() || null,
    ],
  );

  const row = rows[0];
  if (!row) throw new Error("Failed to save document.");
  return mapRow(row);
}

export async function deleteCaseDocument(
  documentId: string,
  userId: string,
  role: "client" | "lawyer",
): Promise<void> {
  const pool = getPool();
  const access = await pool.query<{
    uploaded_by: string;
    client_id: string;
    lawyer_id: string;
  }>(
    `SELECT cd.uploaded_by, c.client_id, c.lawyer_id
     FROM case_documents cd
     INNER JOIN cases c ON c.case_id = cd.case_id
     WHERE cd.document_id = $1`,
    [documentId],
  );

  const row = access.rows[0];
  if (!row) throw new Error("Document not found.");

  const isParty =
    role === "client" ? row.client_id === userId : row.lawyer_id === userId;
  if (!isParty) throw new Error("Forbidden.");

  // Lawyers can delete any case doc; clients only their own uploads
  if (role === "client" && row.uploaded_by !== userId) {
    throw new Error("You can only delete documents you uploaded.");
  }

  await pool.query(`DELETE FROM case_documents WHERE document_id = $1`, [
    documentId,
  ]);
}
