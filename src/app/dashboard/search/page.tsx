import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { ClientLawyerSearch } from "@/components/dashboard/client-lawyer-search";

export default async function ClientSearchPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  if (session.role !== "client") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell session={session} activeItem="Search" showSupport>
      <main className="px-4 py-8 sm:px-8">
        <ClientLawyerSearch />
      </main>
    </DashboardShell>
  );
}
