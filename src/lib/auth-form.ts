export const inputClassName =
  "w-full rounded-sm border border-signin-border bg-signin-input-bg py-3 text-sm text-signin-text placeholder:text-signin-text-muted/70 outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30";

export const labelClassName =
  "mb-2 block text-[11px] font-medium tracking-[0.14em] text-signin-text uppercase";

export const textareaClassName =
  "w-full resize-y rounded-sm border border-signin-border bg-signin-input-bg px-3 py-3 text-sm text-signin-text placeholder:text-signin-text-muted/70 outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30";

export const authScrollClassName = "scrollbar-themed";

export const PENDING_SIGNUP_KEY = "lawway_pending_signup";

export type PendingSignup = {
  email: string;
  password: string;
  role: "lawyer" | "client";
};

export const PROVINCES = [
  "Punjab",
  "Sindh",
  "KPK",
  "Balochistan",
  "ICT",
] as const;

export type Province = (typeof PROVINCES)[number];

export const SPECIALIZATIONS = [
  "Personal Injury Lawyers",
  "Family Law Attorneys",
  "Estate Planning & Probate Lawyers",
  "Corporate Lawyers",
  "Intellectual Property (IP) Lawyers",
  "Employment & Labor Lawyers",
  "Bankruptcy Lawyers",
  "Criminal Defense Lawyers",
  "Prosecutors",
  "Immigration Lawyers",
  "Civil Rights Lawyers",
  "Tax Lawyers",
  "Environmental Lawyers",
] as const;

export type Specialization = (typeof SPECIALIZATIONS)[number];
