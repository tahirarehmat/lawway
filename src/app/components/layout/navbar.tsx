"use client";

import Link from "next/link";
import { Bell, Settings } from "lucide-react";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { cn } from "@/lib/utils";

type NavbarProps = {
  email: string;
  showSupport?: boolean;
  scrolled?: boolean;
};

export function Navbar({
  email,
  showSupport = true,
  scrolled = false,
}: NavbarProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-end border-b px-4 py-3 transition-colors duration-300 sm:px-8",
        scrolled
          ? "border-white/10 bg-secondary"
          : "border-black/5 bg-white",
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {showSupport && (
          <Link
            href="/dashboard/tickets"
            className={cn(
              "hidden text-sm transition sm:block",
              scrolled
                ? "text-white/70 hover:text-white"
                : "text-neutral/70 hover:text-secondary",
            )}
          >
            Support
          </Link>
        )}
        <button
          type="button"
          className={cn(
            "transition",
            scrolled
              ? "text-white/70 hover:text-white"
              : "text-neutral/60 hover:text-secondary",
          )}
          aria-label="Notifications"
        >
          <Bell className="size-5" />
        </button>
        <button
          type="button"
          className={cn(
            "transition",
            scrolled
              ? "text-white/70 hover:text-white"
              : "text-neutral/60 hover:text-secondary",
          )}
          aria-label="Settings"
        >
          <Settings className="size-5" />
        </button>
        <ProfileDropdown email={email} />
      </div>
    </header>
  );
}
