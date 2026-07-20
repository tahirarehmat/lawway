"use client";

import { Briefcase, Clock, MapPin, SlidersHorizontal } from "lucide-react";
import {
  EXPERIENCE_FILTER_OPTIONS,
  PROVINCES,
  SPECIALIZATIONS,
} from "@/lib/lawyer-search-filters";
import { LawyerSearchSelect } from "@/components/dashboard/lawyer-search-select";
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

function FilterField({
  id,
  label,
  icon,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="min-w-0 flex-1">
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
      >
        {label}
      </label>
      <LawyerSearchSelect
        id={id}
        value={value}
        onChange={onChange}
        options={options}
        icon={icon}
        aria-label={label}
      />
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
        "rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-foreground">
          <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
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

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
        <FilterField
          id="filter-province"
          label="Location"
          icon={<MapPin className="size-4" aria-hidden />}
          value={values.province}
          onChange={(province) => onChange({ ...values, province })}
          options={[
            { value: "", label: "All provinces" },
            ...PROVINCES.map((item) => ({ value: item, label: item })),
          ]}
        />
        <FilterField
          id="filter-experience"
          label="Experience"
          icon={<Clock className="size-4" aria-hidden />}
          value={values.experience}
          onChange={(experience) => onChange({ ...values, experience })}
          options={EXPERIENCE_FILTER_OPTIONS.map((item) => ({
            value: item.value,
            label: item.label,
          }))}
        />
        <FilterField
          id="filter-specialization"
          label="Type of lawyer"
          icon={<Briefcase className="size-4" aria-hidden />}
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
