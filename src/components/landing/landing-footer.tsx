import Link from "next/link";
import type { ReactNode } from "react";
import { LawwayLogo } from "@/components/lawway-logo";
import { cn } from "@/lib/utils";

const PLATFORM_LINKS = [
  { label: "Home", href: "/#home" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/plans" },
  { label: "Legal AI", href: "/#legal-ai" },
] as const;

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Cookie Policy", href: "#" },
] as const;

const CONTACT_LINKS = [
  { label: "Help Center", href: "#" },
  { label: "Contact Support", href: "mailto:support@lawway.pk" },
  { label: "For Lawyers", href: "/signup?role=lawyer" },
  { label: "For Clients", href: "/signup?role=client" },
] as const;

const SOCIAL_LINKS = [
  {
    label: "X (Twitter)",
    href: "https://x.com",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.062 2.062 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
] as const;

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        {title}
      </h3>
      <ul className="mt-5 space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
  external,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-[#f9f7f2]/70 transition hover:text-primary"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </Link>
    </li>
  );
}

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#3e2723] text-[#f9f7f2]">
      <div className="mx-auto max-w-6xl px-6 py-14 sm:px-10 lg:px-14 lg:py-9">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/#home"
              className="inline-flex items-center gap-3 transition-opacity hover:opacity-90"
              aria-label="Lawway Chambers home"
            >
              <LawwayLogo className="h-10 w-auto" />
              <span className="font-serif text-xl tracking-tight text-primary">
                Lawway
              </span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-[#f9f7f2]/65">
              Your comprehensive legal companion — connect with verified counsel,
              manage cases, and access AI-powered research in one secure portal.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-md border border-[#523d39]",
                    "text-[#f9f7f2]/70 transition hover:border-primary hover:text-primary",
                  )}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Platform">
            {PLATFORM_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Legal">
            {LEGAL_LINKS.map((link) => (
              <FooterLink key={link.label} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Contact">
            {CONTACT_LINKS.map((link) => (
              <FooterLink
                key={link.label}
                href={link.href}
                external={link.href.startsWith("mailto:")}
              >
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>
        </div>
      </div>

      <div className="border-t border-[#523d39]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row sm:px-10 lg:px-14">
          <p className="text-xs text-[#f9f7f2]/50">
            © {year} Lawway Chambers. All rights reserved.
          </p>
          <p
            className="bg-gradient-to-r from-primary via-[#e8d5a3] to-[#f9f7f2] bg-clip-text text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-transparent sm:text-right"
            aria-hidden
          >
            Empowering legal excellence
          </p>
        </div>
      </div>
    </footer>
  );
}
