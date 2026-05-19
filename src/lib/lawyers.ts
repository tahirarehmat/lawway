import { getPool } from "@/lib/db";

export type LawyerSearchResult = {
  userId: string;
  fullName: string;
  phone: string;
  specialization: string;
  province: string;
  officeAddress: string;
  experienceYears: number | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  barRegistrationNo: string;
};

export type LawyerSearchPage = {
  lawyers: LawyerSearchResult[];
  total: number;
  page: number;
  pageSize: number;
};

type SearchLawyersParams = {
  query?: string;
  location?: string;
  province?: string;
  specialization?: string;
  experienceMin?: number;
  experienceMax?: number;
  page?: number;
  pageSize?: number;
};

export async function searchLawyers({
  query,
  location,
  province,
  specialization,
  experienceMin,
  experienceMax,
  page = 1,
  pageSize = 10,
}: SearchLawyersParams): Promise<LawyerSearchPage> {
  const pool = getPool();
  const q = query?.trim() ?? "";
  const loc = location?.trim() ?? "";

  const conditions: string[] = [
    "u.role = 'lawyer'",
    "u.is_active = true",
  ];
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (q) {
    conditions.push(
      `(lp.full_name ILIKE $${paramIndex} OR lp.specialization ILIKE $${paramIndex})`,
    );
    params.push(`%${q}%`);
    paramIndex++;
  }

  if (loc) {
    conditions.push(
      `(lp.province::text ILIKE $${paramIndex} OR lp.office_address ILIKE $${paramIndex})`,
    );
    params.push(`%${loc}%`);
    paramIndex++;
  }

  if (province) {
    conditions.push(`lp.province::text = $${paramIndex}`);
    params.push(province);
    paramIndex++;
  }

  if (specialization) {
    conditions.push(`lp.specialization = $${paramIndex}`);
    params.push(specialization);
    paramIndex++;
  }

  if (experienceMin != null) {
    conditions.push(`lp.experience_years >= $${paramIndex}`);
    params.push(experienceMin);
    paramIndex++;
  }

  if (experienceMax != null) {
    conditions.push(`lp.experience_years <= $${paramIndex}`);
    params.push(experienceMax);
    paramIndex++;
  }

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(50, Math.max(1, pageSize));
  const offset = (safePage - 1) * safePageSize;

  params.push(String(safePageSize));
  const limitParam = paramIndex;
  paramIndex++;
  params.push(String(offset));
  const offsetParam = paramIndex;

  const result = await pool.query<{
    user_id: string;
    full_name: string;
    phone: string;
    specialization: string;
    province: string;
    office_address: string;
    experience_years: number | null;
    bio: string | null;
    profile_photo_url: string | null;
    bar_registration_no: string;
    total_count: string;
  }>(
    `SELECT
       lp.user_id,
       lp.full_name,
       lp.phone,
       lp.specialization,
       lp.province::text AS province,
       lp.office_address,
       lp.experience_years,
       lp.bio,
       lp.profile_photo_url,
       lp.bar_registration_no,
       COUNT(*) OVER()::text AS total_count
     FROM lawyer_profiles lp
     INNER JOIN users u ON u.user_id = lp.user_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY lp.experience_years DESC NULLS LAST, lp.full_name ASC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params,
  );

  const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;

  return {
    lawyers: result.rows.map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      phone: row.phone,
      specialization: row.specialization,
      province: row.province,
      officeAddress: row.office_address,
      experienceYears: row.experience_years,
      bio: row.bio,
      profilePhotoUrl: row.profile_photo_url,
      barRegistrationNo: row.bar_registration_no,
    })),
    total,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function getLawyerByUserId(
  userId: string,
): Promise<LawyerSearchResult | null> {
  const pool = getPool();
  const result = await pool.query<{
    user_id: string;
    full_name: string;
    phone: string;
    specialization: string;
    province: string;
    office_address: string;
    experience_years: number | null;
    bio: string | null;
    profile_photo_url: string | null;
    bar_registration_no: string;
  }>(
    `SELECT
       lp.user_id,
       lp.full_name,
       lp.phone,
       lp.specialization,
       lp.province::text AS province,
       lp.office_address,
       lp.experience_years,
       lp.bio,
       lp.profile_photo_url,
       lp.bar_registration_no
     FROM lawyer_profiles lp
     INNER JOIN users u ON u.user_id = lp.user_id
     WHERE lp.user_id = $1 AND u.role = 'lawyer' AND u.is_active = true
     LIMIT 1`,
    [userId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    userId: row.user_id,
    fullName: row.full_name,
    phone: row.phone,
    specialization: row.specialization,
    province: row.province,
    officeAddress: row.office_address,
    experienceYears: row.experience_years,
    bio: row.bio,
    profilePhotoUrl: row.profile_photo_url,
    barRegistrationNo: row.bar_registration_no,
  };
}

export function lawyerInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function lawyerBadge(experienceYears: number | null): {
  label: string;
  className: string;
} {
  const years = experienceYears ?? 0;
  if (years >= 15) {
    return {
      label: "ELITE PARTNER",
      className: "bg-primary/20 text-secondary",
    };
  }
  if (years >= 8) {
    return {
      label: "TOP RATED",
      className: "bg-emerald-100 text-emerald-800",
    };
  }
  return {
    label: "SPECIALIST",
    className: "bg-sky-100 text-sky-800",
  };
}
