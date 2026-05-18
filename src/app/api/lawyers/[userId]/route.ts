import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getLawyerByUserId } from "@/lib/lawyers";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { userId } = await context.params;
    if (!userId?.trim()) {
      return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }

    const lawyer = await getLawyerByUserId(userId.trim());
    if (!lawyer) {
      return NextResponse.json({ error: "Lawyer not found." }, { status: 404 });
    }

    return NextResponse.json({ lawyer });
  } catch (error) {
    console.error("GET /api/lawyers/[userId] failed:", error);
    return NextResponse.json(
      { error: "Unable to load lawyer profile." },
      { status: 500 },
    );
  }
}
