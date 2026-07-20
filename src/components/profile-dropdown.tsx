"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { logoutUser } from "@/lib/logout";
import { cn } from "@/lib/utils";

type ProfileDropdownProps = {
  email: string;
};

export function ProfileDropdown({ email }: ProfileDropdownProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initial = email.charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:ring-2 hover:ring-primary/40 hover:cursor-pointer"
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {initial}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card py-1.5 shadow-md"
        >
          <Link
            href="#"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(
              "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition",
              "hover:bg-muted hover:text-foreground",
            )}
          >
            <User className="size-4" />
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition",
              "hover:bg-muted hover:text-foreground hover:cursor-pointer",
            )}
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
