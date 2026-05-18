import type { LawyerSearchResult } from "@/lib/lawyers";

type SearchLawyersResponse = {
  lawyers: LawyerSearchResult[];
};

type SearchLawyersError = {
  error: string;
};

export async function fetchLawyers(options?: {
  query?: string;
  location?: string;
}): Promise<LawyerSearchResult[]> {
  const params = new URLSearchParams();
  const query = options?.query?.trim() ?? "";
  const location = options?.location?.trim() ?? "";

  if (query) params.set("q", query);
  if (location) params.set("location", location);

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
