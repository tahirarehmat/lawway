import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { LawyerHearingCalendar } from "@/components/dashboard/lawyer-hearing-calendar";

export default async function HearingCalendarPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  if (session.role === "client") {
    redirect("/dashboard/events");
  }

  if (session.role !== "lawyer" && session.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell session={session} activeItem="Hearing Calendar">
      <div className="px-4 py-8 sm:px-10 lg:px-14">
        <LawyerHearingCalendar />
      </div>
    </DashboardShell>
  );
}
