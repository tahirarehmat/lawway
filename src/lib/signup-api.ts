import type { PendingSignup } from "@/lib/auth-form";

type ClientProfilePayload = {
  city: string;
  cnic: string;
  legal_need?: string | null;
};

type LawyerProfilePayload = {
  bar_registration_no: string;
  province: string;
  specialization: string;
  experience_years: number;
  office_address: string;
  bio?: string | null;
  profile_photo_url?: string | null;
};

export async function registerAccount(
  account: PendingSignup,
  profile: ClientProfilePayload | LawyerProfilePayload,
) {
  const response = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: account.email,
      password: account.password,
      role: account.role,
      profile,
    }),
  });

  const data = (await response.json()) as { error?: string; message?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to create account.");
  }

  return data;
}
