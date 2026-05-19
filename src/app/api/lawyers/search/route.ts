import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  isValidExperienceFilter,
  isValidProvince,
  isValidSpecialization,
  parseExperienceFilter,
} from "@/lib/lawyer-search-filters";
import { LAWYER_SEARCH_PAGE_SIZE } from "@/lib/lawyer-search-api";
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
    const province = searchParams.get("province") ?? undefined;
    const specialization = searchParams.get("specialization") ?? undefined;
    const experience = searchParams.get("experience") ?? undefined;
    const pageRaw = searchParams.get("page");
    const pageSizeRaw = searchParams.get("pageSize");

    const q = query?.trim() ?? "";
    const loc = location?.trim() ?? "";
    const provinceValue = province?.trim() ?? "";
    const specializationValue = specialization?.trim() ?? "";
    const experienceValue = experience?.trim() ?? "";

    const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, Number.parseInt(pageSizeRaw ?? String(LAWYER_SEARCH_PAGE_SIZE), 10) || LAWYER_SEARCH_PAGE_SIZE),
    );

    if (provinceValue && !isValidProvince(provinceValue)) {
      return NextResponse.json({ error: "Invalid province filter." }, { status: 400 });
    }

    if (specializationValue && !isValidSpecialization(specializationValue)) {
      return NextResponse.json(
        { error: "Invalid lawyer type filter." },
        { status: 400 },
      );
    }

    if (experienceValue && !isValidExperienceFilter(experienceValue)) {
      return NextResponse.json(
        { error: "Invalid experience filter." },
        { status: 400 },
      );
    }

    const { minYears, maxYears } = parseExperienceFilter(experienceValue);

    const result = await searchLawyers({
      query: q || undefined,
      location: loc || undefined,
      province: provinceValue || undefined,
      specialization: specializationValue || undefined,
      experienceMin: minYears,
      experienceMax: maxYears,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Lawyer search failed:", error);
    return NextResponse.json(
      { error: "Unable to search lawyers. Please try again." },
      { status: 500 },
    );
  }
}
