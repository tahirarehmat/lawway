"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  Briefcase,
  Calendar,
  FileText,
  Inbox,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  DoorClosed,
  Plus,
  Scale,
  Search,
  Settings,
  CalendarDays,
} from "lucide-react";
import { logoutUser } from "@/lib/logout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SHARED_NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: LayoutGrid },
  { label: "Requests", href: "/dashboard/requests", icon: Inbox },
  { label: "My Cases", href: "/dashboard/cases", icon: Briefcase },
  { label: "Hearing Calendar", href: "#", icon: Calendar },
  { label: "Legal AI", href: "#", icon: Bot },
  { label: "Documents", href: "#", icon: FileText },
] as const;

const CLIENT_NAV_ITEMS = [
  { label: "Search", href: "/dashboard/search", icon: Search },
  { label: "Events", href: "/dashboard/events", icon: CalendarDays },
  { label: "Support", href: "/dashboard/tickets", icon: LifeBuoy },
] as const;

const LAWYER_NAV_ITEMS = [
  { label: "Messages", href: "/dashboard/tickets", icon: LifeBuoy },
] as const;

export type SidebarNavLabel =
  | (typeof SHARED_NAV_ITEMS)[number]["label"]
  | (typeof CLIENT_NAV_ITEMS)[number]["label"]
  | (typeof LAWYER_NAV_ITEMS)[number]["label"];

type SidebarProps = {
  role?: "client" | "lawyer";
  activeItem?: SidebarNavLabel;
  collapsed?: boolean;
  onToggle?: () => void;
};

function SidebarCollapseButton({ onCollapse }: { onCollapse: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onCollapse();
      }}
      className="group flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/[0.06] text-white/80 transition hover:border-primary/50 hover:bg-white/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      aria-label="Collapse sidebar"
      aria-expanded
    >
      <DoorClosed className="size-[1.125rem] transition group-hover:scale-105" aria-hidden />
    </button>
  );
}

export function Sidebar({
  role = "lawyer",
  activeItem = "Home",
  collapsed = false,
  onToggle,
}: SidebarProps) {
  const navItems =
    role === "client"
      ? [
          SHARED_NAV_ITEMS[0],
          ...CLIENT_NAV_ITEMS,
          ...SHARED_NAV_ITEMS.slice(1),
        ]
      : [
          SHARED_NAV_ITEMS[0],
          ...LAWYER_NAV_ITEMS,
          ...SHARED_NAV_ITEMS.slice(1),
        ];
  const router = useRouter();

  async function handleLogout() {
    const toastId = toast.loading("Logging out...");

    try {
      await logoutUser();
      toast.success("Logged out successfully", { id: toastId });
      router.push("/signin");
      router.refresh();
    } catch {
      toast.error("Failed to log out. Please try again.", { id: toastId });
    }
  }

  return (
    <aside
      onClick={collapsed && onToggle ? onToggle : undefined}
      onKeyDown={
        collapsed && onToggle
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle();
              }
            }
          : undefined
      }
      role={collapsed ? "button" : undefined}
      tabIndex={collapsed ? 0 : undefined}
      aria-label={collapsed ? "Expand sidebar" : undefined}
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#523d39] bg-secondary text-white transition-[width] duration-300 ease-in-out lg:flex",
        collapsed ? "w-[4.75rem] cursor-pointer" : "w-64",
      )}
    >
      <div
        className={cn(
          "border-b border-white/10",
          collapsed
            ? "flex justify-center px-3 py-4"
            : "flex items-start justify-between gap-2 px-4 py-5",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-center",
            collapsed ? "justify-center" : "gap-3",
          )}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Scale className="size-5 text-secondary" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-serif text-lg font-medium text-primary">
                Lawway Portal
              </p>
              <p className="mt-0.5 text-xs text-white/70">
                Legal Management System
              </p>
            </div>
          )}
        </div>
        {!collapsed && onToggle ? (
          <SidebarCollapseButton onCollapse={onToggle} />
        ) : null}
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col py-6",
          collapsed ? "items-center px-2" : "px-4",
        )}
      >
        {role === "client" ? (
          <Link
            href="/dashboard/requests/new"
            className={cn(
              "flex items-center justify-center rounded-lg bg-primary font-semibold text-secondary transition hover:bg-primary/90",
              collapsed ? "size-11 shrink-0" : "h-11 w-full text-sm",
            )}
            aria-label="New Case File"
            title="New Case File"
          >
            {collapsed ? <Plus className="size-5" /> : "+ New Case File"}
          </Link>
        ) : (
          <Link
            href="/dashboard/cases"
            className={cn(
              "flex items-center justify-center rounded-lg bg-primary font-semibold text-secondary transition hover:bg-primary/90",
              collapsed ? "size-11 shrink-0" : "h-11 w-full text-sm",
            )}
            aria-label="View cases"
            title="View cases"
          >
            {collapsed ? <Briefcase className="size-5" /> : "My case files"}
          </Link>
        )}

        <nav className={cn("space-y-1", collapsed ? "mt-4 w-full" : "mt-6 w-full")}>
          {navItems.map((item) => {
            const isActive = item.label === activeItem;

            return (
              <Link
                key={item.label}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={cn(
                  "flex items-center rounded-lg text-sm transition",
                  collapsed
                    ? "justify-center px-2 py-2.5"
                    : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-primary font-medium text-secondary"
                    : "text-white/85 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "mt-auto w-full space-y-1 border-t border-white/10 pt-6",
            collapsed && "flex flex-col items-center",
          )}
        >
          <Link
            href="#"
            title="Settings"
            aria-label="Settings"
            className={cn(
              "flex items-center rounded-lg text-sm text-white/85 transition hover:bg-white/10 hover:text-white",
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
            )}
          >
            <Settings className="size-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            title="Logout"
            aria-label="Logout"
            className={cn(
              "flex w-full items-center rounded-lg text-sm text-white/85 transition hover:cursor-pointer hover:bg-white/10 hover:text-white",
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
            )}
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
