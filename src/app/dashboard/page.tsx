import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getUpcomingClientEvents } from "@/lib/case-events";
import { listClientRequests } from "@/lib/case-requests";
import { listClientCases } from "@/lib/cases";
import { ClientDashboard } from "./clientdashboard";
import { LawyerDashboard } from "./lawyerdashboard";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  if (session.role === "client") {
    const [cases, upcomingEvents, requests] = await Promise.all([
      listClientCases(session.userId).catch(() => []),
      getUpcomingClientEvents(session.userId, 3).catch(() => []),
      listClientRequests(session.userId).catch(() => []),
    ]);

    const pendingRequestCount = requests.filter(
      (r) => r.status === "pending",
    ).length;

    return (
      <ClientDashboard
        session={session}
        cases={cases}
        upcomingEvents={upcomingEvents}
        pendingRequestCount={pendingRequestCount}
      />
    );
  }

  if (session.role === "lawyer") {
    return <LawyerDashboard session={session} />;
  }

  redirect("/signin");
}
