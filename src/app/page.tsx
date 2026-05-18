import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AiAssistantSection } from "@/components/landing/ai-assistant-section";
import { LandingHeader } from "@/components/landing/landing-header";
import { PlatformFeaturesSection } from "@/components/landing/platform-features-section";
import { LawwayLogo } from "@/components/lawway-logo";
import { LandingSupportWidget } from "@/components/landing/LandingSupportWidget";
import { LandingFooter } from "@/components/landing/landing-footer";
import PlansPage from "@/app/plans/page";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-[#FCF9F6] text-[#2c2c2c]">
      <LandingHeader />

      <main className="flex flex-1 flex-col">
        <section
          id="home"
          className="scroll-mt-20 px-6 pb-16 pt-4 sm:px-10 lg:px-14 lg:pb-24 lg:pt-8"
        >
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
            <div className="flex flex-col justify-center lg:py-8">
              <p className="mb-6 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                The authority in digital jurisprudence
              </p>
              <h1 className="font-serif text-[2rem] font-semibold leading-[1.12] tracking-tight text-secondary sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Modern Legal Solutions{" "}
                <span className="font-normal italic text-primary">
                  Refined
                </span>{" "}
                for Excellence.
              </h1>
              <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-[#5c534c] sm:text-lg">
                A centralized ecosystem where legal expertise meets modern
                precision. Manage high-stakes cases, access streamlined research,
                and collaborate with absolute security.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/signup?role=lawyer"
                  className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-secondary px-7 py-3.5 font-sans text-sm font-semibold tracking-wide text-[#FCF9F6] transition hover:bg-secondary/90"
                >
                  Join as a Lawyer
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href="/signup?role=client"
                  className="inline-flex items-center justify-center rounded-[4px] border border-primary bg-transparent px-7 py-3.5 font-sans text-sm font-semibold tracking-wide text-primary transition hover:bg-primary/10"
                >
                  Register as a Client
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none lg:justify-self-end">
              <div className="relative overflow-hidden rounded-lg shadow-[0_24px_60px_-12px_rgba(46,39,35,0.35)]">
                <Image
                  src="/office.png"
                  alt="Executive chambers office with desk and leather chair"
                  width={720}
                  height={720}
                  className="w-full object-cover"
                  
                  priority
                />
                <div className="absolute bottom-6 left-6 max-w-[min(calc(100%-3rem),280px)] rounded-lg border border-black/[0.06] bg-white p-5 shadow-lg">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Lawway Chambers
                  </p>
                  <p className="mt-2 font-serif text-lg font-semibold text-secondary">
                    Your Virtual Chambers
                  </p>
                  <p className="mt-1 font-sans text-xs text-[#8f8378]">
                    Secure access from any device
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PlatformFeaturesSection />

        <PlansPage />

        <AiAssistantSection />
      </main>

      <LandingFooter />
    </div>
  );
}
