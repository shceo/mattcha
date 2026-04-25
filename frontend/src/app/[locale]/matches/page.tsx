"use client";

import { Loader2, MessageCircle, UserCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Header } from "@/components/Header";
import { Link, useRouter } from "@/i18n/routing";
import { ApiError, api, apiBaseUrl } from "@/lib/api";
import { clearTokens, hasToken } from "@/lib/auth";
import { formatTashkentTime } from "@/lib/dates";

type CounterpartCard = {
  user_id: number;
  full_name: string;
  gender: "male" | "female";
  age: number;
  primary_photo_url: string | null;
  address: string | null;
};

type MatchListItem = {
  id: number;
  status: "open" | "matched" | "expired";
  quota_limit: number | null;
  quota_used: number;
  matched_at: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  am_initiator: boolean;
  counterpart: CounterpartCard;
  unread_count: number;
};

export default function MatchesPage() {
  const t = useTranslations("matches");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const locale = useLocale();

  const [items, setItems] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/auth/login");
      return;
    }
    (async () => {
      try {
        const data = await api<MatchListItem[]>("/matches");
        setItems(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearTokens();
          router.replace("/auth/login");
          return;
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <>
      <Header />
      <main className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-matcha-radial" aria-hidden />
        <section className="mx-auto max-w-3xl px-6 pb-24 pt-12">
          <h1 className="font-display text-4xl font-light tracking-tight text-zinc-50 sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">{t("subtitle")}</p>

          {loading ? (
            <div className="mt-12 flex justify-center text-zinc-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {tCommon("loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-white/10 bg-ink-900/40 p-12 text-center text-sm text-zinc-400">
              {t("empty")}
            </div>
          ) : (
            <ul className="mt-10 space-y-2">
              {items.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/chat/${m.counterpart.user_id}`}
                    className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-ink-900/40 p-4 transition hover:border-matcha-300/30 hover:shadow-glow"
                  >
                    <Avatar card={m.counterpart} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg text-zinc-50">
                          {m.counterpart.full_name}
                        </span>
                        <span className="text-zinc-500">{m.counterpart.age}</span>
                        <StatusBadge status={m.status} />
                      </div>
                      <p
                        className={`mt-1 truncate text-sm ${
                          m.unread_count > 0
                            ? "font-medium text-zinc-100"
                            : "text-zinc-400"
                        }`}
                      >
                        {m.last_message_preview ?? t("noMessagesYet")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      {m.last_message_at && (
                        <span className="text-[11px] text-zinc-500">
                          {formatTashkentTime(m.last_message_at, locale)}
                        </span>
                      )}
                      {m.unread_count > 0 ? (
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-matcha-300 px-1.5 text-[11px] font-semibold text-ink-950 shadow-glow">
                          {m.unread_count > 99 ? "99+" : m.unread_count}
                        </span>
                      ) : (
                        <MessageCircle className="h-4 w-4 text-zinc-600 transition group-hover:text-matcha-300" />
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function Avatar({ card }: { card: CounterpartCard }) {
  return (
    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border border-white/10 bg-ink-800">
      {card.primary_photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${apiBaseUrl}${card.primary_photo_url}`}
          alt={card.full_name}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-zinc-700">
          <UserCircle2 className="h-8 w-8" aria-hidden />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: MatchListItem["status"] }) {
  const t = useTranslations("matches");
  const cls =
    status === "matched"
      ? "border-matcha-300/40 bg-matcha-300/10 text-matcha-200"
      : status === "expired"
      ? "border-red-400/30 bg-red-400/5 text-red-300"
      : "border-white/10 bg-white/5 text-zinc-400";
  const label =
    status === "matched"
      ? t("statusMatched")
      : status === "expired"
      ? t("statusExpired")
      : t("statusOpen");
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}
