import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "lawway_session";
export const REMEMBER_DEVICE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  userId: string;
  email: string;
  role: "lawyer" | "client" | "admin";
};

function getSessionSecret(): string {
  return process.env.AUTH_SECRET ?? "lawway-dev-secret-change-in-production";
}

export function createSessionToken(payload: SessionPayload): string {
  const secret = getSessionSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function parseSessionToken(token: string): SessionPayload | null {
  const secret = getSessionSecret();
  const [data, signature] = token.split(".");

  if (!data || !signature) return null;

  const expected = createHmac("sha256", secret).update(data).digest("base64url");

  try {
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    return JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as SessionPayload;
  } catch {
    return null;
  }
}
