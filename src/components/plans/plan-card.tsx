import Link from "next/link";
import { Check } from "lucide-react";
import type { Plan } from "@/lib/plans-data";
import { cn } from "@/lib/utils";

type PlanCardProps = {
  plan: Plan;
};

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PlanCard({ plan }: PlanCardProps) {
  const signupHref =
    plan.audience === "lawyer"
      ? `/signup?role=lawyer&plan=${plan.tier}`
      : `/signup?role=client&plan=${plan.tier}`;

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border p-8 ring-1 transition-all duration-300 ease-out lg:p-9",
        plan.highlighted
          ? "border-primary/50 bg-signin-card-bg shadow-[0_20px_60px_-20px_rgba(0,0,0,0.45)] ring-primary/30 hover:border-primary hover:shadow-[0_0_56px_-4px_rgba(212,175,55,0.65),0_16px_48px_-12px_rgba(212,175,55,0.35)] hover:ring-primary/60"
          : "border-[#ebe7e2] bg-white shadow-sm ring-transparent hover:border-primary/70 hover:shadow-[0_0_42px_-6px_rgba(212,175,55,0.55),0_12px_40px_-12px_rgba(212,175,55,0.22)] hover:ring-primary/45",
      )}
    >
      {plan.highlighted ? (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
          Most popular
        </span>
      ) : null}

      <div className="mb-6">
        <h2
          className={cn(
            "font-serif text-2xl font-semibold tracking-tight",
            plan.highlighted ? "text-signin-text" : "text-secondary",
          )}
        >
          {plan.name}
        </h2>
        <p
          className={cn(
            "mt-2 text-sm leading-relaxed",
            plan.highlighted ? "text-signin-text-muted" : "text-[#6b6560]",
          )}
        >
          {plan.description}
        </p>
      </div>

      <div className="mb-8">
        <p
          className={cn(
            "flex items-baseline gap-1 font-sans",
            plan.highlighted ? "text-signin-text" : "text-secondary",
          )}
        >
          <span className="text-sm font-medium text-primary">Rs</span>
          <span className="font-serif text-4xl font-semibold tracking-tight">
            {formatPrice(plan.priceMonthly)}
          </span>
          <span
            className={cn(
              "text-sm",
              plan.highlighted ? "text-signin-text-muted" : "text-[#8f8378]",
            )}
          >
            / month
          </span>
        </p>
      </div>

      <ul className="mb-10 flex flex-1 flex-col gap-3.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                plan.highlighted
                  ? "bg-primary/20 text-primary"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Check className="size-3" strokeWidth={2.5} aria-hidden />
            </span>
            <span
              className={cn(
                "text-sm leading-snug",
                plan.highlighted ? "text-signin-text" : "text-[#5c534c]",
              )}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={signupHref}
        className={cn(
          "inline-flex w-full items-center justify-center rounded-[4px] py-3.5 text-sm font-semibold tracking-wide transition",
          plan.highlighted
            ? "bg-primary text-secondary hover:bg-primary/90"
            : "bg-secondary text-[#FCF9F6] hover:bg-secondary/90",
        )}
      >
        Choose {plan.name}
      </Link>
    </article>
  );
}
