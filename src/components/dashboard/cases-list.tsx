"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Briefcase, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CaseListItem } from "@/lib/cases";
import { fetchCases } from "@/lib/cases-api";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CasesListProps = {
  role: "client" | "lawyer";
};

export function CasesList({ role }: CasesListProps) {
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const casesData = await fetchCases();
      setCases(casesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto ">
      {role === "client" ? (
        <header className="mb-8 flex justify-end">
          <Link
            href="/dashboard/requests/new"
            className={cn(
              buttonVariants({ variant: "default" }),
              "inline-flex gap-2",
            )}
          >
            <Plus className="size-4" aria-hidden />
            New request
          </Link>
        </header>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-4">
          <p className="text-sm text-red-300">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void load()}
          >
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            Try again
          </Button>
        </div>
      ) : (
        <>
          {role === "client" ? (
            <p className="mb-6 text-sm text-muted-foreground">
              Track pending and past submissions on{" "}
              <Link href="/dashboard/requests" className="font-medium text-primary hover:underline">
                Requests
              </Link>
              .
            </p>
          ) : null}

          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
              {role === "client" ? "Active cases" : "All cases"}
            </h2>
            {cases.length === 0 ? (
              <div className="dashboard-card-muted flex flex-col items-center px-6 py-14 text-center">
                <Briefcase className="size-10 text-muted-foreground" aria-hidden />
                <p className="mt-4 font-medium text-foreground">No cases yet</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {role === "client"
                    ? "Accepted requests appear here as active case files."
                    : "Accepted requests will appear here as active case files."}
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {cases.map((c) => (
                  <li key={c.caseId}>
                    <Link
                      href={`/dashboard/cases/${c.caseId}`}
                      className="dashboard-card-interactive group flex items-center justify-between gap-4 p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground group-hover:text-primary">
                          {c.title}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {role === "client"
                            ? `Counsel: ${c.lawyerName}`
                            : `Client: ${c.clientName}`}
                          {c.currentStageTitle ? ` · ${c.currentStageTitle}` : ""}
                        </p>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
