"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { inputClassName } from "@/lib/auth-form";
import { cn } from "@/lib/utils";

export type AuthSelectOption = {
  value: string;
  label: string;
};

type AuthSelectProps = {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: AuthSelectOption[];
  required?: boolean;
  placeholder?: string;
  icon?: ReactNode;
};

export function AuthSelect({
  id,
  name,
  value,
  onChange,
  options,
  required,
  placeholder,
  icon,
}: AuthSelectProps) {
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
      <input type="hidden" name={name} value={value} required={required} />

      {icon ? (
        <span
          className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-signin-text-muted"
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
        onClick={() => setOpen((current) => !current)}
        className={cn(
          inputClassName,
          "flex w-full items-center justify-between text-left",
          icon ? "pr-10 pl-11" : "px-4 pr-10",
          open && "border-primary/60 ring-1 ring-primary/30",
        )}
      >
        <span className={cn(!selected && placeholder && "text-signin-text-muted/70")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-signin-text-muted transition-transform",
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
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-signin-border bg-signin-panel-bg py-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm transition",
                    isSelected
                      ? "bg-primary/20 font-medium text-primary"
                      : "text-signin-text hover:bg-[#523d39] hover:text-signin-text",
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
