import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { LegalAiChatPanel } from "@/components/dashboard/legal-ai-chat-panel";

export default async function LegalAiPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  if (
    session.role !== "client" &&
    session.role !== "lawyer" &&
    session.role !== "admin"
  ) {
    redirect("/signin");
  }

  return (
    <DashboardShell session={session} activeItem="Legal AI" fillViewport>
      <div className="flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-10 lg:px-14">
        <LegalAiChatPanel />
      </div>
    </DashboardShell>
  );
}
