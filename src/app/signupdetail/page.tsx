import { redirect } from "next/navigation";
import { AuthPageShell } from "./auth-page-shell";
import { ClientSignupForm } from "./clientsignup";
import { LawyerSignupForm } from "./lawyersignup";

type SignupDetailPageProps = {
  searchParams: Promise<{ role?: string }>;
};

export default async function SignupDetailPage({
  searchParams,
}: SignupDetailPageProps) {
  const { role } = await searchParams;

  if (role === "client") {
    return (
      <AuthPageShell brandDescription="Complete your client profile to find the right legal counsel for your needs.">
        <ClientSignupForm />
      </AuthPageShell>
    );
  }

  if (role === "lawyer") {
    return (
      <AuthPageShell brandDescription="Complete your advocate profile for Bar Council verification and client discovery.">
        <LawyerSignupForm />
      </AuthPageShell>
    );
  }

  redirect("/signup");
}
