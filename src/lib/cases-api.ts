import type { CaseDetail, CaseListItem, CaseStage } from "@/lib/cases";
import type { StageAction } from "@/lib/case-stages";
import type { ClientCaseEvent, CreateCaseEventInput } from "@/lib/case-events";

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const body = JSON.parse(text) as { error?: string; message?: string };
    if (body.error) return body.error;
    if (body.message) return body.message;
  } catch {
    /* not JSON */
  }
  if (res.status === 401) return "Please sign in again.";
  if (res.status === 403) return "You do not have access to this case.";
  if (res.status === 404) return "Case not found.";
  if (text.trim()) return text.slice(0, 240);
  return `Request failed (${res.status}).`;
}

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

export async function fetchCases(): Promise<CaseListItem[]> {
  const res = await fetch("/api/cases", fetchOpts);
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { cases: CaseListItem[] };
  return data.cases;
}

export async function fetchCaseDetail(caseId: string): Promise<CaseDetail> {
  const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}`, fetchOpts);
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { case?: CaseDetail; caseDetail?: CaseDetail };
  const detail = data.caseDetail ?? data.case;
  if (!detail) throw new Error("Invalid case response from server.");
  return detail;
}

export async function addCaseStage(
  caseId: string,
  input: { title: string; description?: string | null },
): Promise<CaseStage[]> {
  const res = await fetch(
    `/api/cases/${encodeURIComponent(caseId)}/stages`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { stages: CaseStage[] };
  return data.stages;
}

export async function removeCaseStage(
  caseId: string,
  stageId: string,
): Promise<CaseStage[]> {
  const res = await fetch(
    `/api/cases/${encodeURIComponent(caseId)}/stages/${encodeURIComponent(stageId)}`,
    {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { stages: CaseStage[] };
  return data.stages;
}

export async function advanceCaseStage(
  caseId: string,
  stageId: string,
  action: StageAction,
  note?: string,
): Promise<CaseStage[]> {
  const res = await fetch(
    `/api/cases/${encodeURIComponent(caseId)}/stages/${encodeURIComponent(stageId)}`,
    {
      method: "PATCH",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { stages: CaseStage[] };
  return data.stages;
}

export async function fetchCaseEvents(caseId: string): Promise<ClientCaseEvent[]> {
  const res = await fetch(
    `/api/cases/${encodeURIComponent(caseId)}/events`,
    fetchOpts,
  );
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { events: ClientCaseEvent[] };
  return data.events;
}

export async function recordDemoMeeting(
  caseId: string,
  summary: string,
): Promise<ClientCaseEvent> {
  const res = await fetch(
    `/api/cases/${encodeURIComponent(caseId)}/demo-meeting`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary }),
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { event: ClientCaseEvent };
  return data.event;
}

export async function createCaseEvent(
  caseId: string,
  input: CreateCaseEventInput,
): Promise<ClientCaseEvent> {
  const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/events`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { event: ClientCaseEvent };
  return data.event;
}
