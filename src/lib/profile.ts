import { getPool } from "@/lib/db";
import { PROVINCES } from "@/lib/auth-form";

export type LawyerProfileSettings = {
  role: "lawyer";
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  barRegistrationNo: string;
  province: string;
  specialization: string;
  experienceYears: number | null;
  officeAddress: string;
  bio: string | null;
  profilePhotoUrl: string | null;
};

export type ClientProfileSettings = {
  role: "client";
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  city: string;
  cnic: string;
  legalNeed: string | null;
};

export type ProfileSettings = LawyerProfileSettings | ClientProfileSettings;

export type UpdateLawyerProfileInput = {
  fullName: string;
  phone: string;
  province: string;
  specialization: string;
  experienceYears: number;
  officeAddress: string;
  bio?: string | null;
};

export type UpdateClientProfileInput = {
  fullName: string;
  phone: string;
  city: string;
  legalNeed?: string | null;
};

export async function getProfileSettings(
  userId: string,
  role: "client" | "lawyer",
): Promise<ProfileSettings | null> {
  const pool = getPool();

  if (role === "lawyer") {
    const { rows } = await pool.query<{
      user_id: string;
      email: string;
      full_name: string;
      phone: string;
      bar_registration_no: string;
      province: string;
      specialization: string;
      experience_years: number | null;
      office_address: string;
      bio: string | null;
      profile_photo_url: string | null;
    }>(
      `SELECT
         u.user_id,
         u.email,
         lp.full_name,
         lp.phone,
         lp.bar_registration_no,
         lp.province::text AS province,
         lp.specialization,
         lp.experience_years,
         lp.office_address,
         lp.bio,
         lp.profile_photo_url
       FROM users u
       INNER JOIN lawyer_profiles lp ON lp.user_id = u.user_id
       WHERE u.user_id = $1 AND u.role = 'lawyer'
       LIMIT 1`,
      [userId],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      role: "lawyer",
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone,
      barRegistrationNo: row.bar_registration_no,
      province: row.province,
      specialization: row.specialization,
      experienceYears: row.experience_years,
      officeAddress: row.office_address,
      bio: row.bio,
      profilePhotoUrl: row.profile_photo_url,
    };
  }

  const { rows } = await pool.query<{
    user_id: string;
    email: string;
    full_name: string;
    phone: string;
    city: string;
    cnic: string;
    legal_need: string | null;
  }>(
    `SELECT
       u.user_id,
       u.email,
       cp.full_name,
       cp.phone,
       cp.city,
       cp.cnic,
       cp.legal_need
     FROM users u
     INNER JOIN client_profiles cp ON cp.user_id = u.user_id
     WHERE u.user_id = $1 AND u.role = 'client'
     LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    role: "client",
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    city: row.city,
    cnic: row.cnic,
    legalNeed: row.legal_need,
  };
}

export async function updateLawyerProfile(
  userId: string,
  input: UpdateLawyerProfileInput,
): Promise<LawyerProfileSettings> {
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();
  const province = input.province.trim();
  const specialization = input.specialization.trim();
  const officeAddress = input.officeAddress.trim();
  const bio = input.bio?.trim() || null;

  if (!fullName) throw new Error("Full name is required.");
  if (!phone) throw new Error("Phone is required.");
  if (!province || !(PROVINCES as readonly string[]).includes(province)) {
    throw new Error("A valid province is required.");
  }
  if (!specialization) throw new Error("Specialization is required.");
  if (!Number.isFinite(input.experienceYears) || input.experienceYears < 0) {
    throw new Error("Enter a valid years of experience.");
  }
  if (!officeAddress) throw new Error("Office address is required.");

  const pool = getPool();
  await pool.query(
    `UPDATE lawyer_profiles
     SET full_name = $2,
         phone = $3,
         province = $4::pakistan_province,
         specialization = $5,
         experience_years = $6,
         office_address = $7,
         bio = $8
     WHERE user_id = $1`,
    [
      userId,
      fullName,
      phone,
      province,
      specialization,
      Math.floor(input.experienceYears),
      officeAddress,
      bio,
    ],
  );

  const profile = await getProfileSettings(userId, "lawyer");
  if (!profile || profile.role !== "lawyer") {
    throw new Error("Profile not found after update.");
  }
  return profile;
}

export async function updateClientProfile(
  userId: string,
  input: UpdateClientProfileInput,
): Promise<ClientProfileSettings> {
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();
  const city = input.city.trim();
  const legalNeed = input.legalNeed?.trim() || null;

  if (!fullName) throw new Error("Full name is required.");
  if (!phone) throw new Error("Phone is required.");
  if (!city) throw new Error("City is required.");

  const pool = getPool();
  await pool.query(
    `UPDATE client_profiles
     SET full_name = $2,
         phone = $3,
         city = $4,
         legal_need = $5
     WHERE user_id = $1`,
    [userId, fullName, phone, city, legalNeed],
  );

  const profile = await getProfileSettings(userId, "client");
  if (!profile || profile.role !== "client") {
    throw new Error("Profile not found after update.");
  }
  return profile;
}
