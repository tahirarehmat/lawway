"use client";

import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  ChevronRight,
  LifeBuoy,
  Scale,
  Search,
  Sparkles,
} from "lucide-react";
import type { CaseListItem } from "@/lib/cases";
import type { ClientCaseEvent } from "@/lib/case-events";
import { EVENT_TYPE_LABELS } from "@/lib/case-events";
import { formatDaysUntil, formatEventWhen } from "@/lib/format-event-date";
import type { SessionPayload } from "@/lib/session";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClientDashboardProps = {
  session: SessionPayload;
  cases: CaseListItem[];
  upcomingEvents: ClientCaseEvent[];
  pendingRequestCount: number;
};

const QUICK_LINKS = [
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/tickets", label: "Support", icon: LifeBuoy },
] as const;

function greetingName(email: string): string {
  const local = email.split("@")[0] ?? "there";
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

function relativeUpdated(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Updated just now";
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Updated yesterday" : `Updated ${days} days ago`;
}

export function ClientDashboard({
  session,
  cases,
  upcomingEvents,
  pendingRequestCount,
}: ClientDashboardProps) {
  const firstName = greetingName(session.email);
  const activeCases = cases.filter((c) => c.status === "active");
  const nextHearing = upcomingEvents.find((e) => e.eventType === "hearing") ?? upcomingEvents[0];
  const nextHearingDays = nextHearing ? formatDaysUntil(nextHearing.startsAt) : null;
  const uniqueLawyers = new Set(activeCases.map((c) => c.lawyerId)).size;

  const overviewStats = [
    { label: "Active cases", value: String(activeCases.length), icon: Briefcase },
    {
      label: "Next hearing",
      value: nextHearingDays ?? "—",
      icon: CalendarDays,
    },
    { label: "Advocates", value: String(uniqueLawyers), icon: Scale },
  ] as const;

  return (
    <DashboardShell session={session} activeItem="Home">
      <div className="dashboard-home mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        <header className="mb-6">
          <p className="text-[11px] font-medium tracking-[0.16em] text-neutral/45 uppercase">
            Client dashboard
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
                  Hello, {firstName}
                </h2>
                <p className="home-muted mt-3 text-sm leading-relaxed sm:text-base">
                  Your cases, hearings, and legal team in one place.
                </p>
                {pendingRequestCount > 0 ? (
                  <p className="mt-2 text-sm text-primary">
                    {pendingRequestCount} request{pendingRequestCount === 1 ? "" : "s"} awaiting
                    advocate review.
                  </p>
                ) : null}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/search"
                    className={cn(
                      buttonVariants({ variant: "default", size: "default" }),
                      "inline-flex bg-primary text-secondary hover:bg-primary/90",
                    )}
                  >
                    <Search className="size-4" aria-hidden />
                    Find a lawyer
                  </Link>
                  <Link
                    href="/dashboard/events"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "default" }),
                      "inline-flex border-[color-mix(in_srgb,var(--secondary)_18%,transparent)] text-secondary hover:bg-[color-mix(in_srgb,var(--primary)_10%,white)]",
                    )}
                  >
                    View events
                  </Link>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {QUICK_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className="home-chip">
                      <link.icon className="size-3.5 text-primary" aria-hidden />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {nextHearing ? (
                <Link
                  href="/dashboard/events"
                  className="home-inner home-inner-featured group flex min-w-0 flex-col justify-between p-5 sm:min-w-[16rem] sm:max-w-xs lg:shrink-0 lg:p-6"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="home-icon size-9">
                      <CalendarDays className="size-4" aria-hidden />
                    </span>
                    <span className="home-pill">Up next</span>
                  </div>
                  <div className="mt-6">
                    <p className="home-accent text-[11px] uppercase tracking-wide">
                      {EVENT_TYPE_LABELS[nextHearing.eventType]}
                    </p>
                    <p className="mt-2 font-serif text-3xl font-medium text-secondary">
                      {nextHearingDays ?? "Soon"}
                    </p>
                    <p className="home-muted mt-2 text-sm leading-snug line-clamp-2">
                      {nextHearing.title}
                    </p>
                    <p className="home-subtle mt-1 text-xs">{nextHearing.caseTitle}</p>
                  </div>
                  <span className="home-accent mt-5 inline-flex items-center gap-1 text-xs transition group-hover:gap-1.5">
                    See all events
                    <ArrowRight className="size-3.5" aria-hidden />
                  </span>
                </Link>
              ) : (
                <div className="home-inner flex min-w-0 flex-col justify-center p-5 sm:min-w-[16rem] sm:max-w-xs lg:shrink-0 lg:p-6">
                  <p className="home-muted text-sm">No upcoming events scheduled.</p>
                  <Link href="/dashboard/requests/new" className="home-accent mt-3 text-xs">
                    Submit a case request
                  </Link>
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

        <div className="grid gap-6 lg:grid-cols-12">
          <section
            className="home-outer lg:col-span-7 xl:col-span-8"
            aria-labelledby="active-cases-heading"
          >
            <div className="home-outer-header">
              <h2 id="active-cases-heading" className="home-outer-title">
                Active cases
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
              {activeCases.length > 0 ? (
                <ul className="space-y-3" role="list">
                  {activeCases.map((caseItem) => (
                    <li key={caseItem.caseId}>
                      <Link
                        href={`/dashboard/cases/${caseItem.caseId}`}
                        className="home-inner-interactive group flex gap-4 p-4 sm:p-5"
                      >
                        <span
                          className="mt-0.5 w-1 shrink-0 self-stretch rounded-full bg-primary"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-start justify-between gap-2">
                            <span>
                              <span className="mt-1 block font-medium text-secondary">
                                {caseItem.title}
                              </span>
                            </span>
                            <span className="home-pill shrink-0 capitalize">
                              {caseItem.currentStageTitle ?? caseItem.status}
                            </span>
                          </span>
                          <span className="home-muted mt-3 block text-xs">
                            {caseItem.lawyerName}
                            <span className="mx-2 opacity-40">·</span>
                            {relativeUpdated(caseItem.updatedAt)}
                          </span>
                        </span>
                        <ChevronRight
                          className="mt-1 size-4 shrink-0 text-primary/30 transition group-hover:text-primary"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="home-inner px-6 py-14 text-center">
                  <span className="home-icon mx-auto size-12">
                    <Briefcase className="size-5" aria-hidden />
                  </span>
                  <p className="mt-4 text-sm font-medium text-secondary">No active cases</p>
                  <p className="home-muted mt-1 text-xs">
                    Submit a request or connect with an advocate to open your first matter.
                  </p>
                  <Link
                    href="/dashboard/requests/new"
                    className={cn(
                      buttonVariants({ variant: "default", size: "default" }),
                      "mt-5 inline-flex bg-primary text-secondary hover:bg-primary/90",
                    )}
                  >
                    New case request
                  </Link>
                </div>
              )}
            </div>
          </section>

          <aside className="flex flex-col gap-6 lg:col-span-5 xl:col-span-4">
            <section className="home-outer" aria-labelledby="upcoming-events-heading">
              <div className="home-outer-header">
                <h2 id="upcoming-events-heading" className="home-outer-title">
                  Coming up
                </h2>
                <Link href="/dashboard/events" className="home-outer-link">
                  All events
                </Link>
              </div>
              <div className="home-outer-body-tight">
                {upcomingEvents.length > 0 ? (
                  <ul className="space-y-3" role="list">
                    {upcomingEvents.map((event) => (
                      <li key={event.eventId}>
                        <Link
                          href="/dashboard/events"
                          className="home-inner-interactive block p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="home-icon mt-0.5 size-8 shrink-0">
                              <CalendarDays className="size-3.5" aria-hidden />
                            </span>
                            <span className="min-w-0">
                              <span className="home-pill">
                                {EVENT_TYPE_LABELS[event.eventType]}
                              </span>
                              <p className="mt-2 text-sm font-medium text-secondary">
                                {event.title}
                              </p>
                              <p className="home-muted mt-1 text-xs">
                                {formatEventWhen(event.startsAt)}
                              </p>
                              {event.location ? (
                                <p className="home-subtle mt-0.5 text-xs">{event.location}</p>
                              ) : null}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="home-inner px-4 py-8 text-center">
                    <p className="home-muted text-sm">No upcoming events.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="home-outer" aria-labelledby="ai-brief-heading">
              <div className="home-outer-header">
                <h2 id="ai-brief-heading" className="home-outer-title">
                  Legal AI brief
                </h2>
              </div>
              <div className="home-outer-body-tight">
                <div className="home-inner p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="home-icon size-10 shrink-0">
                      <Sparkles className="size-[1.125rem]" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="home-muted text-sm leading-relaxed">
                        {activeCases.length > 0
                          ? `You have ${activeCases.length} active case${activeCases.length === 1 ? "" : "s"}. Open a case to review progress and upcoming deadlines.`
                          : "Submit a case request to get started with Lawway Legal AI assistance."}
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4 w-full border-[color-mix(in_srgb,var(--secondary)_14%,transparent)] bg-white/60 text-secondary hover:bg-[color-mix(in_srgb,var(--primary)_12%,white)]"
                      >
                        Ask Legal AI
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
