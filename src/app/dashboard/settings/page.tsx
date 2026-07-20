import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { SettingsProfileForm } from "@/components/dashboard/settings-profile-form";

export default async function SettingsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  if (session.role !== "client" && session.role !== "lawyer") {
    redirect("/signin");
  }

  return (
    <DashboardShell session={session} activeItem="Settings">
      <div className="px-4 py-8 sm:px-10 lg:px-14">
        <SettingsProfileForm />
      </div>
    </DashboardShell>
  );
}
