import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { CaseRequestsView } from "@/components/dashboard/case-requests-view";

export default async function RequestsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  if (session.role !== "client" && session.role !== "lawyer") {
    redirect("/signin");
  }

  return (
    <DashboardShell session={session} activeItem="Requests">
      <div className="px-4 py-8 sm:px-10 lg:px-14">
        <CaseRequestsView
          role={session.role}
          lawyerUserId={session.role === "lawyer" ? session.userId : undefined}
        />
      </div>
    </DashboardShell>
  );
}
