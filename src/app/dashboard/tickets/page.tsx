import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import UserTicketDashboard from "@/components/tickets/UserTicketDashboard";
import LawyerTicketDashboard from "@/components/tickets/LawyerTicketDashboard";

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  if (!local.trim()) return "Advocate";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TicketsPage({ searchParams }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  const sp = searchParams ? await searchParams : {};
  const raw = sp.lawyerId;
  const initialLawyerId =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] ?? null : null;

  if (session.role === "lawyer") {
    return (
      <DashboardShell
        session={session}
        activeItem="Messages"
        showSupport
        ticketsLinkLabel="Messages"
      >
        <div className="flex min-h-0 flex-1 flex-col [--ticket-h:calc(100dvh-7rem)] md:[--ticket-h:calc(100dvh-4rem)]">
          <LawyerTicketDashboard
            lawyerUserId={session.userId}
            lawyerSenderName={displayNameFromEmail(session.email)}
          />
        </div>
      </DashboardShell>
    );
  }

  if (session.role !== "client") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell session={session} activeItem="Support" showSupport>
      <div className="flex min-h-0 flex-1 flex-col [--ticket-h:calc(100dvh-7rem)] md:[--ticket-h:calc(100dvh-4rem)]">
        <UserTicketDashboard
          userId={session.userId}
          userUid={session.email}
          initialLawyerId={initialLawyerId}
        />
      </div>
    </DashboardShell>
  );
}
