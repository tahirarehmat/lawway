export type SignInPayload = {
  email: string;
  password: string;
  rememberDevice: boolean;
};

export type SignInResponse = {
  message: string;
  userId: string;
  role: string;
  rememberDevice: boolean;
};

export async function signInAccount(payload: SignInPayload): Promise<SignInResponse> {
  const response = await fetch("/api/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as SignInResponse & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Sign in failed.");
  }

  return data;
}
