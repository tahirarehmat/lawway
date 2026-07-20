"use client";

import { useState, type ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";
import {
  Sidebar,
  type SidebarNavLabel,
} from "@/app/components/layout/sidebar";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  session: SessionPayload;
  activeItem?: SidebarNavLabel;
  showSupport?: boolean;
  /** Kept for call-site compatibility; top bar was removed */
  ticketsLinkLabel?: string;
  /** Fill viewport height without page scroll (chat / messaging UIs) */
  fillViewport?: boolean;
  children: ReactNode;
};

export function DashboardShell({
  session,
  activeItem = "Home",
  fillViewport = false,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#16100c]">
      <Sidebar
        role={session.role === "client" ? "client" : "lawyer"}
        activeItem={activeItem}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      <div
        className={cn(
          "dashboard-grid-bg min-h-0 min-w-0 flex-1",
          fillViewport ? "flex flex-col overflow-hidden" : "overflow-y-auto",
        )}
      >
        {children}
      </div>
    </div>
  );
}
