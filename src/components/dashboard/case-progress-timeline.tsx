"use client";

import type { CaseStage } from "@/lib/cases";
import { cn } from "@/lib/utils";

type CaseProgressTimelineProps = {
  stages: CaseStage[];
};

function stageDotClass(status: CaseStage["status"]): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500";
    case "in_progress":
      return "bg-primary";
    case "skipped":
      return "bg-muted-foreground/40";
    default:
      return "bg-border";
  }
}

function stageLineClass(status: CaseStage["status"]): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500/30";
    case "in_progress":
      return "bg-primary/30";
    default:
      return "bg-border";
  }
}

function stageDetail(stage: CaseStage): string {
  if (stage.status === "completed" && stage.completedAt) {
    return `Completed ${new Date(stage.completedAt).toLocaleDateString()}`;
  }
  if (stage.status === "in_progress") return "In progress";
  if (stage.status === "skipped") return "Skipped";
  return "Pending";
}

export function CaseProgressTimeline({ stages }: CaseProgressTimelineProps) {
  if (stages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No stages defined for this case yet.</p>
    );
  }

  return (
    <div className="space-y-0">
      {stages.map((stage, index) => (
        <div key={stage.stageId} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span
              className={cn("size-3 shrink-0 rounded-full", stageDotClass(stage.status))}
              aria-hidden
            />
            {index < stages.length - 1 ? (
              <span
                className={cn("my-1 w-px flex-1 min-h-[40px]", stageLineClass(stage.status))}
                aria-hidden
              />
            ) : null}
          </div>
          <div className={cn("min-w-0 pb-6", index === stages.length - 1 && "pb-0")}>
            <p className="font-medium text-foreground">{stage.title}</p>
            {stage.description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{stage.description}</p>
            ) : null}
            <p className="mt-1 text-sm text-muted-foreground">{stageDetail(stage)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
