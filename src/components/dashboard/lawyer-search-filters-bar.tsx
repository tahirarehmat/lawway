"use client";

import { Briefcase, Clock, MapPin, SlidersHorizontal } from "lucide-react";
import {
  EXPERIENCE_FILTER_OPTIONS,
  PROVINCES,
  SPECIALIZATIONS,
} from "@/lib/lawyer-search-filters";
import { cn } from "@/lib/utils";

export type LawyerSearchFilterValues = {
  province: string;
  experience: string;
  specialization: string;
};

type LawyerSearchFiltersBarProps = {
  values: LawyerSearchFilterValues;
  onChange: (values: LawyerSearchFilterValues) => void;
  onClear: () => void;
  className?: string;
};

const selectClassName =
  "w-full appearance-none rounded-lg border border-black/10 bg-[#faf9f7] py-2.5 pr-9 pl-9 text-sm text-secondary outline-none transition focus:border-primary/50 focus:ring-1 focus:ring-primary/30";

function FilterSelect({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  icon: typeof MapPin;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-medium tracking-wide text-neutral/50 uppercase">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral/40"
          aria-hidden
        />
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={selectClassName}
        >
          {options.map((option) => (
            <option key={option.value || "any"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function LawyerSearchFiltersBar({
  values,
  onChange,
  onClear,
  className,
}: LawyerSearchFiltersBarProps) {
  const hasActiveFilters = Boolean(
    values.province || values.experience || values.specialization,
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-black/5 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-secondary">
          <SlidersHorizontal className="size-4 text-primary" aria-hidden />
          <span className="text-sm font-medium">Filters</span>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-primary hover:text-primary/80"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
        <FilterSelect
          id="filter-province"
          label="Location"
          icon={MapPin}
          value={values.province}
          onChange={(province) => onChange({ ...values, province })}
          options={[
            { value: "", label: "All provinces" },
            ...PROVINCES.map((item) => ({ value: item, label: item })),
          ]}
        />
        <FilterSelect
          id="filter-experience"
          label="Experience"
          icon={Clock}
          value={values.experience}
          onChange={(experience) => onChange({ ...values, experience })}
          options={EXPERIENCE_FILTER_OPTIONS.map((item) => ({
            value: item.value,
            label: item.label,
          }))}
        />
        <FilterSelect
          id="filter-specialization"
          label="Type of lawyer"
          icon={Briefcase}
          value={values.specialization}
          onChange={(specialization) => onChange({ ...values, specialization })}
          options={[
            { value: "", label: "All types" },
            ...SPECIALIZATIONS.map((item) => ({ value: item, label: item })),
          ]}
        />
      </div>
    </div>
  );
}
