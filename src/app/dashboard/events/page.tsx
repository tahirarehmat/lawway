import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { ClientEvents } from "@/components/dashboard/client-events";

export default async function ClientEventsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  if (session.role !== "client") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell session={session} activeItem="Events">
      <div className="px-4 py-8 sm:px-10 lg:px-14">
        <ClientEvents />
      </div>
    </DashboardShell>
  );
}
