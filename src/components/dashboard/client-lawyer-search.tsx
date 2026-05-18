"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Loader2, Search } from "lucide-react";
import type { LawyerSearchResult } from "@/lib/lawyers";
import type { LawyerSearchFilters } from "@/lib/lawyer-search-api";
import { fetchLawyers } from "@/lib/lawyer-search-api";
import { LawyerProfileDetailPanel } from "@/components/dashboard/lawyer-profile-detail-panel";
import {
  LawyerSearchFiltersBar,
  type LawyerSearchFilterValues,
} from "@/components/dashboard/lawyer-search-filters-bar";
import { LawyerSearchResultCard } from "@/components/dashboard/lawyer-search-result-card";
import { Button } from "@/components/ui/button";

type ClientLawyerSearchProps = {
  showHeading?: boolean;
};

const EMPTY_FILTERS: LawyerSearchFilterValues = {
  province: "",
  experience: "",
  specialization: "",
};

function hasSearchCriteria(
  query: string,
  filters: LawyerSearchFilterValues,
): boolean {
  return Boolean(
    query ||
      filters.province ||
      filters.experience ||
      filters.specialization,
  );
}

export function ClientLawyerSearch({ showHeading = true }: ClientLawyerSearchProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<LawyerSearchFilterValues>(EMPTY_FILTERS);
  const [lawyers, setLawyers] = useState<LawyerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<LawyerSearchResult | null>(
    null,
  );

  const loadLawyers = useCallback(async (opts: LawyerSearchFilters) => {
    setSearching(true);
    setError(null);
    setSelectedLawyer(null);

    try {
      const results = await fetchLawyers(opts);
      setLawyers(results);
    } catch (err) {
      setLawyers([]);
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }, []);

  async function runSearch(searchQuery: string, searchFilters: LawyerSearchFilterValues) {
    const q = searchQuery.trim();

    if (!hasSearchCriteria(q, searchFilters)) {
      setError("Enter a name or choose at least one filter.");
      return;
    }

    setHasSearched(true);
    await loadLawyers({
      query: q || undefined,
      province: searchFilters.province || undefined,
      specialization: searchFilters.specialization || undefined,
      experience: searchFilters.experience || undefined,
    });
  }

  async function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    await runSearch(query, filters);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function clearAll() {
    setQuery("");
    setFilters(EMPTY_FILTERS);
    setHasSearched(false);
    setLawyers([]);
    setError(null);
    setSelectedLawyer(null);
  }

  return (
    <section className="mx-auto max-w-3xl">
      {showHeading ? (
        <>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-secondary sm:text-4xl">
            Find a lawyer
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-neutral/70 sm:text-base">
            Search by name or use filters for location, experience, and type of
            lawyer. Tap a profile for full details.
          </p>
        </>
      ) : null}

      <form
        onSubmit={handleSearch}
        className={`flex flex-col gap-3 sm:flex-row sm:items-stretch ${showHeading ? "mt-6" : "mt-0"}`}
      >
        <div className="relative flex flex-1 items-center rounded-2xl border border-black/5 bg-white p-2 shadow-sm">
          <Search className="absolute left-5 size-4 text-neutral/40" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Attorney name (optional)"
            className="w-full border-none bg-transparent py-3 pr-4 pl-11 text-sm outline-none placeholder:text-neutral/40 focus:ring-0"
            aria-label="Search by attorney name"
          />
        </div>
        <Button
          type="submit"
          disabled={searching}
          className="h-auto shrink-0 rounded-2xl bg-secondary px-8 py-3 text-white hover:bg-secondary/90 sm:min-w-[7.5rem]"
        >
          {searching ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Searching
            </>
          ) : (
            "Search"
          )}
        </Button>
      </form>

      <LawyerSearchFiltersBar
        className="mt-4"
        values={filters}
        onChange={setFilters}
        onClear={clearFilters}
      />

      {error ? (
        <p className="mt-3 text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      {hasSearched ? (
        <div className="mt-8">
          {searching ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/10 bg-white/60 py-16 text-sm text-neutral/60">
              <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
              Searching lawyers…
            </div>
          ) : lawyers.length === 0 ? (
            <div className="rounded-2xl border border-black/5 bg-white px-6 py-14 text-center shadow-sm">
              <p className="font-medium text-secondary">No lawyers found</p>
              <p className="mt-2 text-sm text-neutral/60">
                Try different filters or a broader search.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between px-1">
                <p className="text-sm font-medium text-secondary">
                  {lawyers.length} advocate{lawyers.length === 1 ? "" : "s"} found
                </p>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-medium text-primary hover:text-primary/80"
                >
                  Clear all
                </button>
              </div>

              <ul className="flex flex-col gap-3" role="list">
                {lawyers.map((lawyer) => (
                  <li key={lawyer.userId}>
                    <LawyerSearchResultCard
                      lawyer={lawyer}
                      onSelect={() => setSelectedLawyer(lawyer)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-neutral/50">
          Choose filters or enter a name, then search.
        </p>
      )}

      {selectedLawyer ? (
        <LawyerProfileDetailPanel
          lawyer={selectedLawyer}
          onClose={() => setSelectedLawyer(null)}
        />
      ) : null}
    </section>
  );
}
