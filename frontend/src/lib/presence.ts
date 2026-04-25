/**
 * Format a "last seen" status given an ISO timestamp.
 * Returns a translation key + parameters for next-intl.
 */
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
  if (!isoLastSeen) return { kind: "hidden" };

  const seen = new Date(isoLastSeen);
  if (Number.isNaN(seen.getTime())) return { kind: "hidden" };

  const now = Date.now();
  const diff = now - seen.getTime();

  if (diff < ONLINE_THRESHOLD_MS) return { kind: "online" };
  if (diff < RECENTLY_THRESHOLD_MS) return { kind: "recently" };

  const today = new Date();
  const sameDay =
    seen.getFullYear() === today.getFullYear() &&
    seen.getMonth() === today.getMonth() &&
    seen.getDate() === today.getDate();

  const time = seen.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (sameDay) return { kind: "lastSeenAt", time };

  const date = seen.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
  });
  return { kind: "lastSeenOnDate", date, time };
}
