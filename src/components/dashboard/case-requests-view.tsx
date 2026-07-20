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
      return "bg-amber-500/15 text-amber-300";
    case "accepted":
      return "bg-emerald-500/15 text-emerald-300";
    default:
      return "bg-muted text-muted-foreground";
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
    <div className="mx-auto">
      {role === "client" ? (
        <header className="mb-8 flex justify-end">
          <Link
            href="/dashboard/requests/new"
            className={cn(buttonVariants({ variant: "default" }), "inline-flex gap-2")}
          >
            <Plus className="size-4" aria-hidden />
            New request
          </Link>
        </header>
      ) : null}

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
                "rounded-full px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                active
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted",
              )}
            >
              {tab.label}
              {count > 0 ? (
                <span className={cn("ml-1.5", active ? "text-background/70" : "text-muted-foreground")}>
                  ({count})
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading requests…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="dashboard-card-muted flex flex-col items-center px-6 py-16 text-center">
          <Inbox className="size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-medium text-foreground">
            {filter === "all"
              ? "No requests yet"
              : `No ${filter === "cancelled" ? "declined" : filter} requests`}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
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
              className={cn(buttonVariants(), "mt-6")}
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
              className="dashboard-card flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="dashboard-icon-wrap size-10 shrink-0">
                  <Gavel className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{req.title}</p>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        statusBadgeClass(req.status),
                      )}
                    >
                      {statusLabel(req.status, role)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {role === "lawyer"
                      ? `${req.clientName} · ${formatWhen(req.createdAt)}`
                      : formatWhen(req.createdAt)}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {req.briefDescription}
                  </p>
                  {role === "client" ? (
                    req.requestedLawyerName ? (
                      <p className="mt-2 text-xs font-medium text-primary">
                        Sent to {req.requestedLawyerName}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">Open to any advocate</p>
                    )
                  ) : req.requestedLawyerId === lawyerUserId ? (
                    <span className="mt-2 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                      Sent to you
                    </span>
                  ) : req.requestedLawyerId ? null : (
                    <p className="mt-2 text-xs text-muted-foreground">Open pool request</p>
                  )}
                  {req.specialConditions ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Note: {req.specialConditions}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
                {role === "lawyer" && req.status === "pending" ? (
                  <>
                    <Button
                      className="h-9 px-5"
                      disabled={actionId != null}
                      onClick={() => void handleAccept(req.requestId)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 px-5"
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
