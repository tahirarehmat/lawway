import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { CasesList } from "@/components/dashboard/cases-list";

export default async function CasesPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  if (session.role !== "client" && session.role !== "lawyer") {
    redirect("/signin");
  }

  return (
    <DashboardShell session={session} activeItem="My Cases">
      <div className="px-4 py-8 sm:px-10 lg:px-14">
        <CasesList role={session.role} />
      </div>
    </DashboardShell>
  );
}
