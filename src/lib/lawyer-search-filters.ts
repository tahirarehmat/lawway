import { PROVINCES, SPECIALIZATIONS } from "@/lib/auth-form";

export { PROVINCES, SPECIALIZATIONS };

export const EXPERIENCE_FILTER_OPTIONS = [
  { value: "", label: "Any experience" },
  { value: "0-2", label: "Up to 2 years", minYears: 0, maxYears: 2 },
  { value: "3-5", label: "3–5 years", minYears: 3, maxYears: 5 },
  { value: "6-10", label: "6–10 years", minYears: 6, maxYears: 10 },
  { value: "11-15", label: "11–15 years", minYears: 11, maxYears: 15 },
  { value: "16+", label: "16+ years", minYears: 16, maxYears: null },
] as const;

export type ExperienceFilterValue =
  (typeof EXPERIENCE_FILTER_OPTIONS)[number]["value"];

export function parseExperienceFilter(value: string): {
  minYears?: number;
  maxYears?: number;
} {
  const option = EXPERIENCE_FILTER_OPTIONS.find((item) => item.value === value);
  if (!option?.value) return {};
  return {
    minYears: option.minYears,
    maxYears: option.maxYears ?? undefined,
  };
}

export function isValidProvince(value: string): boolean {
  return (PROVINCES as readonly string[]).includes(value);
}

export function isValidSpecialization(value: string): boolean {
  return (SPECIALIZATIONS as readonly string[]).includes(value);
}

export function isValidExperienceFilter(value: string): boolean {
  return EXPERIENCE_FILTER_OPTIONS.some((item) => item.value === value);
}
