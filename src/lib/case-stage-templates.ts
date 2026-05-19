import type { CaseStageStatus } from "@/lib/cases";

export type StageTemplate = {
  title: string;
  description?: string;
  sortOrder: number;
  initialStatus: CaseStageStatus;
};

export const DEFAULT_CASE_STAGE_TEMPLATE: StageTemplate[] = [
  {
    title: "Intake & review",
    description: "Initial review of your matter and documentation.",
    sortOrder: 1,
    initialStatus: "in_progress",
  },
  {
    title: "Discovery",
    description: "Gathering evidence and exchanging information.",
    sortOrder: 2,
    initialStatus: "pending",
  },
  {
    title: "Pre-trial motions",
    description: "Filing and responding to pre-trial motions.",
    sortOrder: 3,
    initialStatus: "pending",
  },
  {
    title: "Hearing",
    description: "Court appearances and hearings.",
    sortOrder: 4,
    initialStatus: "pending",
  },
  {
    title: "Resolution",
    description: "Settlement, judgment, or case closure.",
    sortOrder: 5,
    initialStatus: "pending",
  },
];
