import { AuthBrandPanel } from "@/components/auth-brand-panel";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-signin-page-bg text-signin-text">
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl overflow-hidden rounded-lg border border-signin-border/50 bg-signin-card-bg shadow-2xl shadow-black/40">
          <div className="grid lg:grid-cols-2 lg:items-stretch">
            <AuthBrandPanel description="Access your secure legal environment and manage your cases with precision." />
            <section className="border-t border-signin-border/50 lg:border-t-0 lg:border-l">
              <SignInForm />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
