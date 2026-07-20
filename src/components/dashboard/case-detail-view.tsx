"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import type { CaseDetail } from "@/lib/cases";
import type { ClientCaseEvent } from "@/lib/case-events";
import { EVENT_TYPE_LABELS } from "@/lib/case-events";
import { formatEventWhen } from "@/lib/format-event-date";
import { fetchCaseDetail, fetchCaseEvents } from "@/lib/cases-api";
import { CaseProgressTimeline } from "@/components/dashboard/case-progress-timeline";
import { CreateCaseEventForm } from "@/components/dashboard/create-case-event-form";
import { LawyerStageActions } from "@/components/dashboard/lawyer-stage-actions";
import { CaseDocumentsSection } from "@/components/dashboard/case-documents-section";
import { Button } from "@/components/ui/button";
import { CaseCommunicationActions } from "@/components/dashboard/case-communication-actions";

type CaseDetailViewProps = {
  caseId: string;
  role: "client" | "lawyer";
  /** Client account email for chat bootstrap (lawyer view uses case client email). */
  clientUid?: string;
  localDisplayName?: string;
};

export function CaseDetailView({
  caseId,
  role,
  clientUid: clientUidProp,
  localDisplayName: localDisplayNameProp,
}: CaseDetailViewProps) {
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [events, setEvents] = useState<ClientCaseEvent[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const detail = await fetchCaseDetail(caseId);
      setCaseDetail(detail);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load case.");
      setCaseDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [caseId]);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      const evts = await fetchCaseEvents(caseId);
      setEvents(evts);
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : "Failed to load events.");
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [caseId]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadDetail(), loadEvents()]);
  }, [loadDetail, loadEvents]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (loadingDetail) {
    return <p className="text-sm text-muted-foreground">Loading case file…</p>;
  }

  if (detailError || !caseDetail) {
    return (
      <div>
        <Link
          href="/dashboard/cases"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to cases
        </Link>
        <p className="mt-6 text-sm text-red-700">{detailError ?? "Case not found."}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => void loadDetail()}>
          <RefreshCw className="mr-2 size-4" aria-hidden />
          Try again
        </Button>
      </div>
    );
  }

  const currentStage = caseDetail.stages.find((s) => s.status === "in_progress");

  const clientUid =
    clientUidProp ??
    caseDetail.clientEmail ??
    `${caseDetail.clientId}@lawway.local`;
  const localDisplayName =
    localDisplayNameProp ??
    (role === "lawyer" ? caseDetail.lawyerName : caseDetail.clientName);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/dashboard/cases"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to cases
      </Link>

      <header className="mt-6 mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Case file
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {caseDetail.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {role === "client"
              ? `Counsel: ${caseDetail.lawyerName}`
              : `Client: ${caseDetail.clientName}`}
            {" · "}
            <span className="capitalize">{caseDetail.status.replace("_", " ")}</span>
            {currentStage ? ` · ${currentStage.title}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <CaseCommunicationActions
            caseDetail={caseDetail}
            role={role}
            clientUid={clientUid}
            localDisplayName={localDisplayName}
            onMeetingRecorded={() => void loadEvents()}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-end"
            onClick={() => void loadAll()}
          >
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            Refresh
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="dashboard-card p-6">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Overview</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {caseDetail.briefDescription}
            </p>
            {caseDetail.specialConditions ? (
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Special conditions: </span>
                {caseDetail.specialConditions}
              </p>
            ) : null}
          </section>

          <section className="dashboard-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Events</h2>
              {role === "lawyer" ? (
                <CreateCaseEventForm
                  caseId={caseId}
                  onCreated={() => {
                    void loadEvents();
                  }}
                />
              ) : null}
            </div>
            {loadingEvents ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading events…</p>
            ) : eventsError ? (
              <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                {eventsError}
                <button
                  type="button"
                  className="ml-2 font-medium underline"
                  onClick={() => void loadEvents()}
                >
                  Retry
                </button>
              </div>
            ) : events.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {role === "lawyer"
                  ? "No events yet. Use Add event to schedule hearings, deadlines, or notes."
                  : "No events scheduled yet."}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {events.map((evt) => (
                  <li
                    key={evt.eventId}
                    className="rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {EVENT_TYPE_LABELS[evt.eventType]}
                    </p>
                    <p className="mt-1 font-medium text-foreground">{evt.title}</p>
                    {evt.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{evt.description}</p>
                    ) : null}
                    {evt.startsAt ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatEventWhen(evt.startsAt)}
                        {evt.location ? ` · ${evt.location}` : ""}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <CaseDocumentsSection caseId={caseId} role={role} />
        </div>

        <aside className="space-y-6">
          <section className="dashboard-card p-6">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Case progress</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Stages from intake through resolution.
            </p>
            <div className="mt-6">
              <CaseProgressTimeline stages={caseDetail.stages} />
            </div>
            {role === "lawyer" ? (
              <LawyerStageActions
                caseId={caseId}
                stages={caseDetail.stages}
                onStagesUpdated={(stages) => {
                  setCaseDetail((prev) => (prev ? { ...prev, stages } : prev));
                }}
              />
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
