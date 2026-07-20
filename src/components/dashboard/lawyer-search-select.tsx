"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type LawyerSearchSelectOption = {
  value: string;
  label: string;
};

type LawyerSearchSelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: LawyerSearchSelectOption[];
  icon?: ReactNode;
  "aria-label"?: string;
};

export function LawyerSearchSelect({
  id,
  value,
  onChange,
  options,
  icon,
  "aria-label": ariaLabel,
}: LawyerSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);

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

  return (
    <div ref={containerRef} className="relative">
      {icon ? (
        <span
          className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        >
          {icon}
        </span>
      ) : null}

      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-border bg-card py-2.5 text-left text-sm text-foreground outline-none transition",
          icon ? "pr-9 pl-9" : "px-3.5 pr-9",
          open && "border-primary ring-2 ring-ring/30",
        )}
      >
        <span className="truncate">{selected?.label ?? "Select…"}</span>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={id}
          className="scrollbar-hidden absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-[0_12px_32px_rgba(28,25,23,0.08)]"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <li key={option.value || "any"} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2.5 text-left text-sm transition",
                    isSelected
                      ? "bg-primary/15 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
