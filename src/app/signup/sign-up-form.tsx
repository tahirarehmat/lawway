"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Eye, EyeOff, Lock, Mail, UserCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import {
  inputClassName,
  labelClassName,
  PENDING_SIGNUP_KEY,
} from "@/lib/auth-form";

const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

type UserRole = "lawyer" | "client";

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Za-z]/.test(password)) {
    return "Password must include at least one letter.";
  }
  if (!/\d/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one special character.";
  }
  return null;
}

export function SignUpForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("client");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const selectedRole = String(formData.get("role") ?? "") as UserRole;

    if (!email) {
      setError("Email is required.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (selectedRole !== "lawyer" && selectedRole !== "client") {
      setError("Please select a valid role.");
      return;
    }

    sessionStorage.setItem(
      PENDING_SIGNUP_KEY,
      JSON.stringify({ email, password, role: selectedRole }),
    );
    router.push(`/signupdetail?role=${selectedRole}`);
  }

  return (
    <div className="flex flex-col justify-center px-8 py-10 sm:px-12 lg:px-14">
      <header className="mb-8">
        <h2 className="font-serif text-3xl font-medium tracking-tight text-primary sm:text-4xl">
          Create Account
        </h2>
        <p className="mt-2 text-sm text-signin-text">
          Join Lawway Chambers and access your secure legal portal.
        </p>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email" className={labelClassName}>
            Email address
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-signin-text-muted"
              aria-hidden
            />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className={`${inputClassName} pr-4 pl-11`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className={labelClassName}>
            Password
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-signin-text-muted"
              aria-hidden
            />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              pattern={PASSWORD_PATTERN.source}
              placeholder="Min. 8 chars, letter, number & symbol"
              className={`${inputClassName} pr-11 pl-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-signin-text-muted transition hover:text-signin-text"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-signin-text-muted">
            Use 8+ characters with letters, numbers, and a special character.
          </p>
        </div>

        <div>
          <label htmlFor="role" className={labelClassName}>
            Role
          </label>
          <div className="relative">
            <UserCircle
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-signin-text-muted"
              aria-hidden
            />
            <select
              id="role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              required
              className={`${inputClassName} appearance-none pr-10 pl-11`}
            >
              <option value="client">Client</option>
              <option value="lawyer">Lawyer</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-signin-text-muted"
              aria-hidden
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
          className="w-full rounded-sm bg-primary py-3.5 text-sm font-semibold tracking-wide text-secondary transition hover:bg-primary/90 hover:cursor-pointer"
        >
          Sign Up
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-signin-text">
        Already have an account?{" "}
        <Link
          href="/signin"
          className="font-semibold text-primary transition hover:text-primary/80"
        >
          Sign In
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
