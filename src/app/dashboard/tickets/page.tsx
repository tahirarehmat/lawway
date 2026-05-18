import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import UserTicketDashboard from "@/components/tickets/UserTicketDashboard";

export default async function TicketsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  if (session.role !== "client") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell session={session} activeItem="Support" showSupport>
      <div className="flex min-h-0 flex-1 flex-col [--ticket-h:calc(100dvh-7rem)] md:[--ticket-h:calc(100dvh-4rem)]">
        <UserTicketDashboard userId={session.userId} userUid={session.email} />
      </div>
    </DashboardShell>
  );
}
