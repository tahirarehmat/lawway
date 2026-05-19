import { getPool } from "@/lib/db";
import { DEFAULT_CASE_STAGE_TEMPLATE } from "@/lib/case-stage-templates";

export type CaseRequestStatus = "pending" | "accepted" | "cancelled";

export type CaseRequest = {
  requestId: string;
  clientId: string;
  clientName: string;
  requestedLawyerId: string | null;
  requestedLawyerName: string | null;
  title: string;
  briefDescription: string;
  specialConditions: string | null;
  status: CaseRequestStatus;
  acceptedByLawyerId: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  caseId: string | null;
};

type CaseRequestRow = {
  request_id: string;
  client_id: string;
  client_name: string;
  requested_lawyer_id: string | null;
  requested_lawyer_name: string | null;
  title: string;
  brief_description: string;
  special_conditions: string | null;
  status: CaseRequestStatus;
  accepted_by_lawyer_id: string | null;
  accepted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  case_id: string | null;
};

function toIso(value: Date | string | null): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapRequestRow(row: CaseRequestRow): CaseRequest {
  return {
    requestId: row.request_id,
    clientId: row.client_id,
    clientName: row.client_name,
    requestedLawyerId: row.requested_lawyer_id,
    requestedLawyerName: row.requested_lawyer_name,
    title: row.title,
    briefDescription: row.brief_description,
    specialConditions: row.special_conditions,
    status: row.status,
    acceptedByLawyerId: row.accepted_by_lawyer_id,
    acceptedAt: toIso(row.accepted_at),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
    caseId: row.case_id,
  };
}

const REQUEST_SELECT = `
  cr.request_id,
  cr.client_id,
  COALESCE(cp.full_name, 'Client') AS client_name,
  cr.requested_lawyer_id,
  COALESCE(rlp.full_name, NULL) AS requested_lawyer_name,
  cr.title,
  cr.brief_description,
  cr.special_conditions,
  cr.status,
  cr.accepted_by_lawyer_id,
  cr.accepted_at,
  cr.created_at,
  cr.updated_at,
  c.case_id
`;

const REQUEST_FROM = `
  FROM case_requests cr
  LEFT JOIN client_profiles cp ON cp.user_id = cr.client_id
  LEFT JOIN lawyer_profiles rlp ON rlp.user_id = cr.requested_lawyer_id
  LEFT JOIN cases c ON c.request_id = cr.request_id
`;

export type CreateCaseRequestInput = {
  title: string;
  briefDescription: string;
  specialConditions?: string | null;
  requestedLawyerId?: string | null;
};

export async function createCaseRequest(
  clientId: string,
  input: CreateCaseRequestInput,
): Promise<CaseRequest> {
  const pool = getPool();
  const title = input.title.trim();
  const briefDescription = input.briefDescription.trim();
  const specialConditions = input.specialConditions?.trim() || null;

  if (!title || !briefDescription) {
    throw new Error("Title and description are required.");
  }

  let requestedLawyerId = input.requestedLawyerId?.trim() || null;
  if (requestedLawyerId) {
    const lawyerCheck = await pool.query<{ user_id: string }>(
      `SELECT user_id FROM users WHERE user_id = $1 AND role = 'lawyer'`,
      [requestedLawyerId],
    );
    if (lawyerCheck.rows.length === 0) {
      throw new Error("Selected lawyer was not found.");
    }
    if (requestedLawyerId === clientId) {
      throw new Error("You cannot send a request to yourself.");
    }
  }

  const { rows } = await pool.query<CaseRequestRow>(
    `INSERT INTO case_requests (
       client_id, requested_lawyer_id, title, brief_description, special_conditions
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING
       request_id,
       client_id,
       (SELECT full_name FROM client_profiles WHERE user_id = $1) AS client_name,
       requested_lawyer_id,
       (SELECT full_name FROM lawyer_profiles WHERE user_id = $2) AS requested_lawyer_name,
       title,
       brief_description,
       special_conditions,
       status,
       accepted_by_lawyer_id,
       accepted_at,
       created_at,
       updated_at,
       NULL::uuid AS case_id`,
    [clientId, requestedLawyerId, title, briefDescription, specialConditions],
  );

  const row = rows[0];
  if (!row) throw new Error("Failed to create case request.");
  return mapRequestRow(row);
}

export async function listClientRequests(clientId: string): Promise<CaseRequest[]> {
  const pool = getPool();
  const { rows } = await pool.query<CaseRequestRow>(
    `SELECT ${REQUEST_SELECT}
     ${REQUEST_FROM}
     WHERE cr.client_id = $1
     ORDER BY cr.created_at DESC`,
    [clientId],
  );
  return repairOrphanedAcceptedRequests(rows.map(mapRequestRow));
}

export async function listPendingRequestsForLawyer(
  lawyerId: string,
): Promise<CaseRequest[]> {
  const pool = getPool();
  const { rows } = await pool.query<CaseRequestRow>(
    `SELECT ${REQUEST_SELECT}
     ${REQUEST_FROM}
     WHERE cr.status = 'pending'
       AND (cr.requested_lawyer_id IS NULL OR cr.requested_lawyer_id = $1)
     ORDER BY
       CASE WHEN cr.requested_lawyer_id = $1 THEN 0 ELSE 1 END,
       cr.created_at DESC`,
    [lawyerId],
  );
  return rows.map(mapRequestRow);
}

/** Pending inbox plus accepted/declined history visible to this advocate. */
export async function listLawyerRequests(lawyerId: string): Promise<CaseRequest[]> {
  const pool = getPool();
  const { rows } = await pool.query<CaseRequestRow>(
    `SELECT ${REQUEST_SELECT}
     ${REQUEST_FROM}
     WHERE
       (cr.status = 'pending'
         AND (cr.requested_lawyer_id IS NULL OR cr.requested_lawyer_id = $1))
       OR (cr.status = 'accepted' AND cr.accepted_by_lawyer_id = $1)
       OR (cr.status = 'cancelled' AND cr.requested_lawyer_id = $1)
     ORDER BY
       CASE cr.status
         WHEN 'pending' THEN 0
         WHEN 'accepted' THEN 1
         ELSE 2
       END,
       cr.created_at DESC`,
    [lawyerId],
  );
  return repairOrphanedAcceptedRequests(rows.map(mapRequestRow));
}

type PgQueryable = Pick<
  Awaited<ReturnType<ReturnType<typeof getPool>["connect"]>>,
  "query"
>;

export async function seedDefaultCaseStages(
  db: PgQueryable,
  caseId: string,
  lawyerId: string,
): Promise<void> {
  const existing = await db.query<{ n: string }>(
    `SELECT 1 AS n FROM case_stages WHERE case_id = $1 LIMIT 1`,
    [caseId],
  );
  if (existing.rows.length > 0) return;

  let firstStageId: string | null = null;

  for (const template of DEFAULT_CASE_STAGE_TEMPLATE) {
    const stageResult = await db.query<{ stage_id: string }>(
      `INSERT INTO case_stages (
         case_id, title, description, sort_order, status,
         started_at, completed_at
       ) VALUES ($1, $2, $3, $4, $5::case_stage_status, $6, $7)
       RETURNING stage_id`,
      [
        caseId,
        template.title,
        template.description ?? null,
        template.sortOrder,
        template.initialStatus,
        template.initialStatus === "in_progress" ? new Date() : null,
        null,
      ],
    );

    const stageId = stageResult.rows[0]?.stage_id;
    if (!stageId) throw new Error("Failed to create case stage.");

    if (template.sortOrder === 1) {
      firstStageId = stageId;
      await db.query(
        `INSERT INTO case_stage_transitions (
           case_id, stage_id, from_status, to_status, action, changed_by, note
         ) VALUES ($1, $2, NULL, 'in_progress', 'stage_created', $3, 'Case opened')`,
        [caseId, stageId, lawyerId],
      );
      await db.query(
        `INSERT INTO case_stage_transitions (
           case_id, stage_id, from_status, to_status, action, changed_by
         ) VALUES ($1, $2, 'pending', 'in_progress', 'stage_started', $3)`,
        [caseId, stageId, lawyerId],
      );
    } else {
      await db.query(
        `INSERT INTO case_stage_transitions (
           case_id, stage_id, from_status, to_status, action, changed_by, note
         ) VALUES ($1, $2, NULL, 'pending', 'stage_created', $3, NULL)`,
        [caseId, stageId, lawyerId],
      );
    }
  }

  if (firstStageId) {
    await db.query(
      `UPDATE cases SET current_stage_id = $2, updated_at = NOW() WHERE case_id = $1`,
      [caseId, firstStageId],
    );
  }
}

/** Creates a case row for an accepted request that never received one (legacy partial accepts). */
export async function repairAcceptedRequestCase(
  requestId: string,
): Promise<string | null> {
  const pool = getPool();
  const { rows } = await pool.query<{
    request_id: string;
    client_id: string;
    accepted_by_lawyer_id: string | null;
    title: string;
    brief_description: string;
    special_conditions: string | null;
    status: CaseRequestStatus;
  }>(
    `SELECT request_id, client_id, accepted_by_lawyer_id, title, brief_description,
            special_conditions, status
     FROM case_requests
     WHERE request_id = $1`,
    [requestId],
  );

  const request = rows[0];
  if (!request || request.status !== "accepted" || !request.accepted_by_lawyer_id) {
    return null;
  }

  const existing = await pool.query<{ case_id: string }>(
    `SELECT case_id FROM cases WHERE request_id = $1`,
    [requestId],
  );
  if (existing.rows[0]) return existing.rows[0].case_id;

  const caseResult = await pool.query<{ case_id: string }>(
    `INSERT INTO cases (
       request_id, client_id, lawyer_id, title, brief_description, special_conditions
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING case_id`,
    [
      request.request_id,
      request.client_id,
      request.accepted_by_lawyer_id,
      request.title,
      request.brief_description,
      request.special_conditions,
    ],
  );

  const caseId = caseResult.rows[0]?.case_id;
  if (!caseId) return null;

  try {
    await seedDefaultCaseStages(pool, caseId, request.accepted_by_lawyer_id);
  } catch (error) {
    console.error("Repair: failed to seed stages for case", caseId, error);
  }

  return caseId;
}

async function repairOrphanedAcceptedRequests(
  requests: CaseRequest[],
): Promise<CaseRequest[]> {
  const repaired = await Promise.all(
    requests.map(async (req) => {
      if (req.status !== "accepted" || req.caseId) return req;
      const caseId = await repairAcceptedRequestCase(req.requestId);
      return caseId ? { ...req, caseId } : req;
    }),
  );
  return repaired;
}

export async function acceptCaseRequest(
  requestId: string,
  lawyerId: string,
): Promise<{ caseId: string }> {
  const pool = getPool();

  const existingCase = await pool.query<{ case_id: string }>(
    `SELECT case_id FROM cases WHERE request_id = $1`,
    [requestId],
  );
  if (existingCase.rows[0]?.case_id) {
    const caseId = existingCase.rows[0].case_id;
    try {
      await seedDefaultCaseStages(pool, caseId, lawyerId);
    } catch (error) {
      console.error("Failed to seed stages for existing case", caseId, error);
    }
    return { caseId };
  }

  const client = await pool.connect();
  let caseId: string;

  try {
    await client.query("BEGIN");

    const requestResult = await client.query<{
      request_id: string;
      client_id: string;
      requested_lawyer_id: string | null;
      status: CaseRequestStatus;
      accepted_by_lawyer_id: string | null;
      title: string;
      brief_description: string;
      special_conditions: string | null;
    }>(
      `SELECT request_id, client_id, requested_lawyer_id, status,
              accepted_by_lawyer_id, title, brief_description, special_conditions
       FROM case_requests
       WHERE request_id = $1
       FOR UPDATE`,
      [requestId],
    );

    const request = requestResult.rows[0];
    if (!request) {
      throw new Error("Request not found.");
    }

    if (request.status === "cancelled") {
      throw new Error("This request was declined or cancelled.");
    }

    if (request.client_id === lawyerId) {
      throw new Error("You cannot accept your own request.");
    }

    if (
      request.requested_lawyer_id &&
      request.requested_lawyer_id !== lawyerId
    ) {
      throw new Error("This request was sent to another advocate.");
    }

    if (request.status === "accepted") {
      if (request.accepted_by_lawyer_id !== lawyerId) {
        throw new Error("This request was already accepted by another advocate.");
      }
    } else if (request.status === "pending") {
      await client.query(
        `UPDATE case_requests
         SET status = 'accepted', accepted_by_lawyer_id = $2, accepted_at = NOW(), updated_at = NOW()
         WHERE request_id = $1`,
        [requestId, lawyerId],
      );
    } else {
      throw new Error("Request cannot be accepted.");
    }

    const caseResult = await client.query<{ case_id: string }>(
      `INSERT INTO cases (
         request_id, client_id, lawyer_id, title, brief_description, special_conditions
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING case_id`,
      [
        request.request_id,
        request.client_id,
        lawyerId,
        request.title,
        request.brief_description,
        request.special_conditions,
      ],
    );

    caseId = caseResult.rows[0]?.case_id ?? "";
    if (!caseId) throw new Error("Failed to create case.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  try {
    await seedDefaultCaseStages(pool, caseId, lawyerId);
  } catch (error) {
    console.error("Case created but stage seeding failed:", caseId, error);
  }

  return { caseId };
}

export async function cancelCaseRequest(
  requestId: string,
  actorId: string,
  role: "client" | "lawyer",
): Promise<CaseRequest> {
  const pool = getPool();

  if (role === "client") {
    const updateResult = await pool.query(
      `UPDATE case_requests
       SET status = 'cancelled'
       WHERE request_id = $1 AND client_id = $2 AND status = 'pending'`,
      [requestId, actorId],
    );
    if (updateResult.rowCount === 0) {
      throw new Error("Request not found or cannot be cancelled.");
    }
  } else {
    const updateResult = await pool.query(
      `UPDATE case_requests
       SET status = 'cancelled'
       WHERE request_id = $1
         AND status = 'pending'
         AND (requested_lawyer_id IS NULL OR requested_lawyer_id = $2)`,
      [requestId, actorId],
    );
    if (updateResult.rowCount === 0) {
      throw new Error("Request not found or cannot be declined.");
    }
  }

  const { rows } = await pool.query<CaseRequestRow>(
    `SELECT ${REQUEST_SELECT} ${REQUEST_FROM} WHERE cr.request_id = $1`,
    [requestId],
  );

  const row = rows[0];
  if (!row) throw new Error("Request not found after cancel.");
  return mapRequestRow(row);
}
