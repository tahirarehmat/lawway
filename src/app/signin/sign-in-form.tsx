"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  clearRememberedDevice,
  getRememberedDevice,
  saveRememberedDevice,
} from "@/lib/remember-device";
import { signInAccount } from "@/lib/signin-api";
import { toast } from "sonner";

export function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const remembered = getRememberedDevice();
    if (remembered) {
      setRememberDevice(true);
      setEmail(remembered.email);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!submittedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      await signInAccount({
        email: submittedEmail,
        password,
        rememberDevice,
      });

      if (rememberDevice) {
        saveRememberedDevice(submittedEmail);
      } else {
        clearRememberedDevice();
      }

      toast.success("Signed in successfully");
      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Sign in failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRememberChange(checked: boolean) {
    setRememberDevice(checked);
    if (!checked) {
      clearRememberedDevice();
    }
  }

  return (
    <div className="flex flex-col justify-center px-8 py-10 sm:px-12 lg:px-14">
      <header className="mb-8">
        <h2 className="font-serif text-3xl font-medium tracking-tight text-primary sm:text-4xl">
          Welcome Back
        </h2>
        <p className="mt-2 text-sm text-signin-text">
          Please enter your credentials to proceed.
        </p>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-[11px] font-medium tracking-[0.14em] text-signin-text uppercase"
          >
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="attorney@lawway.com"
              className="w-full rounded-sm border border-signin-border bg-signin-input-bg py-3 pr-4 pl-11 text-sm text-signin-text placeholder:text-signin-text-muted/70 outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="block text-[11px] font-medium tracking-[0.14em] text-signin-text uppercase"
            >
              Password
            </label>
            <Link
              href="#"
              className="text-[10px] font-medium tracking-[0.12em] text-primary uppercase transition hover:text-primary/80"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-signin-text-muted"
              aria-hidden
            />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={rememberDevice ? "current-password" : "password"}
              required
              placeholder="••••••••"
              className="w-full rounded-sm border border-signin-border bg-signin-input-bg py-3 pr-11 pl-11 text-sm text-signin-text placeholder:text-signin-text-muted/70 outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
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
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-signin-text">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(event) => handleRememberChange(event.target.checked)}
            className="size-3.5 rounded-sm border border-signin-border bg-signin-input-bg accent-primary"
          />
          Remember this device
        </label>

        {error ? (
          <p className="rounded-sm border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-sm bg-primary py-3.5 text-sm font-semibold tracking-wide text-secondary transition hover:bg-primary/90 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-signin-text">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-primary transition hover:text-primary/80 hover:cursor-pointer"
        >
          Sign Up
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
