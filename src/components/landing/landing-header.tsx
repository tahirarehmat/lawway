"use client";

import Link from "next/link";
import { LawwayLogo } from "@/components/lawway-logo";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/#home" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/plans" },
  { label: "Legal AI", href: "/#legal-ai" },
] as const;

const navLinkClass =
  "text-sm font-medium text-white/80 transition hover:text-white";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-[#3e2723] px-6 py-4 shadow-md sm:gap-6 sm:px-10 lg:px-14">
      <Link
        href="/#home"
        className="flex shrink-0 items-center gap-3 opacity-95 transition hover:opacity-100"
        aria-label="Lawway Chambers home"
      >
        <LawwayLogo className="h-11 w-auto sm:h-12" />
        <span className="font-serif text-xl tracking-tight text-primary sm:text-2xl">
          Lawway
        </span>
      </Link>

      <nav
        className="hidden flex-1 items-center justify-center gap-6 md:flex lg:gap-8"
        aria-label="Main navigation"
      >
        {NAV_LINKS.map((item) => (
          <Link key={item.href} href={item.href} className={navLinkClass}>
            {item.label}
          </Link>
        ))}
      </nav>

      <nav
        className="flex shrink-0 items-center gap-4 sm:gap-6"
        aria-label="Account"
      >
        <Link href="/signin" className={navLinkClass}>
          Sign in
        </Link>
        <Link
          href="/signup"
          className={cn(
            "rounded-[4px] bg-primary px-4 py-2.5 text-sm font-semibold tracking-wide text-secondary transition hover:bg-primary/90 sm:px-5",
          )}
        >
          Get started
        </Link>
      </nav>
    </header>
  );
}
