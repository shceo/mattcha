"use client";

import {
  ArrowLeft,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  TimerOff,
  UserCircle2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { use, useCallback, useEffect, useRef, useState } from "react";

import { Header } from "@/components/Header";
import { Link, useRouter } from "@/i18n/routing";
import { ApiError, api, apiBaseUrl } from "@/lib/api";
import { clearTokens, hasToken } from "@/lib/auth";
import { formatTashkentDateTime, formatTashkentTime } from "@/lib/dates";
import { presenceFrom } from "@/lib/presence";
import { bumpUnread } from "@/lib/useUnread";

type Counterpart = {
  user_id: number;
  full_name: string;
  gender: "male" | "female";
  age: number;
  primary_photo_url: string | null;
  address: string | null;
  last_seen_at: string | null;
};

type PickedVenue = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  image_url: string | null;
};

type Match = {
  id: number;
  initiator_id: number;
  recipient_id: number;
  status: "open" | "matched" | "expired";
  quota_limit: number | null;
  quota_used: number;
  quota_remaining: number | null;
  matched_at: string | null;
  created_at: string;
  am_initiator: boolean;
  counterpart: Counterpart;
  unread_count: number;
  counterpart_last_read_id: number;
  picked_venue: PickedVenue | null;
  meeting_at: string | null;
};

type VenueMessageMeta = {
  venue_id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  image_url?: string | null;
  meeting_at: string;
};

type ChatMessage = {
  id: number; // negative = optimistic placeholder until server returns
  sender_id: number;
  body: string;
  created_at: string;
  kind?: string;
  meta?: VenueMessageMeta | null;
  pending?: boolean;
  failed?: boolean;
};

export default function ChatPage({
  params,
}: {
  params: Promise<{ locale: string; user_id: string }>;
}) {
  const { user_id } = use(params);
  return <ChatLoader otherUserId={Number(user_id)} />;
}

function ChatLoader({ otherUserId }: { otherUserId: number }) {
  const t = useTranslations("chat");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [cannotInitiate, setCannotInitiate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/auth/login");
      return;
    }
    (async () => {
      try {
        const m = await api<Match>(`/matches/with/${otherUserId}`, { method: "POST" });
        setMatch(m);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            clearTokens();
            router.replace("/auth/login");
            return;
          }
          const detail = typeof err.detail === "string" ? err.detail.toLowerCase() : "";
          if (err.status === 409 && detail.includes("profile")) {
            router.replace("/profile");
            return;
          }
          if (err.status === 403 && detail.includes("only the man")) {
            setCannotInitiate(true);
            return;
          }
          if (err.status === 400 && detail.includes("yourself")) {
            setError(t("errors.selfChat"));
          } else if (err.status === 400 && detail.includes("opposite")) {
            setError(t("errors.sameGender"));
          } else if (err.status === 404) {
            setError(t("errors.userGone"));
          } else {
            setError(t("errors.generic"));
          }
        } else {
          setError(t("errors.network"));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [otherUserId, router]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="mx-auto flex max-w-3xl items-center justify-center px-6 py-24 text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("loadingChat")}
        </main>
      </>
    );
  }

  if (cannotInitiate) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-md px-6 py-20 text-center">
          <div className="rounded-2xl border border-white/10 bg-ink-900/40 p-8">
            <Clock className="mx-auto h-8 w-8 text-matcha-300" />
            <p className="mt-4 text-sm text-zinc-300">{t("cantInitiate")}</p>
            <Link
              href="/matches"
              className="mt-6 inline-flex rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-wider text-zinc-300 hover:border-matcha-300/40 hover:text-matcha-200"
            >
              {t("back")}
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (error || !match) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-md px-6 py-20 text-center">
          <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-8">
            <p className="text-sm text-red-200">{error ?? tCommon("loading")}</p>
            <Link
              href="/matches"
              className="mt-6 inline-flex rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-wider text-zinc-300 hover:border-matcha-300/40 hover:text-matcha-200"
            >
              {t("back")}
            </Link>
          </div>
        </main>
      </>
    );
  }

  return <ChatRoom initialMatch={match} />;
}

function ChatRoom({ initialMatch }: { initialMatch: Match }) {
  const t = useTranslations("chat");
  const locale = useLocale();

  const [match, setMatch] = useState<Match>(initialMatch);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastIdRef = useRef<number>(0);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const m = await api<Match>(`/matches/${initialMatch.id}`);
      setMatch(m);
      const path = lastIdRef.current
        ? `/matches/${initialMatch.id}/messages?after=${lastIdRef.current}`
        : `/matches/${initialMatch.id}/messages`;
      const page = await api<{ items: ChatMessage[] }>(path);
      if (page.items.length) {
        setMessages((prev) => mergeMessages(prev, page.items));
        const maxId = page.items[page.items.length - 1].id;
        if (maxId > lastIdRef.current) lastIdRef.current = maxId;
        scrollToBottom();
      }
    } catch {
      // poll errors are silent
    }
  }, [initialMatch.id, scrollToBottom]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [refresh]);

  // Mark match as read on open & whenever new messages arrive from the other side.
  useEffect(() => {
    const lastFromOther = [...messages]
      .reverse()
      .find((m) => m.sender_id === match.counterpart.user_id);
    if (!lastFromOther) return;
    void api(`/matches/${match.id}/read`, { method: "POST" })
      .then(() => bumpUnread())
      .catch(() => {});
  }, [match.id, match.counterpart.user_id, messages]);

  const isInitiator = match.am_initiator;
  const isRecipient = !isInitiator;
  const status = match.status;

  const canSend =
    status === "matched" ||
    (status === "open" &&
      (!isInitiator || match.quota_remaining === null || match.quota_remaining > 0));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending || !canSend) return;
    setSending(true);
    setError(null);

    const meId = match.am_initiator ? match.initiator_id : match.recipient_id;
    const tempId = -Date.now();
    const optimistic: ChatMessage = {
      id: tempId,
      sender_id: meId,
      body,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    scrollToBottom();

    try {
      const created = await api<ChatMessage>(`/matches/${match.id}/messages`, {
        method: "POST",
        json: { body },
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...created } : m)),
      );
      lastIdRef.current = Math.max(lastIdRef.current, created.id);
      const m = await api<Match>(`/matches/${match.id}`);
      setMatch(m);
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
      );
      if (err instanceof ApiError && typeof err.detail === "string") setError(err.detail);
      else setError("error");
    } finally {
      setSending(false);
    }
  }

  async function agree() {
    try {
      const m = await api<Match>(`/matches/${match.id}/agree`, { method: "POST" });
      setMatch(m);
    } catch (err) {
      if (err instanceof ApiError && typeof err.detail === "string") setError(err.detail);
    }
  }

  async function extend(payload: { add?: number; unlimited?: boolean }) {
    try {
      const m = await api<Match>(`/matches/${match.id}/extend`, {
        method: "POST",
        json: payload,
      });
      setMatch(m);
    } catch (err) {
      if (err instanceof ApiError && typeof err.detail === "string") setError(err.detail);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 sm:px-6">
        <ChatTopbar match={match} />

        {status === "matched" && match.picked_venue && match.meeting_at && (
          <Banner tone="matcha" icon={<Sparkles className="h-4 w-4" />}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-matcha-50">
                {t("venuePicked")}: {match.picked_venue.name}
              </p>
              <p className="truncate text-[11px] text-matcha-200">
                {match.picked_venue.address} ·{" "}
                {formatTashkentDateTime(match.meeting_at, locale)}
              </p>
            </div>
            {match.am_initiator && (
              <Link
                href={`/match/${match.id}/venues`}
                className="inline-flex items-center rounded-full border border-matcha-300/40 bg-matcha-300/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-matcha-100 hover:bg-matcha-300/25"
              >
                {t("venueChange")}
              </Link>
            )}
          </Banner>
        )}
        {status === "matched" && !match.picked_venue && (
          <Banner tone="matcha" icon={<Sparkles className="h-4 w-4" />}>
            {match.am_initiator ? (
              <>
                <span>{t("matchedBanner")}</span>
                <Link
                  href={`/match/${match.id}/venues`}
                  className="ml-auto inline-flex items-center rounded-full bg-matcha-300 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-ink-950 hover:bg-matcha-200"
                >
                  {t("findVenue")}
                </Link>
              </>
            ) : (
              <span>{t("matchedHerView")}</span>
            )}
          </Banner>
        )}
        {status === "expired" && (
          <Banner tone="red" icon={<TimerOff className="h-4 w-4" />}>
            {t("expiredBanner")}
          </Banner>
        )}

        {status === "open" && isRecipient && (
          <RecipientActions onAgree={agree} onExtend={extend} />
        )}

        <div
          ref={listRef}
          className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-white/5 bg-ink-900/40 px-4 py-4"
        >
          {messages.length === 0 ? (
            <p className="my-12 text-center text-sm text-zinc-500">{t("empty")}</p>
          ) : (
            messages.map((msg) => {
              const mine = msg.sender_id !== match.counterpart.user_id;
              const time = formatTashkentTime(msg.created_at, locale);
              if (msg.kind === "venue" && msg.meta) {
                return (
                  <VenueBubble key={msg.id} mine={mine} time={time} meta={msg.meta} locale={locale} />
                );
              }
              return (
                <Bubble
                  key={msg.id}
                  mine={mine}
                  body={msg.body}
                  time={time}
                  status={
                    msg.failed
                      ? "failed"
                      : msg.pending
                        ? "sending"
                        : msg.id > 0 && msg.id <= match.counterpart_last_read_id
                          ? "read"
                          : "sent"
                  }
                />
              );
            })
          )}
        </div>

        <form
          onSubmit={send}
          className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-800/60 p-2"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              canSend
                ? t("placeholder")
                : status === "expired"
                ? t("expiredBanner")
                : t("noQuotaLeft")
            }
            disabled={!canSend || sending}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none disabled:cursor-not-allowed"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!canSend || sending || !draft.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-matcha-300 px-4 py-2 text-xs font-medium uppercase tracking-wider text-ink-950 shadow-glow transition hover:bg-matcha-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {t("send")}
          </button>
        </form>
        {error && (
          <p className="mt-2 rounded-xl border border-red-400/30 bg-red-400/5 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}
      </main>
    </>
  );
}

function ChatTopbar({ match }: { match: Match }) {
  const t = useTranslations("chat");
  return (
    <div className="flex items-center gap-3 border-b border-white/5 py-4">
      <Link
        href="/matches"
        aria-label={t("back")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:border-matcha-300/40 hover:text-matcha-200"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <Link
        href={`/profile/${match.counterpart.user_id}`}
        title={t("openProfile")}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 transition hover:bg-white/5"
      >
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-white/10 bg-ink-800 transition group-hover:border-matcha-300/40">
          {match.counterpart.primary_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${apiBaseUrl}${match.counterpart.primary_photo_url}`}
              alt={match.counterpart.full_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-700">
              <UserCircle2 className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 truncate">
            <span className="truncate font-display text-lg text-zinc-50">
              {match.counterpart.full_name}
            </span>
            <span className="text-zinc-500">{match.counterpart.age}</span>
          </div>
          <PresenceLine lastSeen={match.counterpart.last_seen_at} />
          <QuotaLine match={match} />
        </div>
      </Link>
    </div>
  );
}

function PresenceLine({ lastSeen }: { lastSeen: string | null }) {
  const tp = useTranslations("presence");
  const locale = useLocale();
  const state = presenceFrom(lastSeen, locale);
  if (state.kind === "hidden") return null;
  let label: string;
  let dotClass = "bg-zinc-600";
  if (state.kind === "online") {
    label = tp("online");
    dotClass = "bg-matcha-300 shadow-[0_0_8px_rgba(168,199,115,0.8)]";
  } else if (state.kind === "recently") {
    label = tp("recently");
  } else if (state.kind === "lastSeenAt") {
    label = tp("lastSeenAt", { time: state.time });
  } else {
    label = tp("lastSeenOnDate", { date: state.date, time: state.time });
  }
  return (
    <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
      {label}
    </p>
  );
}

function QuotaLine({ match }: { match: Match }) {
  const t = useTranslations("chat");
  if (match.status === "matched") {
    return (
      <p className="text-[11px] uppercase tracking-wider text-matcha-200">
        <CheckCircle2 className="mr-1 inline h-3 w-3" />
        match
      </p>
    );
  }
  if (match.status === "expired") {
    return (
      <p className="text-[11px] uppercase tracking-wider text-red-300/80">
        <TimerOff className="mr-1 inline h-3 w-3" />
        {t("expiredBanner")}
      </p>
    );
  }
  if (match.quota_limit === null) {
    return (
      <p className="text-[11px] uppercase tracking-wider text-zinc-400">{t("unlimited")}</p>
    );
  }
  return (
    <p className="text-[11px] uppercase tracking-wider text-zinc-400">
      {match.am_initiator
        ? t("messagesLeftInitiator", { used: match.quota_used, limit: match.quota_limit })
        : t("messagesLeftRecipient", { used: match.quota_used, limit: match.quota_limit })}
    </p>
  );
}

function VenueBubble({
  mine,
  time,
  meta,
  locale,
}: {
  mine: boolean;
  time: string;
  meta: VenueMessageMeta;
  locale: string;
}) {
  const t = useTranslations("chat");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${meta.lat},${meta.lng}`;
  const meetWhen = formatTashkentDateTime(meta.meeting_at, locale);
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="w-full max-w-[88%] overflow-hidden rounded-2xl border border-matcha-300/30 bg-matcha-300/10 text-matcha-50 shadow-glow">
        {meta.image_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={meta.image_url}
            alt={meta.name}
            className="h-32 w-full object-cover"
          />
        )}
        <div className="space-y-2 p-4">
          <p className="text-[10px] uppercase tracking-[0.25em] text-matcha-200">
            {t("venuePicked")}
          </p>
          <p className="font-display text-lg leading-tight text-zinc-50">
            {meta.name}
          </p>
          <p className="inline-flex items-start gap-1.5 text-xs text-matcha-100">
            <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
            {meta.address}
          </p>
          <p className="text-xs text-matcha-200">
            <span className="uppercase tracking-wider">{t("venueAt")}:</span> {meetWhen}
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-matcha-300/40 bg-matcha-300/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-matcha-100 hover:bg-matcha-300/20"
          >
            <MapPin className="h-3 w-3" />
            Maps
          </a>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-matcha-200/70">
            {time}
          </p>
        </div>
      </div>
    </div>
  );
}

type BubbleStatus = "sending" | "sent" | "read" | "failed";

function Bubble({
  mine,
  body,
  time,
  status,
}: {
  mine: boolean;
  body: string;
  time: string;
  status?: BubbleStatus;
}) {
  const t = useTranslations("chat.status");
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
          mine
            ? `bg-matcha-300 text-ink-950 ${status === "failed" ? "opacity-70" : ""}`
            : "border border-white/10 bg-ink-800 text-zinc-100"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{body}</p>
        <p
          className={`mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider ${
            mine ? "text-ink-950/70" : "text-zinc-500"
          }`}
        >
          <span>{time}</span>
          {mine && status && (
            <span title={t(status)} className="inline-flex items-center">
              {status === "sending" && <Clock className="h-3 w-3 animate-pulse" />}
              {status === "sent" && <Check className="h-3 w-3" />}
              {status === "read" && (
                <CheckCheck className="h-3 w-3 text-matcha-700" />
              )}
              {status === "failed" && (
                <Clock className="h-3 w-3 rotate-180 text-red-700" />
              )}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: "matcha" | "red";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const cls =
    tone === "matcha"
      ? "border-matcha-300/30 bg-matcha-300/5 text-matcha-100"
      : "border-red-400/30 bg-red-400/5 text-red-200";
  return (
    <div
      className={`mt-3 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${cls}`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <div className="flex flex-1 items-center gap-3">{children}</div>
    </div>
  );
}

function RecipientActions({
  onAgree,
  onExtend,
}: {
  onAgree: () => void;
  onExtend: (p: { add?: number; unlimited?: boolean }) => void;
}) {
  const t = useTranslations("chat");
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onAgree}
        className="inline-flex items-center gap-2 rounded-full bg-matcha-300 px-4 py-2 text-xs font-medium uppercase tracking-wider text-ink-950 shadow-glow transition hover:bg-matcha-200"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("agreeButton")}
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wider text-zinc-300 transition hover:border-matcha-300/40 hover:text-matcha-200"
        >
          {t("extendLabel")}
        </button>
        {open && (
          <div className="absolute left-0 top-full z-10 mt-2 w-56 rounded-2xl border border-white/10 bg-ink-900/95 p-2 shadow-glow backdrop-blur">
            <button
              type="button"
              onClick={() => {
                onExtend({ add: 15 });
                setOpen(false);
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5"
            >
              {t("extend15")}
            </button>
            <button
              type="button"
              onClick={() => {
                onExtend({ add: 30 });
                setOpen(false);
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5"
            >
              {t("extend30")}
            </button>
            <button
              type="button"
              onClick={() => {
                onExtend({ unlimited: true });
                setOpen(false);
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5"
            >
              {t("extendUnlimited")}
            </button>
            <div className="mt-1 border-t border-white/5 pt-2">
              <p className="px-3 text-[10px] uppercase tracking-wider text-zinc-500">
                {t("extendCustomTitle")}
              </p>
              <div className="mt-1 flex gap-2 px-2">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-ink-800 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-matcha-300/40"
                />
                <button
                  type="button"
                  onClick={() => {
                    const n = Number(custom);
                    if (n >= 1 && n <= 500) {
                      onExtend({ add: n });
                      setOpen(false);
                      setCustom("");
                    }
                  }}
                  className="inline-flex items-center rounded-lg bg-matcha-300 px-2.5 py-1 text-[11px] font-medium text-ink-950 hover:bg-matcha-200"
                >
                  {t("extendCustomConfirm")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return prev;
  const seen = new Set(prev.map((m) => m.id));
  const merged = prev.slice();
  for (const it of incoming) {
    if (!seen.has(it.id)) merged.push(it);
  }
  merged.sort((a, b) => a.id - b.id);
  return merged;
}
