import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { CaseDetailView } from "@/components/dashboard/case-detail-view";

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  if (!local.trim()) return "User";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type PageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function CaseDetailPage({ params }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  if (session.role !== "client" && session.role !== "lawyer") {
    redirect("/signin");
  }

  const { caseId } = await params;

  return (
    <DashboardShell session={session} activeItem="My Cases">
      <div className="px-4 py-8 sm:px-10 lg:px-14">
        <CaseDetailView
          caseId={caseId}
          role={session.role}
          {...(session.role === "client"
            ? {
                clientUid: session.email,
                localDisplayName: displayNameFromEmail(session.email),
              }
            : { localDisplayName: displayNameFromEmail(session.email) })}
        />
      </div>
    </DashboardShell>
  );
}
