"use client";

import { FormEvent, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CaseStage } from "@/lib/cases";
import type { StageAction } from "@/lib/case-stages";
import {
  addCaseStage,
  advanceCaseStage,
  removeCaseStage,
} from "@/lib/cases-api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type LawyerStageActionsProps = {
  caseId: string;
  stages: CaseStage[];
  onStagesUpdated: (stages: CaseStage[]) => void;
};

function canRemoveStage(stage: CaseStage): boolean {
  return stage.status === "pending";
}

export function LawyerStageActions({
  caseId,
  stages,
  onStagesUpdated,
}: LawyerStageActionsProps) {
  const [loadingStageId, setLoadingStageId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [adding, setAdding] = useState(false);

  const inProgress = stages.find((s) => s.status === "in_progress");
  const nextPending = stages.find((s) => s.status === "pending");
  const removableStages = stages.filter(canRemoveStage);

  async function runAction(stageId: string, action: StageAction) {
    setLoadingStageId(stageId);
    try {
      const updated = await advanceCaseStage(caseId, stageId, action);
      onStagesUpdated(updated);
      toast.success("Stage updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update stage.");
    } finally {
      setLoadingStageId(null);
    }
  }

  async function handleRemove(stageId: string, title: string) {
    if (!confirm(`Remove upcoming stage “${title}”?`)) return;

    setLoadingStageId(stageId);
    try {
      const updated = await removeCaseStage(caseId, stageId);
      onStagesUpdated(updated);
      toast.success("Stage removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove stage.");
    } finally {
      setLoadingStageId(null);
    }
  }

  async function handleAddStage(e: FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      toast.error("Stage title is required.");
      return;
    }

    setAdding(true);
    try {
      const updated = await addCaseStage(caseId, {
        title,
        description: newDescription.trim() || null,
      });
      onStagesUpdated(updated);
      setNewTitle("");
      setNewDescription("");
      setShowAddForm(false);
      toast.success("Stage added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add stage.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Stage actions</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Advance the case through your workflow pipeline.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {inProgress ? (
            <Button
              type="button"
              size="sm"
              disabled={loadingStageId != null || adding}
              onClick={() => void runAction(inProgress.stageId, "stage_completed")}
            >
              Complete “{inProgress.title}”
            </Button>
          ) : null}
          {nextPending && !inProgress ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loadingStageId != null || adding}
              onClick={() => void runAction(nextPending.stageId, "stage_started")}
            >
              Start “{nextPending.title}”
            </Button>
          ) : null}
          {(inProgress ?? nextPending) ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={loadingStageId != null || adding}
              onClick={() =>
                void runAction(
                  (inProgress ?? nextPending)!.stageId,
                  "stage_skipped",
                )
              }
            >
              Skip current stage
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Manage stages</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Add custom steps or remove upcoming stages (not started yet).
            </p>
          </div>
          {!showAddForm ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loadingStageId != null || adding}
              onClick={() => setShowAddForm(true)}
              className="shrink-0 gap-1"
            >
              <Plus className="size-3.5" aria-hidden />
              Add stage
            </Button>
          ) : null}
        </div>

        {showAddForm ? (
          <form
            onSubmit={(e) => void handleAddStage(e)}
            className="mt-4 space-y-4 rounded-xl border border-border bg-muted p-4"
          >
            <div>
              <label
                htmlFor="new-stage-title"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Stage title
              </label>
              <input
                id="new-stage-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Mediation"
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
                required
              />
            </div>
            <div>
              <label
                htmlFor="new-stage-desc"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Description (optional)
              </label>
              <textarea
                id="new-stage-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                className="w-full resize-y rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={adding}>
                {adding ? "Adding…" : "Save stage"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={adding}
                onClick={() => {
                  setShowAddForm(false);
                  setNewTitle("");
                  setNewDescription("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {removableStages.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {removableStages.map((stage) => (
              <li
                key={stage.stageId}
                className="flex items-center justify-between gap-2 rounded-xl border border-border px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {stage.title}
                  </p>
                  {stage.description ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {stage.description}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={loadingStageId != null || adding}
                  onClick={() => void handleRemove(stage.stageId, stage.title)}
                  className="shrink-0"
                  aria-label={`Remove ${stage.title}`}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            No removable stages — only upcoming (pending) stages can be deleted.
          </p>
        )}
      </div>
    </div>
  );
}
