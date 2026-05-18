"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CreditCard, FileText } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  inputClassName,
  labelClassName,
  PENDING_SIGNUP_KEY,
  PendingSignup,
  textareaClassName,
} from "@/lib/auth-form";
import { registerAccount } from "@/lib/signup-api";
import { toast } from "sonner";

const CNIC_PATTERN = /^\d{5}-\d{7}-\d$/;

export function ClientSignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pending, setPending] = useState<PendingSignup | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) {
      router.replace("/signup");
      return;
    }
    try {
      const data = JSON.parse(raw) as PendingSignup;
      if (data.role !== "client") {
        router.replace(`/signupdetail?role=${data.role}`);
        return;
      }
      setPending(data);
    } catch {
      router.replace("/signup");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!pending) return;

    const formData = new FormData(event.currentTarget);
    const city = String(formData.get("city") ?? "").trim();
    const cnic = String(formData.get("cnic") ?? "").trim();
    const legalNeed = String(formData.get("legal_need") ?? "").trim();

    if (!city) {
      setError("City is required.");
      return;
    }

    if (!cnic) {
      setError("CNIC number is required.");
      return;
    }

    if (!CNIC_PATTERN.test(cnic)) {
      setError("CNIC must be in the format 00000-0000000-0.");
      return;
    }

    setIsSubmitting(true);

    try {
      await registerAccount(pending, {
        city,
        cnic,
        legal_need: legalNeed || null,
      });
      sessionStorage.removeItem(PENDING_SIGNUP_KEY);
      toast.success("Account created successfully");
      router.push("/signin");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!pending) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-8 py-10 text-sm text-signin-text-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center px-8 py-10 sm:px-12 lg:px-14">
      <header className="mb-8">
        <h2 className="font-serif text-3xl font-medium tracking-tight text-primary sm:text-4xl">
          Client Profile
        </h2>
        <p className="mt-2 text-sm text-signin-text">
          Tell us a little more so we can match you with the right lawyer.
        </p>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="cnic" className={labelClassName}>
            CNIC number
          </label>
          <div className="relative">
            <CreditCard
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-signin-text-muted"
              aria-hidden
            />
            <input
              id="cnic"
              name="cnic"
              type="text"
              required
              placeholder="00000-0000000-0"
              pattern={CNIC_PATTERN.source}
              className={`${inputClassName} pr-4 pl-11`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="city" className={labelClassName}>
            City / location
          </label>
          <div className="relative">
            <Building2
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-signin-text-muted"
              aria-hidden
            />
            <input
              id="city"
              name="city"
              type="text"
              required
              placeholder="e.g. Lahore"
              className={`${inputClassName} pr-4 pl-11`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="legal_need" className={labelClassName}>
            Legal need <span className="normal-case text-signin-text-muted">(optional)</span>
          </label>
          <div className="relative">
            <FileText
              className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-signin-text-muted"
              aria-hidden
            />
            <textarea
              id="legal_need"
              name="legal_need"
              rows={4}
              placeholder="Briefly describe your legal matter…"
              className={`${textareaClassName} pl-11`}
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-sm border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-sm bg-primary py-3.5 text-sm font-semibold tracking-wide text-secondary transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer"
        >
          {isSubmitting ? "Creating account…" : "Complete Registration"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-signin-text">
        <Link
          href="/signup"
          className="font-semibold text-primary transition hover:text-primary/80"
        >
          Back to sign up
        </Link>
      </p>

      <div className="mt-10 border-t border-signin-border/60 pt-6">
        <p className="text-center text-[10px] tracking-[0.18em] text-signin-text-muted uppercase">
          Secure legal portal • Encrypted session
        </p>
      </div>
    </div>
  );
}
