import Link from "next/link";
import { LawwayLogo } from "@/components/lawway-logo";

type SiteHeaderProps = {
  activePath?: "/" | "/plans";
};

export function SiteHeader({ activePath }: SiteHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-6 px-6 py-8 sm:px-10 lg:px-14">
      <Link
        href="/"
        className="flex items-center gap-3 opacity-95 transition hover:opacity-100"
        aria-label="Lawway Chambers home"
      >
        <LawwayLogo className="h-11 w-auto sm:h-12" />
        <span className="font-serif text-xl tracking-tight text-secondary sm:text-2xl">
          Lawway
        </span>
      </Link>
      <nav className="flex items-center gap-4 sm:gap-6">
        <Link
          href="/plans"
          className={`text-sm font-medium transition ${
            activePath === "/plans"
              ? "text-secondary"
              : "text-[#5c534c] hover:text-secondary"
          }`}
        >
          Plans
        </Link>
        <Link
          href="/signin"
          className="text-sm font-medium text-[#5c534c] transition hover:text-secondary"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-[4px] bg-secondary px-4 py-2.5 text-sm font-semibold tracking-wide text-[#FCF9F6] transition hover:bg-secondary/90 sm:px-5"
        >
          Get started
        </Link>
      </nav>
    </header>
  );
}
