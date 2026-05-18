"use client";

import Link from "next/link";
import { ChevronRight, MapPin, Search, Sparkles } from "lucide-react";
import type { SessionPayload } from "@/lib/session";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClientDashboardProps = {
  session: SessionPayload;
};

const CATEGORIES = [
  "Corporate Law",
  "Criminal Defense",
  "Intellectual Property",
  "Family Matters",
];

const ACTIVE_CASES = [
  {
    id: "LW-2024-8921",
    title: "Morgan vs. Nexus Tech Merger",
    status: "IN REVIEW",
    statusClass: "bg-amber-100 text-amber-800",
    attorney: "Jonathan Vane",
    activity: "2 hours ago",
  },
  {
    id: "LW-2023-4412",
    title: "Residential Lease Dispute - NYC",
    status: "HEARING SET",
    statusClass: "bg-rose-100 text-rose-800",
    attorney: "Elena Rossi",
    activity: "Yesterday",
  },
];

const LAWYERS = [
  {
    name: "Jonathan Vane",
    badge: "ELITE PARTNER",
    badgeClass: "bg-primary/20 text-secondary",
    experience: "18 Years",
    success: "94%",
    rate: "$450/hr",
    initials: "JV",
  },
  {
    name: "Elena Rossi",
    badge: "TOP RATED",
    badgeClass: "bg-emerald-100 text-emerald-800",
    experience: "12 Years",
    success: "91%",
    rate: "$380/hr",
    initials: "ER",
  },
  {
    name: "Marcus Thorne",
    badge: "SPECIALIST",
    badgeClass: "bg-sky-100 text-sky-800",
    experience: "15 Years",
    success: "89%",
    rate: "$420/hr",
    initials: "MT",
  },
];

export function ClientDashboard({ session }: ClientDashboardProps) {
  return (
    <DashboardShell session={session} activeItem="Home">
      <main className="px-4 py-8 sm:px-8">
          {/* Hero search */}
          <section className="mb-10">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-secondary sm:text-4xl">
              Find Uncompromising Legal Authority
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-neutral/70 sm:text-base">
              Access Pakistan&apos;s most distinguished legal professionals and
              manage your cases with precision and discretion.
            </p>

            <div className="mt-6 flex flex-col gap-3 rounded-lg border border-black/5 bg-white p-2 shadow-sm sm:flex-row">
              <div className="relative flex flex-1 items-center">
                <Search className="absolute left-3 size-4 text-neutral/40" />
                <input
                  type="text"
                  placeholder="Specialization or Attorney name"
                  className="w-full rounded-md py-3 pr-4 pl-10 text-sm outline-none placeholder:text-neutral/40"
                />
              </div>
              <div className="hidden h-8 w-px bg-black/10 sm:block" />
              <div className="relative flex flex-1 items-center">
                <MapPin className="absolute left-3 size-4 text-neutral/40" />
                <input
                  type="text"
                  placeholder="Location"
                  className="w-full rounded-md py-3 pr-4 pl-10 text-sm outline-none placeholder:text-neutral/40"
                />
              </div>
              <Button className="h-11 bg-secondary px-8 text-white hover:bg-secondary/90 sm:shrink-0">
                Search
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-medium text-neutral/80 transition hover:border-primary/40 hover:text-secondary"
                >
                  {category}
                </button>
              ))}
            </div>
          </section>

          {/* Cases + AI */}
          <section className="mb-10 grid gap-6 lg:grid-cols-3">
            <div className="rounded-lg border border-black/5 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-serif text-xl font-medium text-secondary">
                  My Active Cases
                </h2>
                <Link
                  href="#"
                  className="text-xs font-medium text-primary hover:text-primary/80"
                >
                  View All Documents
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/5 text-[11px] tracking-wide text-neutral/50 uppercase">
                      <th className="pb-3 font-medium">Case ID & Title</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Lead Attorney</th>
                      <th className="pb-3 font-medium">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ACTIVE_CASES.map((caseItem) => (
                      <tr
                        key={caseItem.id}
                        className="border-b border-black/5 last:border-0"
                      >
                        <td className="py-4 pr-4">
                          <p className="font-medium text-secondary">
                            {caseItem.id}
                          </p>
                          <p className="mt-0.5 text-neutral/60">
                            {caseItem.title}
                          </p>
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
                        <td className="py-4 text-neutral/80">
                          {caseItem.attorney}
                        </td>
                        <td className="py-4 text-neutral/60">
                          {caseItem.activity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col rounded-lg bg-secondary p-6 text-white shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h2 className="font-serif text-xl font-medium">Legal AI Brief</h2>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-white/80">
                Analysis of Case LW-2024-8921: Preliminary review suggests
                strong grounds for merger approval. Key regulatory filings due
                within 14 days.
              </p>
              <div className="my-5 rounded-md border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] tracking-widest text-primary uppercase">
                  Hearing countdown
                </p>
                <p className="mt-2 font-serif text-2xl font-medium">
                  4 Days : 12 Hours
                </p>
                <p className="mt-1 text-xs text-white/60">
                  SUPREME COURT, ROOM 402
                </p>
              </div>
              <Button
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                Ask Legal AI
              </Button>
            </div>
          </section>

          {/* Top lawyers */}
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-xl font-medium text-secondary">
                Top-Rated Legal Professionals
              </h2>
              <Link
                href="#"
                className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
              >
                See All Specialists
                <ChevronRight className="size-4" />
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {LAWYERS.map((lawyer) => (
                <div
                  key={lawyer.name}
                  className="rounded-lg border border-black/5 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary/10 font-serif text-lg text-secondary">
                      {lawyer.initials}
                    </div>
                    <div>
                      <h3 className="font-medium text-secondary">
                        {lawyer.name}
                      </h3>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide",
                          lawyer.badgeClass,
                        )}
                      >
                        {lawyer.badge}
                      </span>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-2 text-sm text-neutral/70">
                    <li className="flex justify-between">
                      <span>Experience</span>
                      <span className="font-medium text-secondary">
                        {lawyer.experience}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Success Rate</span>
                      <span className="font-medium text-secondary">
                        {lawyer.success}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Hourly Rate</span>
                      <span className="font-medium text-secondary">
                        {lawyer.rate}
                      </span>
                    </li>
                  </ul>
                  <Button className="mt-5 h-10 w-full bg-secondary text-white hover:bg-secondary/90">
                    Book Consultation
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-black/5 bg-white px-4 py-6 text-xs text-neutral/60 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2">
            <span className="font-serif text-base font-medium text-secondary">
              Lawway
            </span>
            <span>© 2024 Lawway Chambers. All rights reserved.</span>
          </div>
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
