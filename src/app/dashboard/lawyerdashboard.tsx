"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  Gavel,
  Scale,
} from "lucide-react";
import type { CaseDetail, CaseListItem } from "@/lib/cases";
import type { CaseRequest } from "@/lib/case-requests";
import type { ClientCaseEvent } from "@/lib/case-events";
import { formatEventWhen } from "@/lib/format-event-date";
import type { SessionPayload } from "@/lib/session";
import {
  acceptCaseRequest,
  cancelCaseRequest,
  fetchCaseRequests,
} from "@/lib/case-requests-api";
import { fetchCaseDetail, fetchCases } from "@/lib/cases-api";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { CaseProgressTimeline } from "@/components/dashboard/case-progress-timeline";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LawyerDashboardProps = {
  session: SessionPayload;
};

function greetingName(email: string): string {
  const local = email.split("@")[0] ?? "counselor";
  const name = local.split(/[._-]/)[0] ?? local;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatRequestMeta(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Submitted just now";
  if (hours < 24) return `Submitted ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Submitted yesterday" : `Submitted ${days}d ago`;
}

function statusClass(status: CaseListItem["status"]): string {
  switch (status) {
    case "active":
      return "bg-primary/20 text-secondary";
    case "on_hold":
      return "bg-neutral/10 text-neutral/60";
    default:
      return "bg-neutral/10 text-neutral/60";
  }
}

export function LawyerDashboard({ session }: LawyerDashboardProps) {
  const [requests, setRequests] = useState<CaseRequest[]>([]);
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [hearings, setHearings] = useState<ClientCaseEvent[]>([]);
  const [milestoneCase, setMilestoneCase] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, caseList] = await Promise.all([
        fetchCaseRequests({ scope: "pending" }),
        fetchCases(),
      ]);
      setRequests(reqs);
      setCases(caseList);

      const active = caseList.filter((c) => c.status === "active");
      if (active.length > 0) {
        const detail = await fetchCaseDetail(active[0].caseId);
        setMilestoneCase(detail);
      } else {
        setMilestoneCase(null);
      }

      const eventsRes = await fetch("/api/events", { credentials: "include" });
      if (eventsRes.ok) {
        const data = (await eventsRes.json()) as { events: ClientCaseEvent[] };
        setHearings(
          data.events
            .filter((e) => e.eventType === "hearing" && e.status === "scheduled")
            .slice(0, 5),
        );
      }
    } catch {
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAccept(requestId: string) {
    setActionId(requestId);
    try {
      const { caseId } = await acceptCaseRequest(requestId);
      toast.success("Case accepted");
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

  const firstName = greetingName(session.email);
  const activeCases = cases.filter((c) => c.status === "active");
  const nextHearing = hearings[0];

  const overviewStats = [
    {
      label: "Pending requests",
      value: loading ? "…" : String(requests.length),
      icon: Gavel,
    },
    {
      label: "Active cases",
      value: loading ? "…" : String(activeCases.length),
      icon: Briefcase,
    },
    {
      label: "Hearings",
      value: loading ? "…" : String(hearings.length),
      icon: CalendarDays,
    },
  ] as const;

  return (
    <DashboardShell session={session} activeItem="Home" showSupport={false}>
      <div className="dashboard-home mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        <header className="mb-6">
          <p className="text-[11px] font-medium tracking-[0.16em] text-neutral/45 uppercase">
            Advocate dashboard
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-secondary sm:text-4xl">
            Home
          </h1>
        </header>

        <section className="home-outer mb-6" aria-label="Overview">
          <div className="home-outer-body">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
              <div className="home-inner flex flex-1 flex-col justify-center p-5 sm:p-6 lg:p-7">
                <p className="home-subtle text-[11px] font-medium tracking-[0.18em] uppercase">
                  {formatToday()}
                </p>
                <h2 className="mt-3 font-serif text-2xl font-medium tracking-tight text-secondary sm:text-3xl">
                  Welcome, {firstName}
                </h2>
                <p className="home-muted mt-3 text-sm leading-relaxed sm:text-base">
                  Review new requests, manage active matters, and stay ahead of hearings.
                </p>
                {requests.length > 0 ? (
                  <p className="mt-2 text-sm text-primary">
                    {requests.length} request{requests.length === 1 ? "" : "s"} need your
                    response.
                  </p>
                ) : null}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/requests"
                    className={cn(
                      buttonVariants({ variant: "default", size: "default" }),
                      "inline-flex bg-primary text-secondary hover:bg-primary/90",
                    )}
                  >
                    <Gavel className="size-4" aria-hidden />
                    View requests
                  </Link>
                  <Link
                    href="/dashboard/cases"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "default" }),
                      "inline-flex border-[color-mix(in_srgb,var(--secondary)_18%,transparent)] text-secondary hover:bg-[color-mix(in_srgb,var(--primary)_10%,white)]",
                    )}
                  >
                    Active cases
                  </Link>
                </div>
              </div>

              {nextHearing ? (
                <Link
                  href="/dashboard/cases"
                  className="home-inner home-inner-featured group flex min-w-0 flex-col justify-between p-5 sm:min-w-[16rem] sm:max-w-xs lg:shrink-0 lg:p-6"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="home-icon size-9">
                      <Scale className="size-4" aria-hidden />
                    </span>
                    <span className="home-pill">Next hearing</span>
                  </div>
                  <div className="mt-6">
                    <p className="home-accent text-[11px] uppercase tracking-wide">
                      {nextHearing.startsAt
                        ? new Date(nextHearing.startsAt)
                            .toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                            .toUpperCase()
                        : "TBD"}
                    </p>
                    <p className="mt-2 font-serif text-xl font-medium text-secondary line-clamp-2">
                      {nextHearing.title}
                    </p>
                    <p className="home-muted mt-2 text-sm">{nextHearing.caseTitle}</p>
                    <p className="home-subtle mt-1 text-xs">
                      {formatEventWhen(nextHearing.startsAt)}
                    </p>
                  </div>
                  <span className="home-accent mt-5 inline-flex items-center gap-1 text-xs transition group-hover:gap-1.5">
                    Open case
                    <ChevronRight className="size-3.5" aria-hidden />
                  </span>
                </Link>
              ) : (
                <div className="home-inner flex min-w-0 flex-col justify-center p-5 sm:min-w-[16rem] sm:max-w-xs lg:shrink-0 lg:p-6">
                  <p className="home-muted text-sm">No upcoming hearings scheduled.</p>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              {overviewStats.map((stat) => (
                <div key={stat.label} className="home-inner p-4 sm:p-5">
                  <div className="home-muted flex items-center gap-1.5">
                    <stat.icon className="size-3.5 shrink-0 text-primary" aria-hidden />
                    <span className="truncate text-[10px] font-medium tracking-wide uppercase sm:text-[11px]">
                      {stat.label}
                    </span>
                  </div>
                  <p className="home-stat-value mt-2">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <p className="home-muted text-sm">Loading dashboard…</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7 xl:col-span-8">
              <section className="home-outer" aria-labelledby="case-requests-heading">
                <div className="home-outer-header">
                  <h2 id="case-requests-heading" className="home-outer-title">
                    Case requests
                  </h2>
                  <div className="flex items-center gap-2">
                    {requests.length > 0 ? (
                      <span className="rounded bg-rose-500/90 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                        Action needed
                      </span>
                    ) : null}
                    <Link
                      href="/dashboard/requests"
                      className="home-outer-link inline-flex items-center gap-0.5"
                    >
                      View all
                      <ChevronRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>

                <div className="home-outer-body-tight">
                  {requests.length === 0 ? (
                    <div className="home-inner px-6 py-10 text-center">
                      <span className="home-icon mx-auto size-12">
                        <Gavel className="size-5" aria-hidden />
                      </span>
                      <p className="mt-4 text-sm font-medium text-secondary">
                        No pending requests
                      </p>
                      <p className="home-muted mt-1 text-xs">
                        New client requests will appear here for review.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3" role="list">
                      {requests.map((request) => (
                        <li key={request.requestId}>
                          <div className="home-inner-interactive flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="home-icon size-10 shrink-0">
                                <Gavel className="size-4" aria-hidden />
                              </span>
                              <div className="min-w-0">
                                <p className="font-medium text-secondary">{request.title}</p>
                                <p className="home-muted mt-0.5 text-sm">
                                  {request.clientName} · {formatRequestMeta(request.createdAt)}
                                </p>
                                {request.requestedLawyerId === session.userId ? (
                                  <span className="home-pill mt-2">Directed to you</span>
                                ) : null}
                                <p className="home-subtle mt-2 line-clamp-2 text-xs">
                                  {request.briefDescription}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <Button
                                className="h-9 bg-primary px-5 text-secondary hover:bg-primary/90"
                                disabled={actionId != null}
                                onClick={() => void handleAccept(request.requestId)}
                              >
                                Accept
                              </Button>
                              <Button
                                variant="outline"
                                className="h-9 border-[color-mix(in_srgb,var(--secondary)_18%,transparent)] text-secondary hover:bg-[color-mix(in_srgb,var(--primary)_10%,white)]"
                                disabled={actionId != null}
                                onClick={() => void handleDecline(request.requestId)}
                              >
                                Decline
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <section className="home-outer" aria-labelledby="active-cases-heading">
                <div className="home-outer-header">
                  <h2 id="active-cases-heading" className="home-outer-title">
                    Active case files
                  </h2>
                  <Link
                    href="/dashboard/cases"
                    className="home-outer-link inline-flex items-center gap-0.5"
                  >
                    View all
                    <ChevronRight className="size-3.5" aria-hidden />
                  </Link>
                </div>

                <div className="home-outer-body-tight">
                  {activeCases.length === 0 ? (
                    <div className="home-inner px-6 py-10 text-center">
                      <span className="home-icon mx-auto size-12">
                        <Briefcase className="size-5" aria-hidden />
                      </span>
                      <p className="mt-4 text-sm font-medium text-secondary">
                        No active cases yet
                      </p>
                      <p className="home-muted mt-1 text-xs">
                        Accepted requests will appear here as active matters.
                      </p>
                    </div>
                  ) : (
                    <div className="home-inner overflow-x-auto">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-[var(--home-border-soft)] text-[11px] tracking-wide text-neutral/50 uppercase">
                            <th className="px-4 pb-3 pt-4 font-medium">Case</th>
                            <th className="pb-3 font-medium">Client</th>
                            <th className="pb-3 font-medium">Milestone</th>
                            <th className="pr-4 pb-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeCases.map((caseItem) => (
                            <tr
                              key={caseItem.caseId}
                              className="border-b border-[var(--home-border-soft)] last:border-0"
                            >
                              <td className="px-4 py-4 font-medium text-secondary">
                                <Link
                                  href={`/dashboard/cases/${caseItem.caseId}`}
                                  className="hover:text-primary"
                                >
                                  {caseItem.title}
                                </Link>
                              </td>
                              <td className="py-4 text-neutral/80">{caseItem.clientName}</td>
                              <td className="py-4 text-neutral/80">
                                {caseItem.currentStageTitle ?? "—"}
                              </td>
                              <td className="pr-4 py-4">
                                <span
                                  className={cn(
                                    "rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                                    statusClass(caseItem.status),
                                  )}
                                >
                                  {caseItem.status.replace("_", " ")}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-6 lg:col-span-5 xl:col-span-4">
              <section className="home-outer" aria-labelledby="hearings-heading">
                <div className="home-outer-header">
                  <h2 id="hearings-heading" className="home-outer-title">
                    Upcoming hearings
                  </h2>
                  <Link
                    href="/dashboard/cases"
                    className="home-outer-link inline-flex items-center gap-0.5"
                  >
                    Manage
                    <ChevronRight className="size-3.5" aria-hidden />
                  </Link>
                </div>

                <div className="home-outer-body-tight">
                  {hearings.length === 0 ? (
                    <div className="home-inner px-4 py-8 text-center">
                      <p className="home-muted text-sm">No upcoming hearings scheduled.</p>
                    </div>
                  ) : (
                    <ul className="space-y-3" role="list">
                      {hearings.map((hearing) => (
                        <li key={hearing.eventId}>
                          <Link
                            href={`/dashboard/cases/${hearing.caseId}`}
                            className="home-inner-interactive block p-4 sm:p-5"
                          >
                            <p className="home-accent text-[11px] font-semibold tracking-widest uppercase">
                              {hearing.startsAt
                                ? new Date(hearing.startsAt)
                                    .toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                    })
                                    .toUpperCase()
                                : "TBD"}
                            </p>
                            <p className="mt-2 font-medium text-secondary">{hearing.title}</p>
                            <p className="home-muted mt-1 text-sm">{hearing.caseTitle}</p>
                            {hearing.location ? (
                              <p className="home-subtle mt-0.5 text-xs">{hearing.location}</p>
                            ) : null}
                            <p className="home-subtle mt-1 text-xs">
                              {formatEventWhen(hearing.startsAt)}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <section className="home-outer" aria-labelledby="milestones-heading">
                <div className="home-outer-header">
                  <h2 id="milestones-heading" className="home-outer-title">
                    Case milestone progression
                  </h2>
                </div>

                <div className="home-outer-body-tight">
                  <div className="home-inner p-5 sm:p-6">
                    {milestoneCase ? (
                      <>
                        <p className="home-muted mb-4 text-sm">{milestoneCase.title}</p>
                        <CaseProgressTimeline stages={milestoneCase.stages} />
                        <Link
                          href={`/dashboard/cases/${milestoneCase.caseId}`}
                          className="home-accent mt-4 inline-flex items-center gap-1 text-sm"
                        >
                          Open case details
                          <ChevronRight className="size-3.5" aria-hidden />
                        </Link>
                      </>
                    ) : (
                      <p className="home-muted text-sm">
                        Accept a request to view case milestones.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
