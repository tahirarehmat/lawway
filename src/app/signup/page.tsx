import { AuthBrandPanel } from "@/components/auth-brand-panel";
import { SignUpForm } from "./sign-up-form";

type SignUpPageProps = {
  searchParams: Promise<{ role?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const initialRole =
    params.role === "lawyer" || params.role === "client"
      ? params.role
      : undefined;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-signin-page-bg text-signin-text">
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl overflow-hidden rounded-lg border border-signin-border/50 bg-signin-card-bg shadow-2xl shadow-black/40">
          <div className="grid lg:grid-cols-2 lg:items-stretch">
            <AuthBrandPanel description="Create your account and connect with trusted legal professionals across Pakistan." />
            <section className="border-t border-signin-border/50 lg:border-t-0 lg:border-l">
              <SignUpForm initialRole={initialRole} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
