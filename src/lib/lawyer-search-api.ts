import type { LawyerSearchResult } from "@/lib/lawyers";

export const LAWYER_SEARCH_PAGE_SIZE = 10;

export type LawyerSearchPageResult = {
  lawyers: LawyerSearchResult[];
  total: number;
  page: number;
  pageSize: number;
};

type SearchLawyersResponse = LawyerSearchPageResult;

type SearchLawyersError = {
  error: string;
};

export type LawyerSearchFilters = {
  query?: string;
  location?: string;
  province?: string;
  specialization?: string;
  experience?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchLawyers(
  options?: LawyerSearchFilters,
): Promise<LawyerSearchPageResult> {
  const params = new URLSearchParams();
  const query = options?.query?.trim() ?? "";
  const location = options?.location?.trim() ?? "";
  const province = options?.province?.trim() ?? "";
  const specialization = options?.specialization?.trim() ?? "";
  const experience = options?.experience?.trim() ?? "";
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? LAWYER_SEARCH_PAGE_SIZE;

  if (query) params.set("q", query);
  if (location) params.set("location", location);
  if (province) params.set("province", province);
  if (specialization) params.set("specialization", specialization);
  if (experience) params.set("experience", experience);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  const qs = params.toString();
  const response = await fetch(`/api/lawyers/search?${qs}`);

  const data = (await response.json()) as SearchLawyersResponse | SearchLawyersError;

  if (!response.ok) {
    throw new Error(
      "error" in data ? data.error : "Search failed. Please try again.",
    );
  }

  if (!("lawyers" in data)) {
    throw new Error("Search failed. Please try again.");
  }

  return data;
}
