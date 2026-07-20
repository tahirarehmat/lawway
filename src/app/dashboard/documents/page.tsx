import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { DocumentsVault } from "@/components/dashboard/documents-vault";

export default async function DocumentsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  if (session.role !== "client" && session.role !== "lawyer") {
    redirect("/signin");
  }

  return (
    <DashboardShell session={session} activeItem="Documents">
      <div className="px-4 py-8 sm:px-10 lg:px-14">
        <DocumentsVault role={session.role} />
      </div>
    </DashboardShell>
  );
}
