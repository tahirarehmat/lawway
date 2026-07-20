import type {
  ProfileSettings,
  UpdateClientProfileInput,
  UpdateLawyerProfileInput,
} from "@/lib/profile";

async function parseError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Request failed.";
}

export async function fetchProfile(): Promise<ProfileSettings> {
  const res = await fetch("/api/profile", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { profile: ProfileSettings };
  return data.profile;
}

export async function updateProfile(
  body: UpdateLawyerProfileInput | UpdateClientProfileInput,
): Promise<ProfileSettings> {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { profile: ProfileSettings };
  return data.profile;
}
