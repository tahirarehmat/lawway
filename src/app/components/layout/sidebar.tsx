"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  Briefcase,
  Calendar,
  FileText,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Plus,
  Scale,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/lib/logout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: LayoutGrid },
  { label: "Support", href: "/dashboard/tickets", icon: LifeBuoy },
  { label: "My Cases", href: "#", icon: Briefcase },
  { label: "Hearing Calendar", href: "#", icon: Calendar },
  { label: "Legal AI", href: "#", icon: Bot },
  { label: "Documents", href: "#", icon: FileText },
] as const;

type SidebarProps = {
  activeItem?: (typeof NAV_ITEMS)[number]["label"];
  collapsed?: boolean;
};

export function Sidebar({ activeItem = "Home", collapsed = false }: SidebarProps) {
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
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#523d39] bg-secondary text-white transition-[width] duration-300 ease-in-out lg:flex",
        collapsed ? "w-[4.75rem]" : "w-64",
      )}
    >
      <div
        className={cn(
          "border-b border-white/10",
          collapsed ? "flex justify-center px-3 py-5" : "px-6 py-6",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "items-start gap-3",
          )}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Scale className="size-5 text-secondary" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-serif text-lg font-medium text-primary">
                Lawway Portal
              </p>
              <p className="mt-0.5 text-xs text-white/70">
                Legal Management System
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col py-6",
          collapsed ? "items-center px-2" : "px-4",
        )}
      >
        <Button
          className={cn(
            "rounded-lg bg-primary text-secondary hover:bg-primary/90",
            collapsed
              ? "size-11 shrink-0 p-0"
              : "h-11 w-full text-sm font-semibold",
          )}
          aria-label="New Case File"
          title="New Case File"
        >
          {collapsed ? (
            <Plus className="size-5" />
          ) : (
            "+ New Case File"
          )}
        </Button>

        <nav className={cn("space-y-1", collapsed ? "mt-4 w-full" : "mt-6 w-full")}>
          {NAV_ITEMS.map((item) => {
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
            onClick={handleLogout}
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
