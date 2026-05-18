import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { ClientDashboard } from "./clientdashboard";
import { LawyerDashboard } from "./lawyerdashboard";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  if (session.role === "client") {
    return <ClientDashboard session={session} />;
  }

  if (session.role === "lawyer") {
    return <LawyerDashboard session={session} />;
  }

  redirect("/signin");
}
