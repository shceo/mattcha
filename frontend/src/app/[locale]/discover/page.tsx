"use client";

import { Briefcase, Loader2, MapPin, MessageCircle, UserCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Header } from "@/components/Header";
import { Link, useRouter } from "@/i18n/routing";
import { ApiError, api, apiBaseUrl } from "@/lib/api";
import { clearTokens, hasToken } from "@/lib/auth";

type DiscoverCard = {
  user_id: number;
  full_name: string;
  gender: "male" | "female";
  age: number;
  occupation: string | null;
  life_goals: string | null;
  address: string | null;
  distance_km: number | null;
  primary_photo_url: string | null;
};

type DiscoverPage = {
  items: DiscoverCard[];
  next_offset: number | null;
};

export default function DiscoverPage() {
  const t = useTranslations("discover");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [items, setItems] = useState<DiscoverCard[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/auth/login");
      return;
    }
    void loadPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPage(offset: number, replace: boolean) {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    try {
      const data = await api<DiscoverPage>(
        `/discover?limit=20&offset=${offset}`,
      );
      setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
      setNextOffset(data.next_offset);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearTokens();
        router.replace("/auth/login");
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        setNeedsProfile(true);
        return;
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  return (
    <>
      <Header />
      <main className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-matcha-radial" aria-hidden />
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-12">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-light tracking-tight text-zinc-50 sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">{t("subtitle")}</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-24 text-zinc-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {tCommon("loading")}
            </div>
          ) : needsProfile ? (
            <div className="mt-12 rounded-2xl border border-white/10 bg-ink-900/40 p-8 text-center">
              <p className="text-sm text-zinc-300">{t("noProfile")}</p>
              <Link
                href="/profile"
                className="mt-4 inline-flex items-center rounded-full bg-matcha-300 px-5 py-2 text-xs font-medium uppercase tracking-wider text-ink-950 shadow-glow transition hover:bg-matcha-200"
              >
                {t("createProfile")}
              </Link>
            </div>
          ) : items.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-white/10 bg-ink-900/40 p-12 text-center text-sm text-zinc-400">
              {t("empty")}
            </div>
          ) : (
            <>
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((card) => (
                  <Card key={card.user_id} card={card} />
                ))}
              </div>
              {nextOffset != null && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => loadPage(nextOffset, false)}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-wider text-zinc-300 transition hover:border-matcha-300/40 hover:text-matcha-200 disabled:opacity-60"
                  >
                    {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {t("loadMore")}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}

function Card({ card }: { card: DiscoverCard }) {
  const t = useTranslations("discover");
  const photo = card.primary_photo_url ? `${apiBaseUrl}${card.primary_photo_url}` : null;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-ink-900/40 transition hover:border-matcha-300/30 hover:shadow-glow">
      <div className="relative aspect-[4/5] overflow-hidden bg-ink-800">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={card.full_name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-700">
            <UserCircle2 className="h-20 w-20" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="font-display text-2xl text-zinc-50">
            {card.full_name}
            <span className="ml-2 text-zinc-300">{card.age}</span>
          </h3>
          {card.address && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-300">
              <MapPin className="h-3 w-3" aria-hidden />
              {card.address}
              {card.distance_km != null && (
                <span className="text-matcha-200">
                  · {t("kmAway", { km: card.distance_km })}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {card.occupation && (
          <p className="inline-flex items-start gap-2 text-xs text-zinc-400">
            <Briefcase className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-matcha-300/80" aria-hidden />
            <span>{card.occupation}</span>
          </p>
        )}
        {card.life_goals && (
          <p className="line-clamp-3 text-sm leading-relaxed text-zinc-300">
            {card.life_goals}
          </p>
        )}
        <div className="mt-auto pt-2">
          <Link
            href={`/chat/${card.user_id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-matcha-300/30 bg-matcha-300/10 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-matcha-100 transition hover:border-matcha-300/60 hover:bg-matcha-300/20 hover:text-matcha-50"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {t("openChat")}
          </Link>
        </div>
      </div>
    </article>
  );
}
