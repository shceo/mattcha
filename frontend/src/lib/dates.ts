/**
 * All user-facing dates render in Tashkent time (UTC+5),
 * regardless of where the visitor is physically located.
 */
export const TASHKENT_TZ = "Asia/Tashkent";
export const TASHKENT_OFFSET = "+05:00";

function parseServerDate(iso: string): Date {
  // Defensive: if backend ever returns a naive ISO again, treat it as UTC.
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)) {
    return new Date(`${iso}Z`);
  }
  return new Date(iso);
}

export function formatTashkentTime(iso: string, locale: string): string {
  return parseServerDate(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TASHKENT_TZ,
  });
}

export function formatTashkentDateTime(iso: string, locale: string): string {
  return parseServerDate(iso).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TASHKENT_TZ,
  });
}

export function formatTashkentDate(iso: string, locale: string): string {
  return parseServerDate(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    timeZone: TASHKENT_TZ,
  });
}

/**
 * Convert local-form date ("YYYY-MM-DD") + time ("HH:MM") into an ISO string
 * that explicitly carries the Tashkent offset so backend stores the right
 * absolute moment regardless of the user's device timezone.
 */
export function tashkentIso(date: string, time: string): string {
  return `${date}T${time}:00${TASHKENT_OFFSET}`;
}

export function isFutureTashkent(iso: string): boolean {
  const t = parseServerDate(iso).getTime();
  return Number.isFinite(t) && t > Date.now();
}

/** Server time helpers reused by presence: epoch ms, regardless of TZ. */
export function serverEpochMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = parseServerDate(iso).getTime();
  return Number.isFinite(t) ? t : null;
}
