import { getPool, type DbClient } from "@/lib/db";
import { assertLawyerOwnsCase, type CaseStage, type CaseStageStatus } from "@/lib/cases";

export type StageAction = "stage_started" | "stage_completed" | "stage_skipped";

const ACTION_TO_STATUS: Record<StageAction, CaseStageStatus> = {
  stage_started: "in_progress",
  stage_completed: "completed",
  stage_skipped: "skipped",
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

function mapStageRow(row: CaseStageRow): CaseStage {
  return {
    stageId: row.stage_id,
    caseId: row.case_id,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    status: row.status,
    startedAt: toIso(row.started_at),
    completedAt: toIso(row.completed_at),
  };
}

export async function advanceStage(
  caseId: string,
  stageId: string,
  lawyerId: string,
  action: StageAction,
  note?: string | null,
): Promise<CaseStage[]> {
  await assertLawyerOwnsCase(caseId, lawyerId);

  const pool = getPool();
  const client = (await pool.connect()) as DbClient;
  const toStatus = ACTION_TO_STATUS[action];

  try {
    await client.query("BEGIN");

    const stageResult = await client.query<{
      stage_id: string;
      status: CaseStageStatus;
      sort_order: number;
    }>(
      `SELECT stage_id, status, sort_order
       FROM case_stages
       WHERE stage_id = $1 AND case_id = $2
       FOR UPDATE`,
      [stageId, caseId],
    );

    const stage = stageResult.rows[0];
    if (!stage) throw new Error("Stage not found.");

    const fromStatus = stage.status;

    if (action === "stage_started" && fromStatus !== "pending") {
      throw new Error("Only pending stages can be started.");
    }
    if (action === "stage_completed" && fromStatus !== "in_progress") {
      throw new Error("Only in-progress stages can be completed.");
    }
    if (action === "stage_skipped" && fromStatus === "completed") {
      throw new Error("Completed stages cannot be skipped.");
    }

    if (action === "stage_started") {
      await client.query(
        `UPDATE case_stages SET status = 'pending'
         WHERE case_id = $1 AND status = 'in_progress' AND stage_id <> $2`,
        [caseId, stageId],
      );
    }

    const startedAt = action === "stage_started" ? new Date() : null;
    const completedAt =
      action === "stage_completed" || action === "stage_skipped"
        ? new Date()
        : null;

    await client.query(
      `UPDATE case_stages
       SET status = $3::case_stage_status,
           started_at = COALESCE(started_at, $4),
           completed_at = COALESCE($5, completed_at)
       WHERE stage_id = $1 AND case_id = $2`,
      [stageId, caseId, toStatus, startedAt, completedAt],
    );

    await client.query(
      `INSERT INTO case_stage_transitions (
         case_id, stage_id, from_status, to_status, action, changed_by, note
       ) VALUES ($1, $2, $3, $4::case_stage_status, $5::case_stage_action, $6, $7)`,
      [caseId, stageId, fromStatus, toStatus, action, lawyerId, note ?? null],
    );

    if (action === "stage_completed") {
      const nextResult = await client.query<{ stage_id: string }>(
        `SELECT stage_id FROM case_stages
         WHERE case_id = $1 AND sort_order > $2 AND status = 'pending'
         ORDER BY sort_order ASC
         LIMIT 1`,
        [caseId, stage.sort_order],
      );

      const nextStageId = nextResult.rows[0]?.stage_id;
      if (nextStageId) {
        await client.query(
          `UPDATE case_stages
           SET status = 'in_progress', started_at = COALESCE(started_at, NOW())
           WHERE stage_id = $1`,
          [nextStageId],
        );
        await client.query(
          `INSERT INTO case_stage_transitions (
             case_id, stage_id, from_status, to_status, action, changed_by, note
           ) VALUES ($1, $2, 'pending', 'in_progress', 'moved_forward', $3, 'Auto-advanced')`,
          [caseId, nextStageId, lawyerId],
        );
        await client.query(
          `UPDATE cases SET current_stage_id = $2, updated_at = NOW() WHERE case_id = $1`,
          [caseId, nextStageId],
        );
      } else {
        await client.query(
          `UPDATE cases SET current_stage_id = $2, updated_at = NOW() WHERE case_id = $1`,
          [caseId, stageId],
        );
      }
    } else if (action === "stage_started") {
      await client.query(
        `UPDATE cases SET current_stage_id = $2, updated_at = NOW() WHERE case_id = $1`,
        [caseId, stageId],
      );
    }

    const allStages = await client.query<CaseStageRow>(
      `SELECT stage_id, case_id, title, description, sort_order, status, started_at, completed_at
       FROM case_stages WHERE case_id = $1 ORDER BY sort_order ASC`,
      [caseId],
    );

    await client.query("COMMIT");
    return allStages.rows.map(mapStageRow);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listStagesForCase(
  client: DbClient,
  caseId: string,
): Promise<CaseStage[]> {
  const allStages = await client.query<CaseStageRow>(
    `SELECT stage_id, case_id, title, description, sort_order, status, started_at, completed_at
     FROM case_stages WHERE case_id = $1 ORDER BY sort_order ASC`,
    [caseId],
  );
  return allStages.rows.map(mapStageRow);
}

export async function addCaseStage(
  caseId: string,
  lawyerId: string,
  input: { title: string; description?: string | null },
): Promise<CaseStage[]> {
  await assertLawyerOwnsCase(caseId, lawyerId);

  const title = input.title.trim();
  if (!title) throw new Error("Stage title is required.");

  const pool = getPool();
  const client = (await pool.connect()) as DbClient;

  try {
    await client.query("BEGIN");

    const orderResult = await client.query<{ next_order: number }>(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
       FROM case_stages WHERE case_id = $1`,
      [caseId],
    );
    const sortOrder = Number(orderResult.rows[0]?.next_order ?? 1);

    const insertResult = await client.query<{ stage_id: string }>(
      `INSERT INTO case_stages (case_id, title, description, sort_order, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING stage_id`,
      [caseId, title, input.description?.trim() || null, sortOrder],
    );

    const stageId = insertResult.rows[0]?.stage_id;
    if (!stageId) throw new Error("Failed to add stage.");

    await client.query(
      `INSERT INTO case_stage_transitions (
         case_id, stage_id, from_status, to_status, action, changed_by, note
       ) VALUES ($1, $2, NULL, 'pending', 'stage_created', $3, 'Custom stage added')`,
      [caseId, stageId, lawyerId],
    );

    await client.query(
      `UPDATE cases SET updated_at = NOW() WHERE case_id = $1`,
      [caseId],
    );

    const stages = await listStagesForCase(client, caseId);
    await client.query("COMMIT");
    return stages;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function removeCaseStage(
  caseId: string,
  stageId: string,
  lawyerId: string,
): Promise<CaseStage[]> {
  await assertLawyerOwnsCase(caseId, lawyerId);

  const pool = getPool();
  const client = (await pool.connect()) as DbClient;

  try {
    await client.query("BEGIN");

    const stageResult = await client.query<{ status: CaseStageStatus }>(
      `SELECT status FROM case_stages
       WHERE stage_id = $1 AND case_id = $2
       FOR UPDATE`,
      [stageId, caseId],
    );

    const stage = stageResult.rows[0];
    if (!stage) throw new Error("Stage not found.");
    if (stage.status !== "pending") {
      throw new Error(
        "Only upcoming stages that have not started can be removed.",
      );
    }

    await client.query(
      `DELETE FROM case_stages WHERE stage_id = $1 AND case_id = $2`,
      [stageId, caseId],
    );

    await client.query(
      `UPDATE cases
       SET current_stage_id = (
         SELECT stage_id FROM case_stages
         WHERE case_id = $1 AND status = 'in_progress'
         ORDER BY sort_order ASC
         LIMIT 1
       ),
       updated_at = NOW()
       WHERE case_id = $1 AND current_stage_id = $2`,
      [caseId, stageId],
    );

    const stages = await listStagesForCase(client, caseId);
    await client.query("COMMIT");
    return stages;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
