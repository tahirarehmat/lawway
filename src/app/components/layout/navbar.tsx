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
    <header className="flex shrink-0 items-center justify-end border-b border-[#523d39] bg-[#3e2723] px-4 py-3 sm:px-8">
      <div className="flex items-center gap-3 sm:gap-4">
        {showSupport && (
          <Link
            href="/dashboard/tickets"
            className="hidden text-sm text-white/70 transition hover:text-white sm:block"
          >
            {ticketsLinkLabel}
          </Link>
        )}
        <button
          type="button"
          className="text-white/70 transition hover:text-white"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
        </button>
        <button
          type="button"
          className="text-white/70 transition hover:text-white"
          aria-label="Settings"
        >
          <Settings className="size-5" />
        </button>
        <ProfileDropdown email={email} />
      </div>
    </header>
  );
}
