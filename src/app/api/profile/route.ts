import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import {
  getProfileSettings,
  updateClientProfile,
  updateLawyerProfile,
  type UpdateClientProfileInput,
  type UpdateLawyerProfileInput,
} from "@/lib/profile";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.role !== "client" && session.role !== "lawyer") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const profile = await getProfileSettings(session.userId, session.role);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile fetch failed:", error);
    return NextResponse.json(
      { error: "Unable to load profile." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.role !== "client" && session.role !== "lawyer") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (session.role === "lawyer") {
      const input: UpdateLawyerProfileInput = {
        fullName: String(body.fullName ?? ""),
        phone: String(body.phone ?? ""),
        province: String(body.province ?? ""),
        specialization: String(body.specialization ?? ""),
        experienceYears: Number(body.experienceYears),
        officeAddress: String(body.officeAddress ?? ""),
        bio: body.bio != null ? String(body.bio) : null,
      };
      const profile = await updateLawyerProfile(session.userId, input);
      return NextResponse.json({ profile });
    }

    const input: UpdateClientProfileInput = {
      fullName: String(body.fullName ?? ""),
      phone: String(body.phone ?? ""),
      city: String(body.city ?? ""),
      legalNeed: body.legalNeed != null ? String(body.legalNeed) : null,
    };
    const profile = await updateClientProfile(session.userId, input);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile update failed:", error);
    const message =
      error instanceof Error ? error.message : "Unable to update profile.";
    const status = message.includes("required") || message.includes("valid")
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
