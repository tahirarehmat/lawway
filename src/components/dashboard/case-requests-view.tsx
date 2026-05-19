"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Gavel, Inbox, Plus } from "lucide-react";
import type { CaseRequest, CaseRequestStatus } from "@/lib/case-requests";
import {
  acceptCaseRequest,
  cancelCaseRequest,
  fetchCaseRequests,
} from "@/lib/case-requests-api";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CaseRequestsViewProps = {
  role: "client" | "lawyer";
  lawyerUserId?: string;
};

type FilterTab = "all" | CaseRequestStatus;

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "cancelled", label: "Declined" },
];

function formatWhen(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

function statusLabel(status: CaseRequestStatus, role: "client" | "lawyer"): string {
  if (status === "cancelled") return role === "lawyer" ? "Declined" : "Cancelled";
  if (status === "accepted") return "Accepted";
  return "Pending";
}

function statusBadgeClass(status: CaseRequestStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-900";
    case "accepted":
      return "bg-emerald-100 text-emerald-900";
    default:
      return "bg-neutral/15 text-neutral/70";
  }
}

export function CaseRequestsView({ role, lawyerUserId }: CaseRequestsViewProps) {
  const [requests, setRequests] = useState<CaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCaseRequests({ scope: "all" });
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const counts = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending").length;
    const accepted = requests.filter((r) => r.status === "accepted").length;
    const declined = requests.filter((r) => r.status === "cancelled").length;
    return { all: requests.length, pending, accepted, declined };
  }, [requests]);

  async function handleAccept(requestId: string) {
    setActionId(requestId);
    try {
      const { caseId } = await acceptCaseRequest(requestId);
      toast.success("Request accepted — case file created");
      await load();
      if (caseId) {
        window.location.href = `/dashboard/cases/${caseId}`;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept.");
    } finally {
      setActionId(null);
    }
  }

  async function handleDecline(requestId: string) {
    setActionId(requestId);
    try {
      await cancelCaseRequest(requestId);
      toast.success("Request declined");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline.");
    } finally {
      setActionId(null);
    }
  }

  async function handleClientCancel(requestId: string) {
    setActionId(requestId);
    try {
      await cancelCaseRequest(requestId);
      toast.success("Request cancelled");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-[0.16em] text-neutral/45 uppercase">
            {role === "client" ? "Your submissions" : "Client inbox"}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-secondary">
            Requests
          </h1>
          <p className="mt-2 text-sm text-neutral/65">
            {role === "client"
              ? "Track pending, accepted, and declined case requests."
              : "Review incoming matters and accept or decline client requests."}
          </p>
        </div>
        {role === "client" ? (
          <Link
            href="/dashboard/requests/new"
            className={cn(
              buttonVariants({ variant: "default" }),
              "inline-flex gap-2 bg-primary text-secondary hover:bg-primary/90",
            )}
          >
            <Plus className="size-4" aria-hidden />
            New request
          </Link>
        ) : null}
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count =
            tab.id === "all"
              ? counts.all
              : tab.id === "pending"
                ? counts.pending
                : tab.id === "accepted"
                  ? counts.accepted
                  : counts.declined;
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition",
                active
                  ? "bg-secondary text-white"
                  : "bg-white text-neutral/70 ring-1 ring-black/8 hover:bg-tertiary",
              )}
            >
              {tab.label}
              {count > 0 ? (
                <span className={cn("ml-1.5", active ? "text-white/80" : "text-neutral/45")}>
                  ({count})
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-neutral/55">Loading requests…</p>
      ) : error ? (
        <p className="text-sm text-rose-700">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="dashboard-card-muted flex flex-col items-center px-6 py-14 text-center">
          <Inbox className="size-10 text-neutral/35" aria-hidden />
          <p className="mt-4 font-medium text-secondary">
            {filter === "all"
              ? "No requests yet"
              : `No ${filter === "cancelled" ? "declined" : filter} requests`}
          </p>
          <p className="mt-1 max-w-sm text-sm text-neutral/55">
            {role === "client"
              ? filter === "all"
                ? "Submit a case request from Search or create a new matter."
                : "Requests will appear here when their status changes."
              : filter === "all"
                ? "New client requests will show up here for review."
                : "Nothing in this category right now."}
          </p>
          {role === "client" && filter === "all" ? (
            <Link
              href="/dashboard/requests/new"
              className={cn(
                buttonVariants(),
                "mt-6 bg-primary text-secondary hover:bg-primary/90",
              )}
            >
              Submit a request
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((req) => (
            <li
              key={req.requestId}
              className="dashboard-card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-tertiary text-secondary">
                  <Gavel className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-secondary">{req.title}</p>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        statusBadgeClass(req.status),
                      )}
                    >
                      {statusLabel(req.status, role)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral/60">
                    {role === "lawyer"
                      ? `${req.clientName} · ${formatWhen(req.createdAt)}`
                      : formatWhen(req.createdAt)}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-neutral/65">
                    {req.briefDescription}
                  </p>
                  {role === "client" ? (
                    req.requestedLawyerName ? (
                      <p className="mt-2 text-xs font-medium text-primary">
                        Sent to {req.requestedLawyerName}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-neutral/50">Open to any advocate</p>
                    )
                  ) : req.requestedLawyerId === lawyerUserId ? (
                    <span className="mt-2 inline-block rounded bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                      Sent to you
                    </span>
                  ) : req.requestedLawyerId ? null : (
                    <p className="mt-2 text-xs text-neutral/50">Open pool request</p>
                  )}
                  {req.specialConditions ? (
                    <p className="mt-2 text-xs text-neutral/50">
                      Note: {req.specialConditions}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
                {role === "lawyer" && req.status === "pending" ? (
                  <>
                    <Button
                      className="h-9 bg-secondary px-5 text-white hover:bg-secondary/90"
                      disabled={actionId != null}
                      onClick={() => void handleAccept(req.requestId)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 border-secondary/30 px-5 text-secondary hover:bg-tertiary"
                      disabled={actionId != null}
                      onClick={() => void handleDecline(req.requestId)}
                    >
                      Decline
                    </Button>
                  </>
                ) : null}
                {role === "client" && req.status === "pending" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={actionId != null}
                    onClick={() => void handleClientCancel(req.requestId)}
                    className="border-black/10"
                  >
                    Cancel request
                  </Button>
                ) : null}
                {req.status === "accepted" && req.caseId ? (
                  <Link
                    href={`/dashboard/cases/${req.caseId}`}
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    View case file →
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
