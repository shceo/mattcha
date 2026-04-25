import { formatTashkentDate, formatTashkentTime, serverEpochMs, TASHKENT_TZ } from "./dates";

export type PresenceState =
  | { kind: "online" }
  | { kind: "recently" }
  | { kind: "lastSeenAt"; time: string }
  | { kind: "lastSeenOnDate"; date: string; time: string }
  | { kind: "hidden" };

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
const RECENTLY_THRESHOLD_MS = 30 * 60 * 1000;

export function presenceFrom(
  isoLastSeen: string | null | undefined,
  locale: string,
  hiddenByUser = false,
): PresenceState {
  if (hiddenByUser) return { kind: "hidden" };
  const seenMs = serverEpochMs(isoLastSeen);
  if (seenMs == null) return { kind: "hidden" };

  const diff = Date.now() - seenMs;
  if (diff < ONLINE_THRESHOLD_MS) return { kind: "online" };
  if (diff < RECENTLY_THRESHOLD_MS) return { kind: "recently" };

  // Day comparison done in Tashkent timezone so "today" matches what the user sees.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: TASHKENT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const seenDate = new Date(seenMs);
  const sameDay = today.format(seenDate) === today.format(new Date());

  const time = formatTashkentTime(isoLastSeen as string, locale);
  if (sameDay) return { kind: "lastSeenAt", time };

  const date = formatTashkentDate(isoLastSeen as string, locale);
  return { kind: "lastSeenOnDate", date, time };
}
