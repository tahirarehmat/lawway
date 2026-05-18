import { getPool } from "@/lib/db";
import { PROVINCES } from "@/lib/auth-form";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  type SessionPayload,
} from "@/lib/session";
import { NextResponse } from "next/server";

const EMAIL_PATTERN =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const CNIC_PATTERN = /^\d{5}-\d{7}-\d$/;

type UserRole = "lawyer" | "client";

type ClientProfileInput = {
  city: string;
  cnic: string;
  legal_need?: string | null;
  full_name?: string | null;
  phone?: string | null;
};

type LawyerProfileInput = {
  bar_registration_no: string;
  province: string;
  specialization: string;
  experience_years: number;
  office_address: string;
  bio?: string | null;
  profile_photo_url?: string | null;
  full_name?: string | null;
  phone?: string | null;
};

type SignupBody = {
  email: string;
  password: string;
  role: UserRole;
  profile: ClientProfileInput | LawyerProfileInput;
};

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "User";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseSignupBody(body: unknown): SignupBody | string {
  if (!body || typeof body !== "object") {
    return "Invalid request body.";
  }

  const data = body as Record<string, unknown>;
  const email = String(data.email ?? "").trim().toLowerCase();
  const password = String(data.password ?? "");
  const role = data.role as UserRole;
  const profile = data.profile;

  if (!email || !EMAIL_PATTERN.test(email)) {
    return "A valid email address is required.";
  }

  if (!password || !PASSWORD_PATTERN.test(password)) {
    return "Password must be at least 8 characters and include a letter, number, and special character.";
  }

  if (role !== "client" && role !== "lawyer") {
    return "Role must be client or lawyer.";
  }

  if (!profile || typeof profile !== "object") {
    return "Profile data is required.";
  }

  if (role === "client") {
    const p = profile as Record<string, unknown>;
    const city = String(p.city ?? "").trim();
    const cnic = String(p.cnic ?? "").trim();
    const legalNeed = p.legal_need ? String(p.legal_need).trim() : null;

    if (!city) {
      return "City is required.";
    }

    if (!cnic) {
      return "CNIC number is required.";
    }

    if (!CNIC_PATTERN.test(cnic)) {
      return "CNIC must be in the format 00000-0000000-0.";
    }

    return {
      email,
      password,
      role,
      profile: {
        city,
        cnic,
        legal_need: legalNeed,
        full_name: p.full_name ? String(p.full_name).trim() : null,
        phone: p.phone ? String(p.phone).trim() : null,
      },
    };
  }

  const p = profile as Record<string, unknown>;
  const barRegistrationNo = String(p.bar_registration_no ?? "").trim();
  const province = String(p.province ?? "").trim();
  const specialization = String(p.specialization ?? "").trim();
  const officeAddress = String(p.office_address ?? "").trim();
  const experienceYears = Number(p.experience_years);
  const bio = p.bio ? String(p.bio).trim() : null;
  const profilePhotoUrl = p.profile_photo_url
    ? String(p.profile_photo_url).trim()
    : null;

  if (!barRegistrationNo) {
    return "Bar Council registration number is required.";
  }

  if (!PROVINCES.includes(province as (typeof PROVINCES)[number])) {
    return "A valid province is required.";
  }

  if (!specialization) {
    return "Specialization is required.";
  }

  if (!Number.isFinite(experienceYears) || experienceYears < 0) {
    return "Years of experience must be a valid non-negative number.";
  }

  if (!officeAddress) {
    return "Office address is required.";
  }

  return {
    email,
    password,
    role,
    profile: {
      bar_registration_no: barRegistrationNo,
      province,
      specialization,
      experience_years: experienceYears,
      office_address: officeAddress,
      bio,
      profile_photo_url: profilePhotoUrl,
      full_name: p.full_name ? String(p.full_name).trim() : null,
      phone: p.phone ? String(p.phone).trim() : null,
    },
  };
}

function dbErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505"
  ) {
    const detail =
      "detail" in error && typeof error.detail === "string"
        ? error.detail
        : "";

    if (detail.includes("users_email_unique") || detail.includes("(email)")) {
      return "An account with this email already exists.";
    }

    if (detail.includes("bar_registration_no")) {
      return "This Bar Council registration number is already registered.";
    }

    return "A record with these details already exists.";
  }

  return "Something went wrong while creating your account.";
}

export async function POST(request: Request) {
  try {
    const parsed = parseSignupBody(await request.json());

    if (typeof parsed === "string") {
      return NextResponse.json({ error: parsed }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await client.query<{ user_id: string }>(
        "SELECT user_id FROM users WHERE email = $1",
        [parsed.email],
      );

      if (existing.rows.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 },
        );
      }

      const fullName =
        parsed.profile.full_name?.trim() || displayNameFromEmail(parsed.email);
      const phone = parsed.profile.phone?.trim() || null;

      const userResult = await client.query<{ user_id: string }>(
        `INSERT INTO users (email, password, role)
         VALUES ($1, $2, $3)
         RETURNING user_id`,
        [parsed.email, parsed.password, parsed.role],
      );

      const userId = userResult.rows[0]?.user_id;

      if (!userId) {
        throw new Error("Failed to create user.");
      }

      if (parsed.role === "client") {
        const profile = parsed.profile as ClientProfileInput;

        await client.query(
          `INSERT INTO client_profiles (
            user_id, full_name, phone, cnic, city, legal_need
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId,
            fullName,
            phone,
            profile.cnic,
            profile.city,
            profile.legal_need ?? null,
          ],
        );
      } else {
        const profile = parsed.profile as LawyerProfileInput;

        await client.query(
          `INSERT INTO lawyer_profiles (
            user_id,
            full_name,
            phone,
            bar_registration_no,
            province,
            specialization,
            experience_years,
            office_address,
            bio,
            profile_photo_url
          ) VALUES ($1, $2, $3, $4, $5::pakistan_province, $6, $7, $8, $9, $10)`,
          [
            userId,
            fullName,
            phone,
            profile.bar_registration_no,
            profile.province,
            profile.specialization,
            profile.experience_years,
            profile.office_address,
            profile.bio ?? null,
            profile.profile_photo_url ?? null,
          ],
        );
      }

      await client.query("COMMIT");

      const session: SessionPayload = {
        userId,
        email: parsed.email,
        role: parsed.role,
      };

      const response = NextResponse.json(
        {
          message: "Account created successfully.",
          userId,
          role: parsed.role,
        },
        { status: 201 },
      );

      response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(session), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });

      return response;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Signup error:", error);
      return NextResponse.json(
        { error: dbErrorMessage(error) },
        { status: 500 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Signup request error:", error);
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }
}
