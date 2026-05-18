"use client";

import Link from "next/link";
import { Bell, Menu, Settings } from "lucide-react";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { cn } from "@/lib/utils";

type NavbarProps = {
  email: string;
  showSupport?: boolean;
  scrolled?: boolean;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

export function Navbar({
  email,
  showSupport = true,
  scrolled = false,
  sidebarCollapsed = false,
  onToggleSidebar,
}: NavbarProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between border-b px-4 py-3 transition-colors duration-300 sm:px-8",
        scrolled
          ? "border-white/10 bg-secondary"
          : "border-black/5 bg-white",
      )}
    >
      <button
        type="button"
        onClick={onToggleSidebar}
        className={cn(
          "rounded-md p-1.5 transition",
          scrolled
            ? "text-white/70 hover:bg-white/10 hover:text-white"
            : "text-neutral/60 hover:bg-black/5 hover:text-secondary",
        )}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!sidebarCollapsed}
      >
        <Menu className="size-5" />
      </button>

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
