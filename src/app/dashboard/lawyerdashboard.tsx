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
import {
  ACCENTS,
  BarList,
  DonutChart,
  Sparkline,
  StatCard,
  type ChartDatum,
} from "@/components/dashboard/dashboard-charts";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LawyerDashboardProps = {
  session: SessionPayload;
};

const CASE_STATUS_META: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: ACCENTS.emerald.base },
  on_hold: { label: "On hold", color: ACCENTS.amber.base },
  closed: { label: "Closed", color: ACCENTS.violet.base },
};

const DEMO_CASE_STATUS: ChartDatum[] = [
  { label: "Active", value: 5, color: ACCENTS.emerald.base },
  { label: "On hold", value: 2, color: ACCENTS.amber.base },
  { label: "Closed", value: 4, color: ACCENTS.violet.base },
];

const DEMO_PIPELINE: ChartDatum[] = [
  { label: "Pending requests", value: 3, color: ACCENTS.amber.base },
  { label: "Active cases", value: 5, color: ACCENTS.emerald.base },
  { label: "Hearings", value: 2, color: ACCENTS.sky.base },
];

const DEMO_REQUESTS_TREND = [1, 0, 2, 1, 3, 0, 2];

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
      return "bg-primary/15 text-foreground";
    case "on_hold":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
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
      accent: "amber" as const,
    },
    {
      label: "Active cases",
      value: loading ? "…" : String(activeCases.length),
      icon: Briefcase,
      accent: "emerald" as const,
    },
    {
      label: "Hearings",
      value: loading ? "…" : String(hearings.length),
      icon: CalendarDays,
      accent: "sky" as const,
    },
  ];

  const caseStatusData: ChartDatum[] = Object.entries(
    cases.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([status, value]) => ({
    label: CASE_STATUS_META[status]?.label ?? status.replace("_", " "),
    value,
    color: CASE_STATUS_META[status]?.color ?? ACCENTS.gold.base,
  }));

  const pipelineData: ChartDatum[] = [
    { label: "Pending requests", value: requests.length, color: ACCENTS.amber.base },
    { label: "Active cases", value: activeCases.length, color: ACCENTS.emerald.base },
    { label: "Hearings", value: hearings.length, color: ACCENTS.sky.base },
  ];

  const requestsTrend = (() => {
    const days = 7;
    const counts = new Array(days).fill(0);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    requests.forEach((r) => {
      const d = new Date(r.createdAt);
      d.setHours(0, 0, 0, 0);
      const idx = Math.round((d.getTime() - start.getTime()) / 86400000);
      if (idx >= 0 && idx < days) counts[idx] += 1;
    });
    return counts as number[];
  })();

  const caseloadData =
    caseStatusData.length >= 2 ? caseStatusData : DEMO_CASE_STATUS;
  const caseloadTotal = caseloadData.reduce((sum, d) => sum + d.value, 0);
  const pipelineChartData =
    pipelineData.some((d) => d.value > 0) ? pipelineData : DEMO_PIPELINE;
  const trendData =
    requestsTrend.some((n) => n > 0) ? requestsTrend : DEMO_REQUESTS_TREND;

  return (
    <DashboardShell session={session} activeItem="Home" showSupport={false}>
      <div className="dashboard-home mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        <section className="mb-6" aria-label="Overview">
          <div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
              <div className="home-hero flex flex-1 flex-col justify-center p-6 sm:p-7 lg:p-8">
                <p className="home-subtle text-[11px] font-medium tracking-[0.18em] uppercase">
                  {formatToday()}
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
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
                      "inline-flex",
                    )}
                  >
                    <Gavel className="size-4" aria-hidden />
                    View requests
                  </Link>
                  <Link
                    href="/dashboard/cases"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "default" }),
                      "inline-flex",
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
                    <p className="mt-2 text-xl font-semibold tracking-tight text-foreground line-clamp-2">
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

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {overviewStats.map((stat) => (
                <StatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  icon={stat.icon}
                  accent={stat.accent}
                />
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <p className="home-muted text-sm">Loading dashboard…</p>
        ) : (
          <>
            <div className="mb-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <section className="home-outer" aria-labelledby="case-mix-heading">
                <div className="home-outer-header">
                  <h2 id="case-mix-heading" className="home-outer-title">
                    Caseload
                  </h2>
                  <span className="home-subtle text-xs">By status</span>
                </div>
                <div className="home-outer-body">
                  <DonutChart
                    data={caseloadData}
                    centerValue={String(caseloadTotal)}
                    centerLabel="Cases"
                  />
                </div>
              </section>

              <section className="home-outer" aria-labelledby="pipeline-heading">
                <div className="home-outer-header">
                  <h2 id="pipeline-heading" className="home-outer-title">
                    Practice pipeline
                  </h2>
                  <span className="home-subtle text-xs">Current</span>
                </div>
                <div className="home-outer-body">
                  <BarList data={pipelineChartData} />
                </div>
              </section>

              <section
                className="home-outer md:col-span-2 xl:col-span-1"
                aria-labelledby="trend-heading"
              >
                <div className="home-outer-header">
                  <h2 id="trend-heading" className="home-outer-title">
                    New requests
                  </h2>
                  <span className="home-subtle text-xs">Last 7 days</span>
                </div>
                <div className="home-outer-body">
                  <div className="flex items-baseline gap-2">
                    <span className="home-stat-value">{requests.length}</span>
                    <span className="home-muted text-sm">pending</span>
                  </div>
                  <Sparkline
                    points={trendData}
                    color={ACCENTS.rose.base}
                    className="mt-3"
                  />
                </div>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7 xl:col-span-8">
              <section className="home-outer" aria-labelledby="case-requests-heading">
                <div className="home-outer-header">
                  <h2 id="case-requests-heading" className="home-outer-title">
                    Case requests
                  </h2>
                  <div className="flex items-center gap-2">
                    {requests.length > 0 ? (
                      <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-red-300 uppercase">
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
                      <p className="mt-4 text-sm font-medium text-foreground">
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
                                <p className="font-medium text-foreground">{request.title}</p>
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
                                className="h-9 px-5"
                                disabled={actionId != null}
                                onClick={() => void handleAccept(request.requestId)}
                              >
                                Accept
                              </Button>
                              <Button
                                variant="outline"
                                className="h-9"
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
                      <p className="mt-4 text-sm font-medium text-foreground">
                        No active cases yet
                      </p>
                      <p className="home-muted mt-1 text-xs">
                        Accepted requests will appear here as active matters.
                      </p>
                    </div>
                  ) : (
                    <div className="home-inner divide-y divide-border overflow-hidden">
                      {activeCases.map((caseItem) => (
                        <Link
                          key={caseItem.caseId}
                          href={`/dashboard/cases/${caseItem.caseId}`}
                          className="group flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-muted"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground group-hover:text-primary">
                              {caseItem.title}
                            </p>
                            <p className="mt-0.5 truncate text-sm text-muted-foreground">
                              {caseItem.clientName}
                              {" · "}
                              {caseItem.currentStageTitle ?? "—"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                              statusClass(caseItem.status),
                            )}
                          >
                            {caseItem.status.replace("_", " ")}
                          </span>
                        </Link>
                      ))}
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
                            <p className="mt-2 font-medium text-foreground">{hearing.title}</p>
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
          </>
        )}
      </div>
    </DashboardShell>
  );
}
