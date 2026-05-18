"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, MapPin, MessageCircle, Search, Sparkles } from "lucide-react";
import type { SessionPayload } from "@/lib/session";
import type { LawyerSearchResult } from "@/lib/lawyers";
import { fetchLawyers } from "@/lib/lawyer-search-api";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClientDashboardProps = {
  session: SessionPayload;
};

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

function formatExperience(years: number | null): string {
  if (years == null) return "—";
  return `${years} Year${years === 1 ? "" : "s"}`;
}

function formatLocation(lawyer: LawyerSearchResult): string {
  if (lawyer.officeAddress) {
    return `${lawyer.province} · ${lawyer.officeAddress}`;
  }
  return lawyer.province;
}

function LawyerResultRow({ lawyer }: { lawyer: LawyerSearchResult }) {
  return (
    <div className="grid gap-3 border-b border-black/5 px-4 py-4 last:border-0 sm:grid-cols-[minmax(140px,1.2fr)_minmax(90px,0.7fr)_minmax(160px,1.5fr)_minmax(140px,1fr)_auto] sm:items-center sm:gap-4 sm:px-5">
      <p className="font-medium text-secondary">{lawyer.fullName}</p>
      <p className="text-sm text-neutral/70">
        <span className="font-medium text-neutral/45 sm:hidden">Experience: </span>
        {formatExperience(lawyer.experienceYears)}
      </p>
      <p className="min-w-0 text-sm text-neutral/70">
        <span className="font-medium text-neutral/45 sm:hidden">Specialization: </span>
        {lawyer.specialization}
      </p>
      <p className="min-w-0 text-sm text-neutral/70">
        <span className="font-medium text-neutral/45 sm:hidden">Location: </span>
        {formatLocation(lawyer)}
      </p>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-black/10 text-secondary hover:bg-black/[0.03]"
        >
          <MessageCircle className="size-3.5" aria-hidden />
          Chat
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-9 bg-secondary text-white hover:bg-secondary/90"
        >
          Book Consultation
        </Button>
      </div>
    </div>
  );
}

export function ClientDashboard({ session }: ClientDashboardProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [lawyers, setLawyers] = useState<LawyerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const loadLawyers = useCallback(
    async (opts: { query?: string; location?: string }) => {
      setSearching(true);
      setError(null);

      try {
        const results = await fetchLawyers({
          query: opts.query,
          location: opts.location,
        });
        setLawyers(results);
      } catch (err) {
        setLawyers([]);
        setError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        setSearching(false);
      }
    },
    [],
  );

  async function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    const loc = location.trim();

    if (!q && !loc) {
      setError("Enter a name, specialization, or location to search.");
      return;
    }

    setHasSearched(true);
    await loadLawyers({ query: q, location: loc });
  }

  function clearSearch() {
    setQuery("");
    setLocation("");
    setHasSearched(false);
    setLawyers([]);
    setError(null);
  }

  return (
    <DashboardShell session={session} activeItem="Home">
      <main className="px-4 py-8 sm:px-8">
        <section className="mb-10">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-secondary sm:text-4xl">
            Find Uncompromising Legal Authority
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-neutral/70 sm:text-base">
            Access Pakistan&apos;s most distinguished legal professionals and
            manage your cases with precision and discretion.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-6 flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-2 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="relative flex flex-[1.2] items-center">
              <Search className="absolute left-3 size-4 text-neutral/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Specialization or Attorney name"
                className="w-full border-none bg-transparent py-3 pr-4 pl-10 text-sm outline-none placeholder:text-neutral/40 focus:ring-0"
              />
            </div>
            <div className="hidden h-8 w-px bg-black/10 sm:block" />
            <div className="relative flex flex-1 items-center">
              <MapPin className="absolute left-3 size-4 text-neutral/40" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="w-full border-none bg-transparent py-3 pr-4 pl-10 text-sm outline-none placeholder:text-neutral/40 focus:ring-0"
              />
            </div>
            <Button
              type="submit"
              disabled={searching}
              className="h-11 shrink-0 rounded-lg bg-secondary px-8 text-white hover:bg-secondary/90"
            >
              {searching ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Searching
                </>
              ) : (
                "Search"
              )}
            </Button>
          </form>

          {error ? (
            <p className="mt-3 text-sm text-rose-600" role="alert">
              {error}
            </p>
          ) : null}

          {hasSearched ? (
            <div className="mt-6 overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
              <div className="hidden border-b border-black/5 bg-[#faf9f7] px-5 py-3 text-[11px] font-medium tracking-wide text-neutral/50 uppercase sm:grid sm:grid-cols-[minmax(140px,1.2fr)_minmax(90px,0.7fr)_minmax(160px,1.5fr)_minmax(140px,1fr)_auto] sm:gap-4">
                <span>Name</span>
                <span>Experience</span>
                <span>Specialization</span>
                <span>Location</span>
                <span className="text-right">Actions</span>
              </div>

              {searching ? (
                <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-neutral/60">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  Searching lawyers…
                </div>
              ) : lawyers.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="font-medium text-secondary">No lawyers found</p>
                  <p className="mt-2 text-sm text-neutral/60">
                    Try a different name, specialization, or location.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-black/5 px-5 py-3">
                    <p className="text-sm font-medium text-secondary">
                      {lawyers.length} result{lawyers.length === 1 ? "" : "s"}
                    </p>
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="text-xs font-medium text-primary hover:text-primary/80"
                    >
                      Clear search
                    </button>
                  </div>
                  {lawyers.map((lawyer) => (
                    <LawyerResultRow key={lawyer.userId} lawyer={lawyer} />
                  ))}
                </>
              )}
            </div>
          ) : null}
        </section>

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
              Analysis of Case LW-2024-8921: Preliminary review suggests strong
              grounds for merger approval. Key regulatory filings due within 14
              days.
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
      </main>

      <footer className="flex flex-col items-center justify-between gap-4 border-t border-black/5 bg-white px-4 py-6 text-xs text-neutral/60 sm:flex-row sm:px-8">
        <div className="flex items-center gap-2">
          <span className="font-serif text-base font-medium text-secondary">
            Lawway
          </span>
          <span>
            © {new Date().getFullYear()} Lawway Chambers. All rights reserved.
          </span>
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
