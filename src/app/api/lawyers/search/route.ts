import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { searchLawyers } from "@/lib/lawyers";

export async function GET(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? undefined;
    const location = searchParams.get("location") ?? undefined;

    const q = query?.trim() ?? "";
    const loc = location?.trim() ?? "";
    const hasFilters = Boolean(q || loc);

    const lawyers = await searchLawyers({
      query: q || undefined,
      location: loc || undefined,
      limit: hasFilters ? 24 : 6,
    });

    return NextResponse.json({ lawyers });
  } catch (error) {
    console.error("Lawyer search failed:", error);
    return NextResponse.json(
      { error: "Unable to search lawyers. Please try again." },
      { status: 500 },
    );
  }
}
