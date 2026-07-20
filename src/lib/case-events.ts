import { getPool } from "@/lib/db";
import { assertLawyerOwnsCase } from "@/lib/cases";

export type CaseEventType =
  | "hearing"
  | "meeting"
  | "deadline"
  | "document_required"
  | "filing_update"
  | "status_update"
  | "reminder"
  | "general_note";

export type CaseEventPriority = "normal" | "high" | "urgent";
export type CaseEventStatus = "scheduled" | "completed" | "cancelled";
export type CaseEventVisibility = "client_only" | "lawyer_only" | "both";

export type ClientCaseEvent = {
  eventId: string;
  caseId: string;
  caseTitle: string;
  lawyerName: string;
  clientName?: string | null;
  eventType: CaseEventType;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  priority: CaseEventPriority;
  status: CaseEventStatus;
  createdAt: string;
};

export type CreateCaseEventInput = {
  eventType: CaseEventType;
  title: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
  priority?: CaseEventPriority;
  status?: CaseEventStatus;
  visibleTo?: CaseEventVisibility;
};

type CaseEventRow = {
  event_id: string;
  case_id: string;
  case_title: string;
  lawyer_name: string;
  client_name?: string | null;
  event_type: CaseEventType;
  title: string;
  description: string | null;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  location: string | null;
  priority: CaseEventPriority;
  status: CaseEventStatus;
  created_at: Date | string;
};

export const EVENT_TYPE_LABELS: Record<CaseEventType, string> = {
  hearing: "Hearing",
  meeting: "Meeting",
  deadline: "Deadline",
  document_required: "Document required",
  filing_update: "Filing update",
  status_update: "Status update",
  reminder: "Reminder",
  general_note: "Note",
};

export const EVENT_STATUS_LABELS: Record<CaseEventStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const EVENT_PRIORITY_LABELS: Record<CaseEventPriority, string> = {
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

function toIso(value: Date | string | null): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapRow(row: CaseEventRow): ClientCaseEvent {
  return {
    eventId: row.event_id,
    caseId: row.case_id,
    caseTitle: row.case_title,
    lawyerName: row.lawyer_name,
    clientName: row.client_name ?? null,
    eventType: row.event_type,
    title: row.title,
    description: row.description,
    startsAt: toIso(row.starts_at),
    endsAt: toIso(row.ends_at),
    location: row.location,
    priority: row.priority,
    status: row.status,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
  };
}

const CLIENT_EVENT_SELECT = `
  ce.event_id,
  ce.case_id,
  c.title AS case_title,
  COALESCE(lp.full_name, 'Assigned counsel') AS lawyer_name,
  ce.event_type,
  ce.title,
  ce.description,
  ce.starts_at,
  ce.ends_at,
  ce.location,
  ce.priority,
  ce.status,
  ce.created_at
`;

const CLIENT_EVENT_FROM = `
  FROM case_events ce
  INNER JOIN cases c ON c.case_id = ce.case_id
  LEFT JOIN lawyer_profiles lp ON lp.user_id = c.lawyer_id
`;

export async function getClientCaseEvents(
  clientId: string,
): Promise<ClientCaseEvent[]> {
  const pool = getPool();
  const { rows } = await pool.query<CaseEventRow>(
    `SELECT ${CLIENT_EVENT_SELECT}
     ${CLIENT_EVENT_FROM}
     WHERE c.client_id = $1
       AND ce.visible_to IN ('client_only', 'both')
     ORDER BY
       CASE WHEN ce.status = 'scheduled' THEN 0 ELSE 1 END,
       ce.starts_at ASC NULLS LAST,
       ce.created_at DESC`,
    [clientId],
  );

  return rows.map(mapRow);
}

export async function getUpcomingClientEvents(
  clientId: string,
  limit = 3,
): Promise<ClientCaseEvent[]> {
  const pool = getPool();
  const { rows } = await pool.query<CaseEventRow>(
    `SELECT ${CLIENT_EVENT_SELECT}
     ${CLIENT_EVENT_FROM}
     WHERE c.client_id = $1
       AND ce.visible_to IN ('client_only', 'both')
       AND ce.status = 'scheduled'
       AND (ce.starts_at IS NULL OR ce.starts_at >= NOW())
     ORDER BY ce.starts_at ASC NULLS LAST, ce.created_at DESC
     LIMIT $2`,
    [clientId, limit],
  );

  return rows.map(mapRow);
}

export async function getCaseEventsForUser(
  caseId: string,
  userId: string,
  role: "client" | "lawyer",
): Promise<ClientCaseEvent[]> {
  const pool = getPool();

  const accessClause = role === "client" ? "c.client_id = $2" : "c.lawyer_id = $2";
  const visibilityClause =
    role === "client"
      ? "ce.visible_to IN ('client_only', 'both')"
      : "ce.visible_to IN ('lawyer_only', 'both')";

  const { rows } = await pool.query<CaseEventRow>(
    `SELECT ${CLIENT_EVENT_SELECT}
     ${CLIENT_EVENT_FROM}
     WHERE ce.case_id = $1 AND ${accessClause} AND ${visibilityClause}
     ORDER BY ce.starts_at ASC NULLS LAST, ce.created_at DESC`,
    [caseId, userId],
  );

  return rows.map(mapRow);
}

export async function listLawyerUpcomingHearings(
  lawyerId: string,
  limit = 5,
): Promise<ClientCaseEvent[]> {
  const pool = getPool();
  const { rows } = await pool.query<CaseEventRow>(
    `SELECT ${CLIENT_EVENT_SELECT},
            COALESCE(cp.full_name, 'Client') AS client_name
     ${CLIENT_EVENT_FROM}
     LEFT JOIN client_profiles cp ON cp.user_id = c.client_id
     WHERE c.lawyer_id = $1
       AND ce.event_type = 'hearing'
       AND ce.status = 'scheduled'
       AND (ce.starts_at IS NULL OR ce.starts_at >= NOW())
     ORDER BY ce.starts_at ASC NULLS LAST
     LIMIT $2`,
    [lawyerId, limit],
  );

  return rows.map(mapRow);
}

const LAWYER_EVENT_SELECT = `
  ce.event_id,
  ce.case_id,
  c.title AS case_title,
  COALESCE(lp.full_name, 'Assigned counsel') AS lawyer_name,
  COALESCE(cp.full_name, 'Client') AS client_name,
  ce.event_type,
  ce.title,
  ce.description,
  ce.starts_at,
  ce.ends_at,
  ce.location,
  ce.priority,
  ce.status,
  ce.created_at
`;

export async function getLawyerCaseEvents(
  lawyerId: string,
): Promise<ClientCaseEvent[]> {
  const pool = getPool();
  const { rows } = await pool.query<CaseEventRow>(
    `SELECT ${LAWYER_EVENT_SELECT}
     FROM case_events ce
     INNER JOIN cases c ON c.case_id = ce.case_id
     LEFT JOIN lawyer_profiles lp ON lp.user_id = c.lawyer_id
     LEFT JOIN client_profiles cp ON cp.user_id = c.client_id
     WHERE c.lawyer_id = $1
       AND ce.visible_to IN ('lawyer_only', 'both')
     ORDER BY
       CASE WHEN ce.status = 'scheduled' THEN 0 ELSE 1 END,
       ce.starts_at ASC NULLS LAST,
       ce.created_at DESC`,
    [lawyerId],
  );

  return rows.map(mapRow);
}

export async function recordDemoMeeting(
  caseId: string,
  userId: string,
  role: "client" | "lawyer",
  summary: string,
  options?: { startedAtMs?: number | null; endedAtMs?: number | null },
): Promise<ClientCaseEvent> {
  const pool = getPool();
  const access = await pool.query<{
    client_id: string;
    lawyer_id: string;
    title: string;
  }>(`SELECT client_id, lawyer_id, title FROM cases WHERE case_id = $1`, [caseId]);

  const row = access.rows[0];
  if (!row) throw new Error("Case not found.");

  const allowed =
    role === "client" ? row.client_id === userId : row.lawyer_id === userId;
  if (!allowed) throw new Error("Forbidden.");

  const endedAt = options?.endedAtMs
    ? new Date(options.endedAtMs)
    : new Date();
  const startedAt = options?.startedAtMs
    ? new Date(options.startedAtMs)
    : new Date(endedAt.getTime() - 60 * 1000);
  const title = `Video consultation — ${row.title}`;

  const { rows } = await pool.query<CaseEventRow>(
    `WITH inserted AS (
       INSERT INTO case_events (
         case_id, created_by, event_type, title, description,
         starts_at, ends_at, location, priority, status, visible_to
       ) VALUES (
         $1, $2, 'meeting'::case_event_type, $3, $4,
         $5, $6, 'Lawway video call', 'normal'::case_event_priority,
         'completed'::case_event_status, 'both'::case_event_visibility
       )
       RETURNING *
     )
     SELECT
       i.event_id,
       i.case_id,
       c.title AS case_title,
       COALESCE(lp.full_name, 'Assigned counsel') AS lawyer_name,
       i.event_type,
       i.title,
       i.description,
       i.starts_at,
       i.ends_at,
       i.location,
       i.priority,
       i.status,
       i.created_at
     FROM inserted i
     INNER JOIN cases c ON c.case_id = i.case_id
     LEFT JOIN lawyer_profiles lp ON lp.user_id = c.lawyer_id`,
    [
      caseId,
      userId,
      title,
      summary.trim(),
      startedAt.toISOString(),
      endedAt.toISOString(),
    ],
  );

  const eventRow = rows[0];
  if (!eventRow) throw new Error("Failed to record meeting.");
  return mapRow(eventRow);
}

export async function createCaseEvent(
  lawyerId: string,
  caseId: string,
  input: CreateCaseEventInput,
): Promise<ClientCaseEvent> {
  await assertLawyerOwnsCase(caseId, lawyerId);

  const title = input.title.trim();
  if (!title) throw new Error("Event title is required.");

  const visibleTo =
    input.visibleTo ??
    (["hearing", "deadline", "meeting", "document_required"].includes(
      input.eventType,
    )
      ? "both"
      : "client_only");

  const pool = getPool();
  const { rows } = await pool.query<CaseEventRow>(
    `WITH inserted AS (
       INSERT INTO case_events (
         case_id, created_by, event_type, title, description,
         starts_at, ends_at, location, priority, status, visible_to
       ) VALUES (
         $1, $2, $3::case_event_type, $4, $5,
         $6, $7, $8, $9::case_event_priority, $10::case_event_status, $11::case_event_visibility
       )
       RETURNING *
     )
     SELECT
       i.event_id,
       i.case_id,
       c.title AS case_title,
       COALESCE(lp.full_name, 'Assigned counsel') AS lawyer_name,
       i.event_type,
       i.title,
       i.description,
       i.starts_at,
       i.ends_at,
       i.location,
       i.priority,
       i.status,
       i.created_at
     FROM inserted i
     INNER JOIN cases c ON c.case_id = i.case_id
     LEFT JOIN lawyer_profiles lp ON lp.user_id = c.lawyer_id`,
    [
      caseId,
      lawyerId,
      input.eventType,
      title,
      input.description?.trim() || null,
      input.startsAt ?? null,
      input.endsAt ?? null,
      input.location?.trim() || null,
      input.priority ?? "normal",
      input.status ?? "scheduled",
      visibleTo,
    ],
  );

  const row = rows[0];
  if (!row) throw new Error("Failed to create event.");
  return mapRow(row);
}

export type EventTimeFilter = "all" | "upcoming" | "past";

export function filterClientEvents(
  events: ClientCaseEvent[],
  filter: EventTimeFilter,
): ClientCaseEvent[] {
  if (filter === "all") return events;

  const now = Date.now();

  return events.filter((event) => {
    const start = event.startsAt ? new Date(event.startsAt).getTime() : null;
    const isPast =
      event.status === "completed" ||
      event.status === "cancelled" ||
      (start != null && start < now);

    return filter === "past" ? isPast : !isPast;
  });
}
