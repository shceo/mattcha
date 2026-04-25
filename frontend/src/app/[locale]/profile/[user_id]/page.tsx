"use client";

import {
  ArrowLeft,
  Briefcase,
  Loader2,
  MapPin,
  MessageCircle,
  UserCircle2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { use, useEffect, useState } from "react";

import { Header } from "@/components/Header";
import { Link, useRouter } from "@/i18n/routing";
import { ApiError, api, apiBaseUrl } from "@/lib/api";
import { clearTokens, hasToken } from "@/lib/auth";
import { presenceFrom } from "@/lib/presence";

type Photo = {
  id: number;
  url: string;
  is_primary: boolean;
  sort_order: number;
};

type PublicProfile = {
  user_id: number;
  full_name: string;
  gender: "male" | "female";
  age: number;
  occupation: string | null;
  life_goals: string | null;
  address: string | null;
  last_seen_at: string | null;
  photos: Photo[];
};

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; user_id: string }>;
}) {
  const { user_id } = use(params);
  return <PublicProfileLoader userId={Number(user_id)} />;
}

function PublicProfileLoader({ userId }: { userId: number }) {
  const t = useTranslations("profile");
  const tChat = useTranslations("chat");
  const tCommon = useTranslations("common");
  const tPresence = useTranslations("presence");
  const router = useRouter();
  const locale = useLocale();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/auth/login");
      return;
    }
    (async () => {
      try {
        const p = await api<PublicProfile>(`/profile/${userId}`);
        setProfile(p);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            clearTokens();
            router.replace("/auth/login");
            return;
          }
          if (err.status === 404) setError(tChat("errors.userGone"));
          else setError(tChat("errors.generic"));
        } else {
          setError(tChat("errors.network"));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, router, tChat]);

  const presence = profile ? presenceFrom(profile.last_seen_at, locale) : null;

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

  if (error || !profile) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-md px-6 py-20 text-center">
          <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-8 text-sm text-red-200">
            {error}
          </div>
        </main>
      </>
    );
  }

  const cover = profile.photos.find((p) => p.is_primary) ?? profile.photos[0];

  return (
    <>
      <Header />
      <main className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-matcha-radial" aria-hidden />
        <section className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs uppercase tracking-wider text-zinc-300 transition hover:border-matcha-300/40 hover:text-matcha-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {tCommon("back")}
            </button>
            <Link
              href={`/chat/${profile.user_id}`}
              className="inline-flex items-center gap-2 rounded-full bg-matcha-300 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-ink-950 shadow-glow hover:bg-matcha-200"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {tChat("send")}
            </Link>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-white/5 bg-ink-900/40">
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink-800 sm:aspect-[16/10]">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${apiBaseUrl}${cover.url}`}
                  alt={profile.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-700">
                  <UserCircle2 className="h-24 w-24" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <h1 className="font-display text-3xl font-light tracking-tight text-zinc-50 sm:text-4xl">
                  {profile.full_name}
                  <span className="ml-3 text-zinc-300">{profile.age}</span>
                </h1>
                {presence && presence.kind !== "hidden" && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-300">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        presence.kind === "online"
                          ? "bg-matcha-300 shadow-[0_0_8px_rgba(168,199,115,0.8)]"
                          : "bg-zinc-500"
                      }`}
                      aria-hidden
                    />
                    {presence.kind === "online" && tPresence("online")}
                    {presence.kind === "recently" && tPresence("recently")}
                    {presence.kind === "lastSeenAt" &&
                      tPresence("lastSeenAt", { time: presence.time })}
                    {presence.kind === "lastSeenOnDate" &&
                      tPresence("lastSeenOnDate", {
                        date: presence.date,
                        time: presence.time,
                      })}
                  </p>
                )}
                {profile.address && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-300">
                    <MapPin className="h-3 w-3" />
                    {profile.address}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-7">
              {profile.occupation && (
                <p className="inline-flex items-start gap-2 text-sm text-zinc-300">
                  <Briefcase className="mt-0.5 h-4 w-4 flex-shrink-0 text-matcha-300/80" />
                  <span>{profile.occupation}</span>
                </p>
              )}
              {profile.life_goals && (
                <p className="text-sm leading-relaxed text-zinc-200">
                  {profile.life_goals}
                </p>
              )}
            </div>
          </div>

          {profile.photos.length > 1 && (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {profile.photos.slice(1).map((p) => (
                <li
                  key={p.id}
                  className="aspect-[3/4] overflow-hidden rounded-2xl border border-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${apiBaseUrl}${p.url}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
