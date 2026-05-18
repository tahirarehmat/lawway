"use client";

import Link from "next/link";
import { Briefcase, Gavel, Scale } from "lucide-react";
import type { SessionPayload } from "@/lib/session";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LawyerDashboardProps = {
  session: SessionPayload;
};

const CASE_REQUESTS = [
  {
    title: "Estate Dispute: Henderson vs. Henderson",
    meta: "Probate Litigation | Submitted 2h ago",
    icon: Gavel,
  },
  {
    title: "M&A Review: NexaCore Acquisitions",
    meta: "Corporate Law | Submitted 5h ago",
    icon: Briefcase,
  },
];

const ACTIVE_CASES = [
  {
    id: "#LWY-2940",
    client: "Vanguard Group Ltd.",
    milestone: "Deposition Prep",
    status: "IN PROGRESS",
    statusClass: "bg-primary/20 text-secondary",
  },
  {
    id: "#LWY-3112",
    client: "Elena Rodriguez",
    milestone: "Document Filing",
    status: "URGENT",
    statusClass: "bg-rose-100 text-rose-800",
  },
  {
    id: "#LWY-2884",
    client: "Apex Manufacturing",
    milestone: "Court Appearance",
    status: "ON HOLD",
    statusClass: "bg-neutral/10 text-neutral/60",
  },
];

const UPCOMING_HEARINGS = [
  {
    date: "OCT 25",
    venue: "Superior Court, Div 4",
    title: "Motion for Summary Judgment",
    time: "09:00 AM - 11:30 AM",
  },
  {
    date: "OCT 28",
    venue: "Civil Appeals Court",
    title: "Oral Argument: Case #312",
    time: "02:00 PM - 03:00 PM",
  },
];

const MILESTONES = [
  {
    label: "Discovery Phase",
    detail: "Completed on Oct 12",
    dotClass: "bg-emerald-500",
    lineClass: "bg-emerald-500/30",
  },
  {
    label: "Pre-Trial Motions",
    detail: "Currently in review with Senior Partner",
    dotClass: "bg-primary",
    lineClass: "bg-primary/30",
  },
  {
    label: "Trial Commencement",
    detail: "Est. Nov 15",
    dotClass: "bg-neutral/30",
    lineClass: "bg-neutral/20",
  },
];

export function LawyerDashboard({ session }: LawyerDashboardProps) {
  return (
    <DashboardShell session={session} activeItem="Home" showSupport={false}>
      <main className="px-4 py-8 sm:px-8">
          {/* Page header */}
          <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-medium tracking-[0.18em] text-neutral/50 uppercase">
                Dashboard Overview
              </p>
              <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-secondary sm:text-4xl">
                Welcome, Counselor.
              </h1>
            </div>
            <div className="text-right text-sm text-neutral/60">
              <p>Oct 24, 2024</p>
              <p className="mt-1 font-medium text-secondary">4 Pending Requests</p>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            {/* Left column */}
            <div className="space-y-6 xl:col-span-2">
              {/* Case requests */}
              <section className="rounded-lg border border-black/5 bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <h2 className="font-serif text-xl font-medium text-secondary">
                    Case Requests
                  </h2>
                  <span className="rounded bg-rose-100 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-rose-800 uppercase">
                    New Action Needed
                  </span>
                </div>

                <div className="space-y-4">
                  {CASE_REQUESTS.map((request) => (
                    <div
                      key={request.title}
                      className="flex flex-col gap-4 rounded-md border border-black/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-tertiary text-secondary">
                          <request.icon className="size-5" />
                        </div>
                        <div>
                          <p className="font-medium text-secondary">
                            {request.title}
                          </p>
                          <p className="mt-0.5 text-sm text-neutral/60">
                            {request.meta}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:shrink-0">
                        <Button className="h-9 bg-secondary px-5 text-white hover:bg-secondary/90">
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          className="h-9 border-secondary/30 px-5 text-secondary hover:bg-tertiary"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Active case files */}
              <section className="rounded-lg border border-black/5 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-serif text-xl font-medium text-secondary">
                    Active Case Files
                  </h2>
                  <Link
                    href="#"
                    className="text-xs font-medium text-primary hover:text-primary/80"
                  >
                    View All Files
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-black/5 text-[11px] tracking-wide text-neutral/50 uppercase">
                        <th className="pb-3 font-medium">Case ID</th>
                        <th className="pb-3 font-medium">Client Name</th>
                        <th className="pb-3 font-medium">Next Milestone</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ACTIVE_CASES.map((caseItem) => (
                        <tr
                          key={caseItem.id}
                          className="border-b border-black/5 last:border-0"
                        >
                          <td className="py-4 font-medium text-secondary">
                            {caseItem.id}
                          </td>
                          <td className="py-4 text-neutral/80">
                            {caseItem.client}
                          </td>
                          <td className="py-4 text-neutral/80">
                            {caseItem.milestone}
                          </td>
                          <td className="py-4">
                            <span
                              className={cn(
                                "rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide",
                                caseItem.statusClass,
                              )}
                            >
                              {caseItem.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Upcoming hearings */}
              <section className="rounded-lg bg-secondary p-6 text-white shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <Scale className="size-5 text-primary" />
                  <h2 className="font-serif text-xl font-medium">
                    Upcoming Hearings
                  </h2>
                </div>

                <div className="space-y-5">
                  {UPCOMING_HEARINGS.map((hearing) => (
                    <div
                      key={hearing.date + hearing.title}
                      className="border-b border-white/10 pb-5 last:border-0 last:pb-0"
                    >
                      <p className="text-xs font-semibold tracking-widest text-primary">
                        {hearing.date}
                      </p>
                      <p className="mt-1 text-sm text-white/70">{hearing.venue}</p>
                      <p className="mt-1 font-medium">{hearing.title}</p>
                      <p className="mt-1 text-sm text-white/60">{hearing.time}</p>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="mt-6 w-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  Sync to Global Calendar
                </Button>
              </section>

              {/* Milestone progression */}
              <section className="rounded-lg border border-black/5 bg-white p-6 shadow-sm">
                <h2 className="mb-6 font-serif text-xl font-medium text-secondary">
                  Case Milestone Progression
                </h2>

                <div className="space-y-0">
                  {MILESTONES.map((milestone, index) => (
                    <div key={milestone.label} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "size-3 shrink-0 rounded-full",
                            milestone.dotClass,
                          )}
                        />
                        {index < MILESTONES.length - 1 ? (
                          <span
                            className={cn(
                              "my-1 w-px flex-1 min-h-[40px]",
                              milestone.lineClass,
                            )}
                          />
                        ) : null}
                      </div>
                      <div className={cn("pb-6", index === MILESTONES.length - 1 && "pb-0")}>
                        <p className="font-medium text-secondary">
                          {milestone.label}
                        </p>
                        <p className="mt-0.5 text-sm text-neutral/60">
                          {milestone.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>

        <footer className="flex flex-col items-center justify-between gap-4 border-t border-black/5 bg-white px-4 py-6 text-xs text-neutral/60 sm:flex-row sm:px-8">
          <span className="font-serif text-base font-medium text-secondary">
            Lawway
          </span>
          <p>© 2024 Lawway Legal Technologies. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {[
              "Privacy Policy",
              "Terms of Service",
              "Attorney Advertising",
              "Contact",
            ].map((link) => (
              <Link key={link} href="#" className="hover:text-secondary">
                {link}
              </Link>
            ))}
          </div>
        </footer>
    </DashboardShell>
  );
}
