import type { LawyerSearchResult } from "@/lib/lawyers";

type SearchLawyersResponse = {
  lawyers: LawyerSearchResult[];
};

type SearchLawyersError = {
  error: string;
};

export type LawyerSearchFilters = {
  query?: string;
  location?: string;
  province?: string;
  specialization?: string;
  experience?: string;
};

export async function fetchLawyers(
  options?: LawyerSearchFilters,
): Promise<LawyerSearchResult[]> {
  const params = new URLSearchParams();
  const query = options?.query?.trim() ?? "";
  const location = options?.location?.trim() ?? "";
  const province = options?.province?.trim() ?? "";
  const specialization = options?.specialization?.trim() ?? "";
  const experience = options?.experience?.trim() ?? "";

  if (query) params.set("q", query);
  if (location) params.set("location", location);
  if (province) params.set("province", province);
  if (specialization) params.set("specialization", specialization);
  if (experience) params.set("experience", experience);

  const qs = params.toString();
  const response = await fetch(`/api/lawyers/search${qs ? `?${qs}` : ""}`);

  const data = (await response.json()) as
    | SearchLawyersResponse
    | SearchLawyersError;

  if (!response.ok) {
    throw new Error(
      "error" in data ? data.error : "Search failed. Please try again.",
    );
  }

  if (!("lawyers" in data)) {
    throw new Error("Search failed. Please try again.");
  }

  return data.lawyers;
}
