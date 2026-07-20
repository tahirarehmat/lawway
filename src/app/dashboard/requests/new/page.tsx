import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { DashboardShell } from "@/app/components/layout/dashboard-shell";
import { CaseRequestForm } from "@/components/dashboard/case-request-form";

type PageProps = {
  searchParams: Promise<{ title?: string; lawyerId?: string; lawyerName?: string }>;
};

export default async function NewCaseRequestPage({ searchParams }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  if (session.role !== "client") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const defaultTitle = params.title?.trim() ?? "";
  let requestedLawyerId = params.lawyerId?.trim() || null;
  let requestedLawyerName = params.lawyerName?.trim() || null;

  if (requestedLawyerId) {
    try {
      const pool = getPool();
      const { rows } = await pool.query<{ full_name: string }>(
        `SELECT lp.full_name
         FROM users u
         INNER JOIN lawyer_profiles lp ON lp.user_id = u.user_id
         WHERE u.user_id = $1 AND u.role = 'lawyer'`,
        [requestedLawyerId],
      );
      if (rows[0]) {
        requestedLawyerName = rows[0].full_name;
      } else {
        requestedLawyerId = null;
        requestedLawyerName = null;
      }
    } catch {
      requestedLawyerId = null;
      requestedLawyerName = null;
    }
  }

  return (
    <DashboardShell session={session} activeItem="Requests">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-10 lg:px-14">
        <header className="mb-8">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            New matter
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {requestedLawyerName
              ? `Request ${requestedLawyerName}`
              : "Submit a case request"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {requestedLawyerName
              ? "Your request goes directly to this advocate for review and acceptance."
              : "Describe your legal matter. A qualified advocate can review and accept your request."}
          </p>
        </header>

        <div className="dashboard-card p-6 sm:p-8">
          <CaseRequestForm
            defaultTitle={defaultTitle}
            requestedLawyerId={requestedLawyerId}
            requestedLawyerName={requestedLawyerName}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
