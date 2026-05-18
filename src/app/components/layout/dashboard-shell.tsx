"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";
import { Navbar } from "@/app/components/layout/navbar";
import { Sidebar } from "@/app/components/layout/sidebar";

type DashboardShellProps = {
  session: SessionPayload;
  activeItem?:
    | "Home"
    | "My Cases"
    | "Hearing Calendar"
    | "Legal AI"
    | "Documents"
    | "Support";
  showSupport?: boolean;
  children: ReactNode;
};

export function DashboardShell({
  session,
  activeItem = "Home",
  showSupport = true,
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
      <Sidebar activeItem={activeItem} collapsed={collapsed} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar
          email={session.email}
          showSupport={showSupport}
          scrolled={scrolled}
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((prev) => !prev)}
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
