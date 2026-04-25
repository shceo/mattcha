"use client";

import { ArrowLeft, ExternalLink, Loader2, MapPin, Sparkles, Tag } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { use, useEffect, useState } from "react";

import { Header } from "@/components/Header";
import { Link, useRouter } from "@/i18n/routing";
import { ApiError, api } from "@/lib/api";
import { clearTokens, hasToken } from "@/lib/auth";

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
  const router = useRouter();

  const [data, setData] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ kind: "notMatched" | "locationMissing" | "other"; detail?: string } | null>(null);

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
            <div className="mt-12 rounded-2xl border border-red-400/30 bg-red-400/5 p-8 text-sm text-red-200">
              {error.kind === "notMatched"
                ? t("notMatched")
                : error.kind === "locationMissing"
                ? t("locationMissing")
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
                />
                <p className="mt-3 inline-flex items-center gap-2 text-xs text-matcha-200">
                  <Sparkles className="h-3 w-3" />
                  {t("midpoint")}: {data.midpoint_lat.toFixed(5)},{" "}
                  {data.midpoint_lng.toFixed(5)}
                </p>
              </div>

              <ul className="mt-8 space-y-4">
                {data.items.map((v) => (
                  <VenueCard key={v.id} venue={v} />
                ))}
              </ul>
            </>
          )}
        </section>
      </main>
    </>
  );
}

function VenueCard({ venue }: { venue: Venue }) {
  const t = useTranslations("venues");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`;
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

          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-zinc-300 transition hover:text-matcha-200"
          >
            {t("openInMaps")}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </li>
  );
}
