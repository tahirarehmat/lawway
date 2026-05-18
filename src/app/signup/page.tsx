import Image from "next/image";
import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

function BrandDecoration() {
  return (
    <div className="mt-auto flex flex-col items-center gap-1.5 pt-10">
      <span className="h-0.5 w-8 rounded-full bg-primary/80" />
      <span className="h-0.5 w-5 rounded-full bg-primary/50" />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-signin-page-bg text-signin-text">
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl overflow-hidden rounded-lg border border-signin-border/50 bg-signin-card-bg shadow-2xl shadow-black/40">
          <div className="grid lg:grid-cols-2">
            <section className="flex flex-col items-center bg-signin-panel-bg px-8 py-10 text-center sm:px-12 lg:px-14">
              <div className="relative mx-auto mb-8 aspect-square w-full max-w-[220px] overflow-hidden rounded-md border border-signin-border/40 bg-black/40">
                <Image
                  src="/gavelbg.png"
                  alt="Judge's gavel on a sound block"
                  fill
                  className="object-cover"
                  sizes="220px"
                  priority
                />
              </div>
              <h1 className="font-serif text-2xl font-medium tracking-tight text-primary sm:text-3xl">
                Chambers of Excellence
              </h1>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-signin-text">
                Create your account and connect with trusted legal professionals
                across Pakistan.
              </p>
              <BrandDecoration />
            </section>

            <section className="border-t border-signin-border/50 lg:border-t-0 lg:border-l">
              <SignUpForm />
            </section>
          </div>
        </div>
      </main>

      {/* <footer className="flex flex-col items-center justify-between gap-3 px-6 pb-6 text-[11px] text-signin-text-muted sm:flex-row">
        <p>© 2024 Lawway Chambers. All rights reserved.</p>
        <div className="flex items-center gap-5">
          <Link href="#" className="transition hover:text-signin-text">
            Privacy Policy
          </Link>
          <Link href="#" className="transition hover:text-signin-text">
            Terms of Service
          </Link>
        </div>
      </footer> */}
    </div>
  );
}
