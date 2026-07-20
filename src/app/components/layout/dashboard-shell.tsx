"use client";

import { useState, type ReactNode } from "react";
import type { SessionPayload } from "@/lib/session";
import {
  Sidebar,
  type SidebarNavLabel,
} from "@/app/components/layout/sidebar";

type DashboardShellProps = {
  session: SessionPayload;
  activeItem?: SidebarNavLabel;
  showSupport?: boolean;
  /** Kept for call-site compatibility; top bar was removed */
  ticketsLinkLabel?: string;
  children: ReactNode;
};

export function DashboardShell({
  session,
  activeItem = "Home",
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
      <div className="dashboard-grid-bg min-h-0 min-w-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
