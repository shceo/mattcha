export type StatItem = { value: string; label: string; hint: string };
export type FaqItem = { q: string; a: string };

export type LandingContent = {
  kicker: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaPrimaryAuthed: string;
  ctaSecondary: string;
  stats: { kicker: string; title: string; items: StatItem[] };
  stepsKicker: string;
  stepsTitle: string;
  feature1Title: string;
  feature1Body: string;
  feature2Title: string;
  feature2Body: string;
  feature3Title: string;
  feature3Body: string;
  manifesto: { kicker: string; title: string; body: string; signature: string };
  faq: { kicker: string; title: string; items: FaqItem[] };
  finalCta: {
    kicker: string;
    title: string;
    subtitle: string;
    button: string;
    kickerAuthed: string;
    titleAuthed: string;
    subtitleAuthed: string;
    buttonAuthed: string;
  };
  footer: {
    tagline: string;
    for: string;
    users: string;
    venues: string;
    venuesUrl?: string;
    partnersEmail?: string;
    copyright: string;
  };
};

const SERVER_API_URL =
  process.env.NEXT_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

async function fetchOverride(locale: string): Promise<LandingContent | null> {
  try {
    const res = await fetch(`${SERVER_API_URL}/content/landing/${locale}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object") return null;
    return data as LandingContent;
  } catch {
    return null;
  }
}

export async function loadLandingContent(locale: string): Promise<LandingContent> {
  const override = await fetchOverride(locale);
  if (override) return ensureDefaults(override);
  const messages = (await import(`../../messages/${locale}.json`)).default as {
    landing: LandingContent;
  };
  return messages.landing;
}

function ensureDefaults(c: LandingContent): LandingContent {
  // Tolerate older payloads that may lack newer optional link fields.
  return {
    ...c,
    footer: {
      venuesUrl: "",
      partnersEmail: "",
      ...c.footer,
    },
  };
}
