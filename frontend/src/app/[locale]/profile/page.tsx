"use client";

import { Loader2, LogOut, MapPin, Star, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Header } from "@/components/Header";
import { useRouter } from "@/i18n/routing";
import { ApiError, api, apiBaseUrl } from "@/lib/api";
import { clearTokens, hasToken } from "@/lib/auth";

type Gender = "male" | "female";

type Photo = {
  id: number;
  url: string;
  is_primary: boolean;
  sort_order: number;
};

type Profile = {
  user_id: number;
  full_name: string;
  gender: Gender;
  birth_date: string;
  age: number;
  occupation: string | null;
  life_goals: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  photos: Photo[];
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-matcha-300/50 focus:bg-ink-800";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [birthDate, setBirthDate] = useState("");
  const [occupation, setOccupation] = useState("");
  const [lifeGoals, setLifeGoals] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/auth/login");
      return;
    }
    (async () => {
      try {
        const p = await api<Profile | null>("/profile/me");
        if (p) {
          setProfile(p);
          hydrateForm(p);
        } else {
          setProfile(null);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearTokens();
          router.replace("/auth/login");
          return;
        }
        setError("generic");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function hydrateForm(p: Profile) {
    setFullName(p.full_name);
    setGender(p.gender);
    setBirthDate(p.birth_date);
    setOccupation(p.occupation ?? "");
    setLifeGoals(p.life_goals ?? "");
    setAddress(p.address ?? "");
    setLat(p.lat != null ? String(p.lat) : "");
    setLng(p.lng != null ? String(p.lng) : "");
  }

  function ageFrom(dateStr: string): number {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 0;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (ageFrom(birthDate) < 18) {
      setError("age");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name: fullName,
        birth_date: birthDate,
        occupation: occupation || null,
        life_goals: lifeGoals || null,
        address: address || null,
        lat: lat === "" ? null : Number(lat),
        lng: lng === "" ? null : Number(lng),
      };
      if (!profile) {
        const created = await api<Profile>("/profile/me", {
          method: "POST",
          json: { ...payload, gender },
        });
        setProfile(created);
      } else {
        const updated = await api<Profile>("/profile/me", {
          method: "PATCH",
          json: payload,
        });
        setProfile(updated);
      }
    } catch (err) {
      if (err instanceof ApiError && typeof err.detail === "string") {
        setError(err.detail);
      } else {
        setError("generic");
      }
    } finally {
      setSaving(false);
    }
  }

  function useGeolocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    });
  }

  function logout() {
    clearTokens();
    router.replace("/auth/login");
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="mx-auto flex max-w-3xl items-center justify-center px-6 py-24 text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {tCommon("loading")}
        </main>
      </>
    );
  }

  const isEditing = !!profile;

  return (
    <>
      <Header />
      <main className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-matcha-radial" aria-hidden />
        <section className="mx-auto max-w-3xl px-6 pb-24 pt-12">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-light tracking-tight text-zinc-50">
                {isEditing ? t("editTitle") : t("createTitle")}
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                {isEditing ? t("editSubtitle") : t("createSubtitle")}
              </p>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-white/30 hover:text-zinc-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("logout")}
            </button>
          </div>

          {isEditing && profile && (
            <PhotoSection profile={profile} onChange={setProfile} />
          )}

          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            <Field label={t("fullName")}>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label={t("gender")} hint={t("genderLockedHint")}>
              <div className="grid grid-cols-2 gap-3">
                {(["male", "female"] as Gender[]).map((g) => (
                  <label
                    key={g}
                    className={`flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm transition ${
                      gender === g
                        ? "border-matcha-300/60 bg-matcha-300/10 text-matcha-100"
                        : "border-white/10 bg-ink-800/60 text-zinc-300 hover:border-white/20"
                    } ${isEditing ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={() => setGender(g)}
                      disabled={isEditing}
                      className="hidden"
                    />
                    {t(g)}
                  </label>
                ))}
              </div>
            </Field>

            <Field label={t("birthDate")}>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label={t("occupation")}>
              <input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder={t("occupationPlaceholder")}
                className={inputCls}
              />
            </Field>

            <Field label={t("lifeGoals")}>
              <textarea
                rows={4}
                value={lifeGoals}
                onChange={(e) => setLifeGoals(e.target.value)}
                placeholder={t("lifeGoalsPlaceholder")}
                className={`${inputCls} resize-none`}
              />
            </Field>

            <Field label={t("address")}>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("addressPlaceholder")}
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("lat")}>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label={t("lng")}>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={useGeolocation}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300 transition hover:border-matcha-300/40 hover:text-matcha-200"
            >
              <MapPin className="h-3.5 w-3.5" />
              {t("useMyLocation")}
            </button>

            {error && (
              <p className="rounded-xl border border-red-400/30 bg-red-400/5 px-3 py-2 text-xs text-red-300">
                {error === "age" ? t("ageError") : error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-matcha-300 px-6 py-3 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-matcha-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("saving")}
                </>
              ) : isEditing ? (
                t("save")
              ) : (
                t("create")
              )}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-zinc-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}

function PhotoSection({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
}) {
  const t = useTranslations("profile");
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const created = await api<Photo>("/profile/me/photos", {
        method: "POST",
        body: fd,
      });
      onChange({ ...profile, photos: [...profile.photos, created] });
    } catch (err) {
      if (err instanceof ApiError && typeof err.detail === "string") setError(err.detail);
      else setError("upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function makePrimary(photoId: number) {
    const updated = await api<Photo>(`/profile/me/photos/${photoId}/primary`, {
      method: "POST",
    });
    onChange({
      ...profile,
      photos: profile.photos.map((p) => ({
        ...p,
        is_primary: p.id === updated.id,
      })),
    });
  }

  async function deletePhoto(photoId: number) {
    await api(`/profile/me/photos/${photoId}`, { method: "DELETE" });
    const next = profile.photos.filter((p) => p.id !== photoId);
    if (!next.some((p) => p.is_primary) && next[0]) next[0].is_primary = true;
    onChange({ ...profile, photos: next });
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/5 bg-ink-900/40 p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-zinc-100">{t("photos")}</h2>
          <p className="mt-1 text-xs text-zinc-500">{t("photosHint")}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-matcha-300/30 bg-matcha-300/10 px-4 py-2 text-xs text-matcha-100 transition hover:border-matcha-300/60 hover:bg-matcha-300/20">
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploading ? t("uploading") : t("uploadPhoto")}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
      {error && (
        <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/5 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {profile.photos.map((p) => (
          <div
            key={p.id}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${apiBaseUrl}${p.url}`}
              alt=""
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            />
            {p.is_primary && (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-matcha-300/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-950">
                <Star className="h-3 w-3" /> {t("primary")}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex translate-y-full justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-2 transition group-hover:translate-y-0">
              {!p.is_primary && (
                <button
                  type="button"
                  onClick={() => makePrimary(p.id)}
                  className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-100 transition hover:bg-white/20"
                >
                  {t("makePrimary")}
                </button>
              )}
              <button
                type="button"
                onClick={() => deletePhoto(p.id)}
                className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-[10px] uppercase tracking-wider text-red-200 transition hover:bg-red-500/30"
              >
                <Trash2 className="h-3 w-3" />
                {t("deletePhoto")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
