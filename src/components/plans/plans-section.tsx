"use client";

import { useState } from "react";
import { Scale, Users } from "lucide-react";
import { clientPlans, lawyerPlans, type PlanAudience } from "@/lib/plans-data";
import { PlanCard } from "@/components/plans/plan-card";
import { cn } from "@/lib/utils";

const audienceCopy: Record<
  PlanAudience,
  { label: string; subtitle: string; note: string }
> = {
  client: {
    label: "For clients",
    subtitle:
      "Post requests, track cases, and connect with advocates—priced for individuals and businesses seeking legal help.",
    note: "Initial requests are how you reach lawyers on the platform each month.",
  },
  lawyer: {
    label: "For lawyers",
    subtitle:
      "Receive qualified client requests, manage matters, and grow your practice through Lawway Chambers.",
    note: "Higher plans include more client requests you can accept and stronger profile visibility.",
  },
};

export function PlansSection() {
  const [audience, setAudience] = useState<PlanAudience>("client");
  const plans = audience === "client" ? clientPlans : lawyerPlans;
  const copy = audienceCopy[audience];

  return (
    <section className="px-6 pb-16 sm:px-10 lg:px-14 lg:pb-24">
      <div className="mx-auto flex max-w-6xl flex-col items-center">
        <div
          className="inline-flex rounded-full border border-[#ebe7e2] bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Plan audience"
        >
          <button
            type="button"
            role="tab"
            aria-selected={audience === "client"}
            onClick={() => setAudience("client")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition",
              audience === "client"
                ? "bg-secondary text-[#FCF9F6]"
                : "text-[#5c534c] hover:text-secondary",
            )}
          >
            <Users className="size-4" aria-hidden />
            Clients
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={audience === "lawyer"}
            onClick={() => setAudience("lawyer")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition",
              audience === "lawyer"
                ? "bg-secondary text-[#FCF9F6]"
                : "text-[#5c534c] hover:text-secondary",
            )}
          >
            <Scale className="size-4" aria-hidden />
            Lawyers
          </button>
        </div>

        <p className="mt-6 max-w-2xl text-center font-sans text-base leading-relaxed text-[#5c534c]">
          <span className="font-semibold text-secondary">{copy.label}.</span>{" "}
          {copy.subtitle}
        </p>
      </div>

      <div
        className="mx-auto mt-12 grid w-full max-w-6xl gap-8 lg:grid-cols-3 lg:gap-6 xl:gap-8"
        role="tabpanel"
      >
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      <p className="mt-10 max-w-xl text-center text-sm text-[#8f8378]">{copy.note}</p>
    </section>
  );
}
