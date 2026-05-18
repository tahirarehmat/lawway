"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";
import { Navbar } from "@/app/components/layout/navbar";
import {
  Sidebar,
  type SidebarNavLabel,
} from "@/app/components/layout/sidebar";

type DashboardShellProps = {
  session: SessionPayload;
  activeItem?: SidebarNavLabel;
  showSupport?: boolean;
  /** Navbar text for /dashboard/tickets link */
  ticketsLinkLabel?: string;
  children: ReactNode;
};

export function DashboardShell({
  session,
  activeItem = "Home",
  showSupport = true,
  ticketsLinkLabel,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrolled(el.scrollTop > 0);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-tertiary">
      <Sidebar
        role={session.role === "client" ? "client" : "lawyer"}
        activeItem={activeItem}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar
          email={session.email}
          showSupport={showSupport}
          ticketsLinkLabel={ticketsLinkLabel}
          scrolled={scrolled}
        />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
