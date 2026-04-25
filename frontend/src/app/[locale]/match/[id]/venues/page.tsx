"use client";

import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Sparkles,
  Tag,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { use, useEffect, useState } from "react";

import { Header } from "@/components/Header";
import { Link, useRouter } from "@/i18n/routing";
import { ApiError, api } from "@/lib/api";
import { clearTokens, hasToken } from "@/lib/auth";
import { isFutureTashkent, tashkentIso } from "@/lib/dates";
import { toast } from "@/lib/toast";

const VenueMap = dynamic(() => import("@/components/VenueMap"), { ssr: false });

type Promo = {
  id: number;
  code: string;
  description: string | null;
  discount_text: string;
  is_active: boolean;
};

type Venue = {
  id: number;
  name: string;
  description: string | null;
  address: string;
  lat: number;
  lng: number;
  image_url: string | null;
  is_active: boolean;
  promos: Promo[];
  distance_km: number | null;
};

type Recommendation = {
  midpoint_lat: number;
  midpoint_lng: number;
  me: { lat: number; lng: number };
  partner: { lat: number; lng: number; gender: "male" | "female" };
  can_pick: boolean;
  items: Venue[];
};

export default function VenuesPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = use(params);
  return <VenuesLoader matchId={Number(id)} />;
}

function VenuesLoader({ matchId }: { matchId: number }) {
  const t = useTranslations("venues");
  const tCommon = useTranslations("common");
  const tToast = useTranslations("toast");
  const router = useRouter();

  const [data, setData] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ kind: "notMatched" | "locationMissing" | "onlyInitiator" | "other"; detail?: string } | null>(null);

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/auth/login");
      return;
    }
    (async () => {
      try {
        const r = await api<Recommendation>(`/matches/${matchId}/venues`);
        setData(r);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            clearTokens();
            router.replace("/auth/login");
            return;
          }
          if (err.status === 409) setError({ kind: "notMatched" });
          else if (err.status === 403) setError({ kind: "onlyInitiator" });
          else if (err.status === 400) setError({ kind: "locationMissing" });
          else
            setError({
              kind: "other",
              detail: typeof err.detail === "string" ? err.detail : "error",
            });
        } else setError({ kind: "other" });
      } finally {
        setLoading(false);
      }
    })();
  }, [matchId, router]);

  async function pickVenue(venueId: number, isoMeetingAt: string) {
    try {
      await api(`/matches/${matchId}/pick-venue`, {
        method: "POST",
        json: { venue_id: venueId, meeting_at: isoMeetingAt },
      });
      toast.success(tToast("venuePicked"));
      router.push("/matches");
    } catch (err) {
      if (err instanceof ApiError && typeof err.detail === "string") {
        toast.error(err.detail);
      } else {
        toast.error(tToast("saveFailed"));
      }
    }
  }

  return (
    <>
      <Header />
      <main className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-matcha-radial" aria-hidden />
        <section className="mx-auto max-w-5xl px-6 pb-24 pt-12">
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 transition hover:text-matcha-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {tCommon("back")}
          </Link>

          <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-zinc-50 sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">{t("subtitle")}</p>

          {loading ? (
            <div className="mt-16 flex justify-center text-zinc-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {tCommon("loading")}
            </div>
          ) : error ? (
            <div
              className={`mt-12 rounded-2xl border p-8 text-sm ${
                error.kind === "onlyInitiator"
                  ? "border-matcha-300/30 bg-matcha-300/5 text-matcha-100"
                  : "border-red-400/30 bg-red-400/5 text-red-200"
              }`}
            >
              {error.kind === "notMatched"
                ? t("notMatched")
                : error.kind === "locationMissing"
                ? t("locationMissing")
                : error.kind === "onlyInitiator"
                ? t("onlyInitiator")
                : error.detail ?? "error"}
            </div>
          ) : !data ? null : data.items.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-white/10 bg-ink-900/40 p-12 text-center text-sm text-zinc-400">
              {t("empty")}
            </div>
          ) : (
            <>
              <div className="mt-8">
                <VenueMap
                  midpoint={{ lat: data.midpoint_lat, lng: data.midpoint_lng }}
                  venues={data.items.map((v) => ({
                    id: v.id,
                    lat: v.lat,
                    lng: v.lng,
                    name: v.name,
                    address: v.address,
                  }))}
                  self={{ ...data.me, label: t("youLabel") }}
                  partner={{
                    ...data.partner,
                    label:
                      data.partner.gender === "female"
                        ? t("herLabel")
                        : t("himLabel"),
                  }}
                />
                <p className="mt-3 inline-flex items-center gap-2 text-xs text-matcha-200">
                  <Sparkles className="h-3 w-3" />
                  {t("midpoint")}: {data.midpoint_lat.toFixed(5)},{" "}
                  {data.midpoint_lng.toFixed(5)}
                </p>
              </div>

              {!data.can_pick && (
                <p className="mt-6 rounded-2xl border border-matcha-300/20 bg-matcha-300/5 p-4 text-sm text-matcha-100">
                  {t("onlyInitiator")}
                </p>
              )}

              <ul className="mt-8 space-y-4">
                {data.items.map((v) => (
                  <VenueCard
                    key={v.id}
                    venue={v}
                    onPick={pickVenue}
                    canPick={data.can_pick}
                  />
                ))}
              </ul>
            </>
          )}
        </section>
      </main>
    </>
  );
}

function VenueCard({
  venue,
  onPick,
  canPick,
}: {
  venue: Venue;
  onPick: (venueId: number, isoMeetingAt: string) => Promise<void>;
  canPick: boolean;
}) {
  const t = useTranslations("venues");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`;
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!date || !time) return;
    const iso = tashkentIso(date, time);
    if (!isFutureTashkent(iso)) {
      setErr(t("datePast"));
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      await onPick(venue.id, iso);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <li className="overflow-hidden rounded-2xl border border-white/5 bg-ink-900/40 transition hover:border-matcha-300/30">
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-[200px_1fr]">
        <div className="relative aspect-[4/3] sm:aspect-auto sm:h-full sm:min-h-[180px] overflow-hidden bg-ink-800">
          {venue.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={venue.image_url}
              alt={venue.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-700">
              <MapPin className="h-12 w-12" aria-hidden />
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-display text-xl text-zinc-50">{venue.name}</h3>
            {venue.distance_km != null && (
              <span className="text-[11px] uppercase tracking-wider text-matcha-200">
                {t("distanceFromMidpoint", { km: venue.distance_km })}
              </span>
            )}
          </div>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <MapPin className="h-3 w-3" />
            {venue.address}
          </p>
          {venue.description && (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-300">
              {venue.description}
            </p>
          )}

          <div className="mt-4">
            {venue.promos.length === 0 ? (
              <p className="text-xs text-zinc-500">{t("noActivePromos")}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {venue.promos.map((p) => (
                  <li
                    key={p.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-matcha-300/30 bg-matcha-300/5 px-3 py-1.5"
                  >
                    <Tag className="h-3 w-3 text-matcha-300" />
                    <span className="font-mono text-xs text-matcha-100">{p.code}</span>
                    <span className="text-[11px] uppercase tracking-wider text-matcha-200">
                      {p.discount_text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-zinc-300 transition hover:text-matcha-200"
            >
              {t("openInMaps")}
              <ExternalLink className="h-3 w-3" />
            </a>
            {canPick && !picking ? (
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-matcha-300 px-4 py-2 text-xs font-medium uppercase tracking-wider text-ink-950 shadow-glow hover:bg-matcha-200"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("pick")}
              </button>
            ) : null}
          </div>

          {canPick && picking && (
            <div className="mt-4 rounded-xl border border-matcha-300/30 bg-matcha-300/5 p-3">
              <p className="text-[11px] uppercase tracking-wider text-matcha-200">
                {t("pickedTitle")}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-400">
                    <Calendar className="h-3 w-3" />
                    {t("datePlaceholder")}
                  </span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-ink-800/60 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-matcha-300/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-400">
                    <Clock className="h-3 w-3" />
                    {t("timePlaceholder")}
                  </span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-ink-800/60 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-matcha-300/50"
                  />
                </label>
              </div>
              {err && (
                <p className="mt-2 text-xs text-red-300">{err}</p>
              )}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPicking(false);
                    setErr(null);
                  }}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs uppercase tracking-wider text-zinc-300 hover:border-white/20"
                >
                  {t("pickCancel")}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || !date || !time}
                  className="inline-flex items-center gap-2 rounded-full bg-matcha-300 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-ink-950 shadow-glow hover:bg-matcha-200 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  {t("pickConfirm")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
