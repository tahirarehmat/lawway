"use client";

import Link from "next/link";
import { Bell, Settings } from "lucide-react";
import { ProfileDropdown } from "@/components/profile-dropdown";

type NavbarProps = {
  email: string;
  showSupport?: boolean;
  /** Top-link label for /dashboard/tickets (e.g. “Messages” for advocates) */
  ticketsLinkLabel?: string;
};

export function Navbar({
  email,
  showSupport = true,
  ticketsLinkLabel = "Support",
}: NavbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-border bg-card px-4 sm:px-8">
      <div className="flex items-center gap-2 sm:gap-3">
        {showSupport && (
          <Link
            href="/dashboard/tickets"
            className="hidden rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground sm:block"
          >
            {ticketsLinkLabel}
          </Link>
        )}
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-[1.15rem]" />
        </button>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="size-[1.15rem]" />
        </button>
        <ProfileDropdown email={email} />
      </div>
    </header>
  );
}
