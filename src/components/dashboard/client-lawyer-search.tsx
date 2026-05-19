"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import type { LawyerSearchResult } from "@/lib/lawyers";
import {
  fetchLawyers,
  LAWYER_SEARCH_PAGE_SIZE,
  type LawyerSearchFilters,
} from "@/lib/lawyer-search-api";
import { LawyerProfileDetailPanel } from "@/components/dashboard/lawyer-profile-detail-panel";
import {
  LawyerSearchFiltersBar,
  type LawyerSearchFilterValues,
} from "@/components/dashboard/lawyer-search-filters-bar";
import { LawyerSearchResultCard } from "@/components/dashboard/lawyer-search-result-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClientLawyerSearchProps = {
  showHeading?: boolean;
};

const EMPTY_FILTERS: LawyerSearchFilterValues = {
  province: "",
  experience: "",
  specialization: "",
};

export function ClientLawyerSearch({ showHeading = true }: ClientLawyerSearchProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<LawyerSearchFilterValues>(EMPTY_FILTERS);
  const [lawyers, setLawyers] = useState<LawyerSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<LawyerSearchResult | null>(
    null,
  );

  const totalPages = Math.max(1, Math.ceil(total / LAWYER_SEARCH_PAGE_SIZE));

  const loadLawyers = useCallback(
    async (
      opts: LawyerSearchFilters & { page: number },
    ) => {
      setSearching(true);
      setError(null);
      setSelectedLawyer(null);

      try {
        const result = await fetchLawyers({
          ...opts,
          pageSize: LAWYER_SEARCH_PAGE_SIZE,
        });
        setLawyers(result.lawyers);
        setTotal(result.total);
        setPage(result.page);
        setHasLoaded(true);
      } catch (err) {
        setLawyers([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        setSearching(false);
      }
    },
    [],
  );

  const buildSearchOpts = useCallback(
    (searchQuery: string, searchFilters: LawyerSearchFilterValues, targetPage: number) => {
      const q = searchQuery.trim();
      return {
        query: q || undefined,
        province: searchFilters.province || undefined,
        specialization: searchFilters.specialization || undefined,
        experience: searchFilters.experience || undefined,
        page: targetPage,
      };
    },
    [],
  );

  async function runSearch(
    searchQuery: string,
    searchFilters: LawyerSearchFilterValues,
    targetPage = 1,
  ) {
    await loadLawyers(buildSearchOpts(searchQuery, searchFilters, targetPage));
  }

  async function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    await runSearch(query, filters, 1);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    void runSearch(query, EMPTY_FILTERS, 1);
  }

  function clearAll() {
    setQuery("");
    setFilters(EMPTY_FILTERS);
    setSelectedLawyer(null);
    void runSearch("", EMPTY_FILTERS, 1);
  }

  function goToPage(nextPage: number) {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    void runSearch(query, filters, clamped);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    void runSearch("", EMPTY_FILTERS, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const rangeStart = total === 0 ? 0 : (page - 1) * LAWYER_SEARCH_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * LAWYER_SEARCH_PAGE_SIZE, total);

  return (
    <section className="mx-auto w-full">
      {showHeading ? (
        <>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-secondary sm:text-4xl">
            Find a lawyer
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-neutral/70 sm:text-base">
            Browse all advocates on Lawway. Search by name or filter by location,
            experience, and type — 10 profiles per page.
          </p>
        </>
      ) : null}

      <form
        onSubmit={handleSearch}
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-stretch",
          showHeading ? "mt-6" : "mt-0",
        )}
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
        onChange={(next) => {
          setFilters(next);
          void runSearch(query, next, 1);
        }}
        onClear={clearFilters}
      />

      {error ? (
        <p className="mt-3 text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8">
        {searching && !hasLoaded ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/10 bg-white/60 py-16 text-sm text-neutral/60">
            <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
            Loading lawyers…
          </div>
        ) : hasLoaded && lawyers.length === 0 ? (
          <div className="rounded-2xl border border-black/5 bg-white px-6 py-14 text-center shadow-sm">
            <p className="font-medium text-secondary">No lawyers found</p>
            <p className="mt-2 text-sm text-neutral/60">
              Try different filters or a broader search.
            </p>
          </div>
        ) : hasLoaded ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
              <p className="text-sm font-medium text-secondary">
                {total} advocate{total === 1 ? "" : "s"}
                {total > 0 ? (
                  <span className="font-normal text-neutral/55">
                    {" "}
                    · showing {rangeStart}–{rangeEnd}
                  </span>
                ) : null}
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-primary hover:text-primary/80"
              >
                Reset search
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

            {totalPages > 1 ? (
              <nav
                className="mt-8 flex flex-wrap items-center justify-center gap-2"
                aria-label="Lawyer search pagination"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || searching}
                  onClick={() => goToPage(page - 1)}
                  className="gap-1 border-black/10"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Previous
                </Button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 7) return true;
                      if (p === 1 || p === totalPages) return true;
                      return Math.abs(p - page) <= 1;
                    })
                    .map((p, index, arr) => {
                      const prev = arr[index - 1];
                      const showEllipsis = prev != null && p - prev > 1;

                      return (
                        <span key={p} className="flex items-center gap-1">
                          {showEllipsis ? (
                            <span className="px-1 text-neutral/40">…</span>
                          ) : null}
                          <button
                            type="button"
                            disabled={searching}
                            onClick={() => goToPage(p)}
                            className={cn(
                              "min-w-9 rounded-lg px-2 py-1.5 text-sm font-medium transition",
                              p === page
                                ? "bg-secondary text-white"
                                : "text-neutral/70 hover:bg-black/5",
                            )}
                            aria-current={p === page ? "page" : undefined}
                          >
                            {p}
                          </button>
                        </span>
                      );
                    })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || searching}
                  onClick={() => goToPage(page + 1)}
                  className="gap-1 border-black/10"
                >
                  Next
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </nav>
            ) : null}
          </>
        ) : null}
      </div>

      {selectedLawyer ? (
        <LawyerProfileDetailPanel
          lawyer={selectedLawyer}
          onClose={() => setSelectedLawyer(null)}
        />
      ) : null}
    </section>
  );
}
