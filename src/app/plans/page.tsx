import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpCircle, Coins, HardDrive, Mail } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { LawwayLogo } from "@/components/lawway-logo";
import { PlansSection } from "@/components/plans/plans-section";

export const metadata: Metadata = {
  title: "Plans | Lawway Chambers",
  description:
    "Client and lawyer plans for Lawway Chambers—storage, cases, and client intake tailored to your role.",
};

export default function PlansPage() {
  return (
    <div className="flex min-h-full flex-col bg-[#FCF9F6] text-[#2c2c2c]">
      <SiteHeader activePath="/plans" />

      <main className="flex flex-1 flex-col">
        <section className="px-6 pb-12 pt-4 text-center sm:px-10 lg:px-14 lg:pb-8">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Transparent pricing
          </p>
          <h1 className="mx-auto mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-tight text-secondary sm:text-4xl lg:text-5xl">
            Plans for{" "}
            <span className="italic text-primary">clients</span> and{" "}
            <span className="italic text-primary">lawyers</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl font-sans text-base leading-relaxed text-[#5c534c] sm:text-lg">
            Monthly billing in Pakistani Rupees. Clients post matters; lawyers
            receive qualified intake through the platform—each with plans sized
            to their needs.
          </p>
        </section>

        <PlansSection />

        <section className="border-y border-[#ebe7e2] bg-white/60 px-6 py-14 sm:px-10 lg:px-14 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-secondary sm:text-3xl">
              Need more than your plan includes?
            </h2>
            <p className="mt-4 font-sans text-base leading-relaxed text-[#5c534c]">
              If you exceed storage or your monthly request allowance—whether
              you are posting requests as a client or accepting them as a
              lawyer—you can upgrade your plan or purchase credits to top up
              without switching tiers.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
            <div className="flex gap-4 rounded-xl border border-[#ebe7e2] bg-white p-6 shadow-sm">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HardDrive className="size-5" strokeWidth={1.5} aria-hidden />
              </div>
              <div className="text-left">
                <h3 className="font-serif text-lg font-semibold text-secondary">
                  Storage exceeded
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6b6560]">
                  Upgrade for a larger vault, or buy storage credits to keep
                  uploading documents immediately.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-[#ebe7e2] bg-white p-6 shadow-sm">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Coins className="size-5" strokeWidth={1.5} aria-hidden />
              </div>
              <div className="text-left">
                <h3 className="font-serif text-lg font-semibold text-secondary">
                  Request limit reached
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6b6560]">
                  Clients can buy more initial requests; lawyers can add credits
                  to accept additional client intake.
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-xl border border-primary/25 bg-[#FCF9F6] px-6 py-5 text-center">
            <ArrowUpCircle className="size-6 text-primary" aria-hidden />
            <p className="text-sm leading-relaxed text-[#5c534c]">
              Credits and upgrades will be available from your dashboard once
              billing is connected.
            </p>
            <Link
              href="/signup"
              className="text-sm font-semibold text-primary transition hover:text-primary/80"
            >
              Create an account to get started →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#ebe7e2] bg-[#FAF9F6] px-6 py-12 sm:py-10 lg:px-14">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 text-center sm:grid-cols-[1fr_auto_1fr] sm:gap-6">
          <Link
            href="/"
            className="justify-self-center transition-opacity hover:opacity-90 sm:justify-self-start"
            aria-label="Lawway Chambers home"
          >
            <LawwayLogo className="h-9 w-auto" />
          </Link>
          <p className="flex items-center justify-center gap-2 text-xs tracking-wide text-[#8f8378]">
            <Mail className="size-3.5 shrink-0" aria-hidden />
            Questions? Contact your chamber administrator
          </p>
          <span className="hidden sm:block" aria-hidden />
        </div>
      </footer>
    </div>
  );
}
