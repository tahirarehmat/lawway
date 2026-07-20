import { getPool } from "@/lib/db";
import {
  repairAcceptedRequestCase,
  seedDefaultCaseStages,
} from "@/lib/case-requests";

export type CaseStatus = "active" | "on_hold" | "closed";
export type CaseStageStatus = "pending" | "in_progress" | "completed" | "skipped";

export type CaseListItem = {
  caseId: string;
  title: string;
  status: CaseStatus;
  clientId: string;
  clientName: string;
  lawyerId: string;
  lawyerName: string;
  currentStageTitle: string | null;
  currentStageStatus: CaseStageStatus | null;
  openedAt: string;
  updatedAt: string;
};

export type CaseStage = {
  stageId: string;
  caseId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  status: CaseStageStatus;
  startedAt: string | null;
  completedAt: string | null;
};

export type CaseDetail = {
  caseId: string;
  requestId: string;
  title: string;
  briefDescription: string;
  specialConditions: string | null;
  status: CaseStatus;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  lawyerId: string;
  lawyerName: string;
  currentStageId: string | null;
  openedAt: string;
  closedAt: string | null;
  stages: CaseStage[];
};

type CaseListRow = {
  case_id: string;
  title: string;
  status: CaseStatus;
  client_id: string;
  client_name: string;
  lawyer_id: string;
  lawyer_name: string;
  current_stage_title: string | null;
  current_stage_status: CaseStageStatus | null;
  opened_at: Date | string;
  updated_at: Date | string;
};

type CaseStageRow = {
  stage_id: string;
  case_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  status: CaseStageStatus;
  started_at: Date | string | null;
  completed_at: Date | string | null;
};

function toIso(value: Date | string | null): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function asId(value: string | { toString(): string }): string {
  return typeof value === "string" ? value : value.toString();
}

function mapListRow(row: CaseListRow): CaseListItem {
  return {
    caseId: asId(row.case_id),
    title: row.title,
    status: row.status,
    clientId: asId(row.client_id),
    clientName: row.client_name,
    lawyerId: asId(row.lawyer_id),
    lawyerName: row.lawyer_name,
    currentStageTitle: row.current_stage_title,
    currentStageStatus: row.current_stage_status,
    openedAt: toIso(row.opened_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapStageRow(row: CaseStageRow): CaseStage {
  return {
    stageId: asId(row.stage_id),
    caseId: asId(row.case_id),
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    status: row.status,
    startedAt: toIso(row.started_at),
    completedAt: toIso(row.completed_at),
  };
}

const CASE_LIST_SELECT = `
  c.case_id,
  c.title,
  c.status,
  c.client_id,
  COALESCE(cp.full_name, 'Client') AS client_name,
  c.lawyer_id,
  COALESCE(lp.full_name, 'Assigned counsel') AS lawyer_name,
  cs.title AS current_stage_title,
  cs.status AS current_stage_status,
  c.opened_at,
  c.updated_at
`;

const CASE_LIST_FROM = `
  FROM cases c
  LEFT JOIN client_profiles cp ON cp.user_id = c.client_id
  LEFT JOIN lawyer_profiles lp ON lp.user_id = c.lawyer_id
  LEFT JOIN case_stages cs ON cs.stage_id = c.current_stage_id
`;

/** Backfill case rows for accepted requests that never got a case file. */
async function repairOrphanedCasesForUser(
  userId: string,
  role: "client" | "lawyer",
): Promise<void> {
  const pool = getPool();
  const filter =
    role === "client" ? "cr.client_id = $1" : "cr.accepted_by_lawyer_id = $1";

  try {
    const { rows } = await pool.query<{ request_id: string }>(
      `SELECT cr.request_id
       FROM case_requests cr
       LEFT JOIN cases c ON c.request_id = cr.request_id
       WHERE ${filter}
         AND cr.status = 'accepted'
         AND c.case_id IS NULL`,
      [userId],
    );

    await Promise.all(
      rows.map(async (row) => {
        try {
          await repairAcceptedRequestCase(row.request_id);
        } catch (error) {
          console.error("Repair orphaned case failed:", row.request_id, error);
        }
      }),
    );
  } catch (error) {
    console.error("repairOrphanedCasesForUser failed:", error);
  }
}

export async function listClientCases(clientId: string): Promise<CaseListItem[]> {
  await repairOrphanedCasesForUser(clientId, "client");
  const pool = getPool();
  const { rows } = await pool.query<CaseListRow>(
    `SELECT ${CASE_LIST_SELECT}
     ${CASE_LIST_FROM}
     WHERE c.client_id = $1
     ORDER BY c.updated_at DESC`,
    [clientId],
  );
  return rows.map(mapListRow);
}

export async function listLawyerCases(lawyerId: string): Promise<CaseListItem[]> {
  await repairOrphanedCasesForUser(lawyerId, "lawyer");
  const pool = getPool();
  const { rows } = await pool.query<CaseListRow>(
    `SELECT ${CASE_LIST_SELECT}
     ${CASE_LIST_FROM}
     WHERE c.lawyer_id = $1
     ORDER BY c.updated_at DESC`,
    [lawyerId],
  );
  return rows.map(mapListRow);
}

export async function assertCaseAccess(
  caseId: string,
  userId: string,
  role: "client" | "lawyer",
): Promise<void> {
  const pool = getPool();
  const { rows } = await pool.query<{ client_id: string; lawyer_id: string }>(
    `SELECT client_id, lawyer_id FROM cases WHERE case_id = $1`,
    [caseId],
  );

  const row = rows[0];
  if (!row) throw new Error("Case not found.");

  const allowed =
    role === "client" ? row.client_id === userId : row.lawyer_id === userId;

  if (!allowed) throw new Error("Forbidden.");
}

export async function getCaseDetail(
  caseId: string,
  userId: string,
  role: "client" | "lawyer",
): Promise<CaseDetail> {
  await assertCaseAccess(caseId, userId, role);

  const pool = getPool();
  const caseResult = await pool.query<{
    case_id: string;
    request_id: string;
    title: string;
    brief_description: string;
    special_conditions: string | null;
    status: CaseStatus;
    client_id: string;
    client_name: string;
    client_email: string | null;
    lawyer_id: string;
    lawyer_name: string;
    current_stage_id: string | null;
    opened_at: Date | string;
    closed_at: Date | string | null;
  }>(
    `SELECT
      c.case_id,
      c.request_id,
      c.title,
      c.brief_description,
      c.special_conditions,
      c.status,
      c.client_id,
      COALESCE(cp.full_name, 'Client') AS client_name,
      uc.email AS client_email,
      c.lawyer_id,
      COALESCE(lp.full_name, 'Assigned counsel') AS lawyer_name,
      c.current_stage_id,
      c.opened_at,
      c.closed_at
    FROM cases c
    LEFT JOIN client_profiles cp ON cp.user_id = c.client_id
    LEFT JOIN users uc ON uc.user_id = c.client_id
    LEFT JOIN lawyer_profiles lp ON lp.user_id = c.lawyer_id
    WHERE c.case_id = $1`,
    [caseId],
  );

  const caseRow = caseResult.rows[0];
  if (!caseRow) throw new Error("Case not found.");

  let stagesResult = await pool.query<CaseStageRow>(
    `SELECT stage_id, case_id, title, description, sort_order, status, started_at, completed_at
     FROM case_stages
     WHERE case_id = $1
     ORDER BY sort_order ASC`,
    [caseId],
  );

  if (stagesResult.rows.length === 0) {
    try {
      await seedDefaultCaseStages(pool, caseId, caseRow.lawyer_id);
      stagesResult = await pool.query<CaseStageRow>(
        `SELECT stage_id, case_id, title, description, sort_order, status, started_at, completed_at
         FROM case_stages
         WHERE case_id = $1
         ORDER BY sort_order ASC`,
        [caseId],
      );
    } catch (error) {
      console.error("Failed to seed stages for case", caseId, error);
    }
  }

  return {
    caseId: asId(caseRow.case_id),
    requestId: asId(caseRow.request_id),
    title: caseRow.title,
    briefDescription: caseRow.brief_description,
    specialConditions: caseRow.special_conditions,
    status: caseRow.status,
    clientId: asId(caseRow.client_id),
    clientName: caseRow.client_name,
    clientEmail: caseRow.client_email,
    lawyerId: asId(caseRow.lawyer_id),
    lawyerName: caseRow.lawyer_name,
    currentStageId: caseRow.current_stage_id
      ? asId(caseRow.current_stage_id)
      : null,
    openedAt: toIso(caseRow.opened_at) ?? new Date().toISOString(),
    closedAt: toIso(caseRow.closed_at),
    stages: stagesResult.rows.map(mapStageRow),
  };
}

export async function assertLawyerOwnsCase(
  caseId: string,
  lawyerId: string,
): Promise<void> {
  await assertCaseAccess(caseId, lawyerId, "lawyer");
}
