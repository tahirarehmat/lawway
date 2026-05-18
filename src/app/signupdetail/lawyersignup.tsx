"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Briefcase,
  ChevronDown,
  FileText,
  Hash,
  ImagePlus,
  MapPin,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  inputClassName,
  labelClassName,
  PENDING_SIGNUP_KEY,
  PendingSignup,
  PROVINCES,
  textareaClassName,
} from "@/lib/auth-form";
import { registerAccount } from "@/lib/signup-api";
import { toast } from "sonner";

export function LawyerSignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pending, setPending] = useState<PendingSignup | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) {
      router.replace("/signup");
      return;
    }
    try {
      const data = JSON.parse(raw) as PendingSignup;
      if (data.role !== "lawyer") {
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
    const barRegistrationNo = String(
      formData.get("bar_registration_no") ?? "",
    ).trim();
    const province = String(formData.get("province") ?? "").trim();
    const specialization = String(formData.get("specialization") ?? "").trim();
    const experienceYears = String(formData.get("experience_years") ?? "").trim();
    const officeAddress = String(formData.get("office_address") ?? "").trim();
    const bio = String(formData.get("bio") ?? "").trim();

    if (!barRegistrationNo) {
      setError("Bar Council registration number is required.");
      return;
    }

    if (!province) {
      setError("Province / jurisdiction is required.");
      return;
    }

    if (!specialization) {
      setError("Specialization is required.");
      return;
    }

    if (!experienceYears || Number(experienceYears) < 0) {
      setError("Enter a valid number of years of experience.");
      return;
    }

    if (!officeAddress) {
      setError("Office address is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      await registerAccount(pending, {
        bar_registration_no: barRegistrationNo,
        province,
        specialization,
        experience_years: Number(experienceYears),
        office_address: officeAddress,
        bio: bio || null,
        profile_photo_url: null,
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
    <div className="flex flex-col justify-center px-8 py-10 sm:max-h-[85vh] sm:overflow-y-auto sm:px-12 lg:px-14">
      <header className="mb-8">
        <h2 className="font-serif text-3xl font-medium tracking-tight text-primary sm:text-4xl">
          Lawyer Profile
        </h2>
        <p className="mt-2 text-sm text-signin-text">
          Provide your professional details for Bar Council verification.
        </p>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="bar_registration_no" className={labelClassName}>
            Bar Council registration number
          </label>
          <div className="relative">
            <Hash
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-signin-text-muted"
              aria-hidden
            />
            <input
              id="bar_registration_no"
              name="bar_registration_no"
              type="text"
              required
              placeholder="e.g. PB-12345"
              className={`${inputClassName} pr-4 pl-11`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="province" className={labelClassName}>
            Province / jurisdiction
          </label>
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-signin-text-muted"
              aria-hidden
            />
            <select
              id="province"
              name="province"
              required
              defaultValue=""
              className={`${inputClassName} appearance-none pr-10 pl-11`}
            >
              <option value="" disabled>
                Select province
              </option>
              {PROVINCES.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-signin-text-muted"
              aria-hidden
            />
          </div>
        </div>

        <div>
          <label htmlFor="specialization" className={labelClassName}>
            Specialization
          </label>
          <div className="relative">
            <Briefcase
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-signin-text-muted"
              aria-hidden
            />
            <input
              id="specialization"
              name="specialization"
              type="text"
              required
              placeholder="e.g. Family Law, Criminal, Civil"
              className={`${inputClassName} pr-4 pl-11`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="experience_years" className={labelClassName}>
            Years of experience
          </label>
          <div className="relative">
            <Award
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-signin-text-muted"
              aria-hidden
            />
            <input
              id="experience_years"
              name="experience_years"
              type="number"
              min={0}
              max={60}
              required
              placeholder="e.g. 5"
              className={`${inputClassName} pr-4 pl-11`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="office_address" className={labelClassName}>
            Office address
          </label>
          <textarea
            id="office_address"
            name="office_address"
            rows={2}
            required
            placeholder="Chamber / office address"
            className={textareaClassName}
          />
        </div>

        <div>
          <label htmlFor="profile_photo" className={labelClassName}>
            Profile photo{" "}
            <span className="normal-case text-signin-text-muted">(optional)</span>
          </label>
          <div className="relative">
            <ImagePlus
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-signin-text-muted"
              aria-hidden
            />
            <input
              id="profile_photo"
              name="profile_photo"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPhotoName(file?.name ?? null);
              }}
              className={`${inputClassName} cursor-pointer pr-4 pl-11 file:mr-3 file:rounded-sm file:border-0 file:bg-primary/20 file:px-2 file:py-1 file:text-xs file:text-primary`}
            />
          </div>
          {photoName ? (
            <p className="mt-1.5 text-xs text-signin-text-muted">{photoName}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="bio" className={labelClassName}>
            Short bio / about
          </label>
          <div className="relative">
            <FileText
              className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-signin-text-muted"
              aria-hidden
            />
            <textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder="A brief introduction for clients…"
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
          className="w-full rounded-sm bg-primary py-3.5 text-sm font-semibold tracking-wide text-secondary transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
