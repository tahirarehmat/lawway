import { getPool } from "@/lib/db";
import {
  createSessionToken,
  REMEMBER_DEVICE_MAX_AGE,
  SESSION_COOKIE_NAME,
  type SessionPayload,
} from "@/lib/session";
import { NextResponse } from "next/server";

type SignInBody = {
  email: string;
  password: string;
  rememberDevice: boolean;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignInBody;
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const rememberDevice = Boolean(body.rememberDevice);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const pool = getPool();
    const result = await pool.query<{
      user_id: string;
      email: string;
      password: string;
      role: SessionPayload["role"];
      is_active: boolean;
    }>(
      `SELECT user_id, email, password, role, is_active
       FROM users
       WHERE email = $1`,
      [email],
    );

    const user = result.rows[0];

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "This account has been deactivated." },
        { status: 403 },
      );
    }

    const session: SessionPayload = {
      userId: user.user_id,
      email: user.email,
      role: user.role,
    };

    const response = NextResponse.json({
      message: "Signed in successfully.",
      userId: user.user_id,
      role: user.role,
      rememberDevice,
    });

    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(rememberDevice ? { maxAge: REMEMBER_DEVICE_MAX_AGE } : {}),
    });

    return response;
  } catch (error) {
    console.error("Sign in error:", error);
    return NextResponse.json(
      { error: "Something went wrong while signing in." },
      { status: 500 },
    );
  }
}
