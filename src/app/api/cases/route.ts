import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { listClientCases, listLawyerCases } from "@/lib/cases";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role === "client") {
      const cases = await listClientCases(session.userId);
      return NextResponse.json(
        { cases },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (session.role === "lawyer") {
      const cases = await listLawyerCases(session.userId);
      return NextResponse.json(
        { cases },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  } catch (error) {
    console.error("List cases failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to load cases.";
    const hint = message.includes("does not exist")
      ? " Run npm run db:migrate to create case tables."
      : "";
    return NextResponse.json(
      { error: `${message}${hint}` },
      { status: 500 },
    );
  }
}
