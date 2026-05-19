import type { CaseRequest } from "@/lib/case-requests";

export type CreateCaseRequestBody = {
  title: string;
  briefDescription: string;
  specialConditions?: string | null;
  requestedLawyerId?: string | null;
};

async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Request failed.";
}

export type FetchCaseRequestsOptions = {
  /** Lawyer dashboard inbox: pending only. Default returns full lawyer history. */
  scope?: "pending" | "all";
};

export async function fetchCaseRequests(
  options?: FetchCaseRequestsOptions,
): Promise<CaseRequest[]> {
  const params =
    options?.scope === "pending" ? "?scope=pending" : "";
  const res = await fetch(`/api/requests${params}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { requests: CaseRequest[] };
  return data.requests;
}

export async function createCaseRequest(
  body: CreateCaseRequestBody,
): Promise<CaseRequest> {
  const res = await fetch("/api/requests", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { request: CaseRequest };
  return data.request;
}

export async function acceptCaseRequest(
  requestId: string,
): Promise<{ caseId: string }> {
  const res = await fetch(`/api/requests/${requestId}/accept`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { caseId: string };
}

export async function cancelCaseRequest(requestId: string): Promise<CaseRequest> {
  const res = await fetch(`/api/requests/${requestId}/cancel`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { request: CaseRequest };
  return data.request;
}
