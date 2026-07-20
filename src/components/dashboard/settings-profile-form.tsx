"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PROVINCES, SPECIALIZATIONS } from "@/lib/auth-form";
import type { ProfileSettings } from "@/lib/profile";
import { fetchProfile, updateProfile } from "@/lib/profile-api";

export function SettingsProfileForm() {
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [legalNeed, setLegalNeed] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProfile();
      setProfile(data);
      setFullName(data.fullName);
      setPhone(data.phone);
      if (data.role === "lawyer") {
        setProvince(data.province);
        setSpecialization(data.specialization);
        setExperienceYears(
          data.experienceYears != null ? String(data.experienceYears) : "",
        );
        setOfficeAddress(data.officeAddress);
        setBio(data.bio ?? "");
      } else {
        setCity(data.city);
        setLegalNeed(data.legalNeed ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    const toastId = toast.loading("Saving profile…");
    try {
      const updated =
        profile.role === "lawyer"
          ? await updateProfile({
              fullName,
              phone,
              province,
              specialization,
              experienceYears: Number(experienceYears),
              officeAddress,
              bio: bio || null,
            })
          : await updateProfile({
              fullName,
              phone,
              city,
              legalNeed: legalNeed || null,
            });
      setProfile(updated);
      toast.success("Profile updated.", { id: toastId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save.",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }

  if (error || !profile) {
    return (
      <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-4">
        <p className="text-sm text-red-300">{error ?? "Profile not found."}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void load()}
        >
          <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
          Try again
        </Button>
      </div>
    );
  }

  const fieldClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50";
  const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Update your profile details. Email cannot be changed here.
        </p>
      </header>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="dashboard-card space-y-5 p-5 sm:p-6"
      >
        <div>
          <p className={labelClass}>Email</p>
          <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            {profile.email}
          </p>
        </div>

        <label className="block">
          <span className={labelClass}>Full name</span>
          <input
            className={fieldClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className={labelClass}>Phone</span>
          <input
            className={fieldClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </label>

        {profile.role === "lawyer" ? (
          <>
            <div>
              <p className={labelClass}>Bar registration no.</p>
              <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                {profile.barRegistrationNo}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Province</span>
                <select
                  className={fieldClass}
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  required
                >
                  <option value="">Select province</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Specialization</span>
                <select
                  className={fieldClass}
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  required
                >
                  <option value="">Select specialization</option>
                  {SPECIALIZATIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>Years of experience</span>
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className={labelClass}>Office address</span>
              <textarea
                className={`${fieldClass} resize-y`}
                rows={2}
                value={officeAddress}
                onChange={(e) => setOfficeAddress(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className={labelClass}>Bio</span>
              <textarea
                className={`${fieldClass} resize-y`}
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief professional bio"
              />
            </label>
          </>
        ) : (
          <>
            <div>
              <p className={labelClass}>CNIC</p>
              <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                {profile.cnic}
              </p>
            </div>

            <label className="block">
              <span className={labelClass}>City</span>
              <input
                className={fieldClass}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className={labelClass}>Legal need</span>
              <textarea
                className={`${fieldClass} resize-y`}
                rows={3}
                value={legalNeed}
                onChange={(e) => setLegalNeed(e.target.value)}
              />
            </label>
          </>
        )}

        <Button type="submit" disabled={saving} className="gap-2">
          <Save className="size-4" aria-hidden />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
