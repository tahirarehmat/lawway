import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AiAssistantSection } from "@/components/landing/ai-assistant-section";
import { PlatformFeaturesSection } from "@/components/landing/platform-features-section";
import { SiteHeader } from "@/components/layout/site-header";
import { LawwayLogo } from "@/components/lawway-logo";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-[#FCF9F6] text-[#2c2c2c]">
      <SiteHeader />

      <main className="flex flex-1 flex-col">
        <section className="px-6 pb-16 pt-4 sm:px-10 lg:px-14 lg:pb-24 lg:pt-8">
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
                  src="/hero-office.png"
                  alt="Executive chambers office with desk and leather chair"
                  width={720}
                  height={960}
                  className="aspect-[3/4] w-full object-cover sm:aspect-[4/5]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
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

        <AiAssistantSection />

        <PlatformFeaturesSection />
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
          <p className="text-xs tracking-wide text-[#8f8378]">
            © {new Date().getFullYear()} Lawway Chambers. All rights reserved.
          </p>
          <span className="hidden sm:block" aria-hidden />
        </div>
      </footer>
    </div>
  );
}
