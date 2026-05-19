import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  createCaseRequest,
  listClientRequests,
  listLawyerRequests,
  listPendingRequestsForLawyer,
} from "@/lib/case-requests";

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role === "client") {
      const requests = await listClientRequests(session.userId);
      return NextResponse.json({ requests });
    }

    if (session.role === "lawyer") {
      const url = new URL(request.url);
      const scope = url.searchParams.get("scope");
      const requests =
        scope === "pending"
          ? await listPendingRequestsForLawyer(session.userId)
          : await listLawyerRequests(session.userId);
      return NextResponse.json({ requests });
    }

    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  } catch (error) {
    console.error("List requests failed:", error);
    return NextResponse.json(
      { error: "Unable to load requests." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "client") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as {
      title?: string;
      briefDescription?: string;
      specialConditions?: string | null;
      requestedLawyerId?: string | null;
    };

    const title = String(body.title ?? "").trim();
    const briefDescription = String(body.briefDescription ?? "").trim();

    if (!title || !briefDescription) {
      return NextResponse.json(
        { error: "Title and description are required." },
        { status: 400 },
      );
    }

    const requestedLawyerId = body.requestedLawyerId?.trim() || null;

    const created = await createCaseRequest(session.userId, {
      title,
      briefDescription,
      specialConditions: body.specialConditions ?? null,
      requestedLawyerId,
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    console.error("Create request failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to create request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
