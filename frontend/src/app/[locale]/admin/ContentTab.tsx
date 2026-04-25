"use client";

import { Loader2, Plus, RotateCcw, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { LandingContent } from "@/lib/landing-content";
import { toast } from "@/lib/toast";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink-800/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-matcha-300/50 focus:bg-ink-800";

type Locale = "ru" | "en" | "uz";

const FALLBACK: Record<Locale, () => Promise<LandingContent>> = {
  ru: async () => (await import("../../../../messages/ru.json")).default.landing,
  en: async () => (await import("../../../../messages/en.json")).default.landing,
  uz: async () => (await import("../../../../messages/uz.json")).default.landing,
};

export function ContentTab() {
  const t = useTranslations("admin.content");
  const tToast = useTranslations("toast");
  const [locale, setLocale] = useState<Locale>("ru");
  const [content, setContent] = useState<LandingContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load(l: Locale) {
    setLoading(true);
    try {
      const fromDb = await api<LandingContent | null>(`/admin/content/landing/${l}`);
      if (fromDb && typeof fromDb === "object") {
        setContent(fromDb);
      } else {
        setContent(await FALLBACK[l]());
      }
    } catch {
      setContent(await FALLBACK[l]());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function save() {
    if (!content) return;
    setSaving(true);
    try {
      const saved = await api<LandingContent>(`/admin/content/landing/${locale}`, {
        method: "PUT",
        json: content,
      });
      setContent(saved);
      toast.success(tToast("profileSaved"));
    } catch {
      toast.error(tToast("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm(t("resetConfirm"))) return;
    try {
      await api(`/admin/content/landing/${locale}`, { method: "DELETE" });
      setContent(await FALLBACK[locale]());
      toast.success(tToast("profileSaved"));
    } catch {
      toast.error(tToast("saveFailed"));
    }
  }

  function setField<K extends keyof LandingContent>(key: K, value: LandingContent[K]) {
    setContent((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading || !content) {
    return (
      <p className="flex items-center justify-center py-12 text-zinc-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t("loading")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-white/10 bg-ink-800/60 p-1 text-xs">
          {(["ru", "en", "uz"] as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`rounded-full px-4 py-1.5 uppercase tracking-wider transition ${
                locale === l
                  ? "bg-matcha-300 text-ink-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wider text-zinc-300 hover:border-red-400/40 hover:text-red-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("reset")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-matcha-300 px-4 py-2 text-xs font-medium uppercase tracking-wider text-ink-950 shadow-glow hover:bg-matcha-200 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {t("saveAll")}
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-500">{t("subtitle")}</p>

      <Section title={t("section.hero")}>
        <Row label={t("field.kicker")}>
          <input value={content.kicker} onChange={(e) => setField("kicker", e.target.value)} className={inputCls} />
        </Row>
        <Row label={t("field.title")} full>
          <textarea rows={2} value={content.title} onChange={(e) => setField("title", e.target.value)} className={`${inputCls} resize-none`} />
        </Row>
        <Row label={t("field.subtitle")} full>
          <textarea rows={3} value={content.subtitle} onChange={(e) => setField("subtitle", e.target.value)} className={`${inputCls} resize-none`} />
        </Row>
        <Row label={t("field.ctaPrimary")}>
          <input value={content.ctaPrimary} onChange={(e) => setField("ctaPrimary", e.target.value)} className={inputCls} />
        </Row>
        <Row label={t("field.ctaPrimaryAuthed")}>
          <input value={content.ctaPrimaryAuthed} onChange={(e) => setField("ctaPrimaryAuthed", e.target.value)} className={inputCls} />
        </Row>
        <Row label={t("field.ctaSecondary")}>
          <input value={content.ctaSecondary} onChange={(e) => setField("ctaSecondary", e.target.value)} className={inputCls} />
        </Row>
      </Section>

      <Section title={t("section.stats")}>
        <Row label={t("field.kicker")}>
          <input value={content.stats.kicker} onChange={(e) => setField("stats", { ...content.stats, kicker: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.title")}>
          <input value={content.stats.title} onChange={(e) => setField("stats", { ...content.stats, title: e.target.value })} className={inputCls} />
        </Row>
        <div className="sm:col-span-2 space-y-3">
          {content.stats.items.map((it, idx) => (
            <div key={idx} className="rounded-xl border border-white/10 bg-ink-800/40 p-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <input value={it.value} onChange={(e) => updateArray("stats", "items", idx, { ...it, value: e.target.value }, content, setContent)} placeholder={t("field.statValue")} className={inputCls} />
                <input value={it.label} onChange={(e) => updateArray("stats", "items", idx, { ...it, label: e.target.value }, content, setContent)} placeholder={t("field.statLabel")} className={inputCls} />
                <input value={it.hint} onChange={(e) => updateArray("stats", "items", idx, { ...it, hint: e.target.value }, content, setContent)} placeholder={t("field.statHint")} className={inputCls} />
              </div>
              <button
                type="button"
                onClick={() => removeArrayItem("stats", "items", idx, content, setContent)}
                className="mt-2 inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/5 px-3 py-1 text-[10px] uppercase tracking-wider text-red-200 hover:bg-red-400/10"
              >
                <X className="h-3 w-3" />
                {t("removeItem")}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setField("stats", {
                ...content.stats,
                items: [...content.stats.items, { value: "", label: "", hint: "" }],
              })
            }
            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs uppercase tracking-wider text-zinc-300 hover:border-matcha-300/40 hover:text-matcha-200"
          >
            <Plus className="h-3 w-3" />
            {t("addStat")}
          </button>
        </div>
      </Section>

      <Section title={t("section.steps")}>
        <Row label={t("field.stepsKicker")}>
          <input value={content.stepsKicker} onChange={(e) => setField("stepsKicker", e.target.value)} className={inputCls} />
        </Row>
        <Row label={t("field.stepsTitle")}>
          <input value={content.stepsTitle} onChange={(e) => setField("stepsTitle", e.target.value)} className={inputCls} />
        </Row>
        {([1, 2, 3] as const).map((n) => {
          const tk = `feature${n}Title` as const;
          const bk = `feature${n}Body` as const;
          return (
            <div key={n} className="sm:col-span-2 rounded-xl border border-white/10 bg-ink-800/40 p-3">
              <Row label={t(`field.${tk}` as "field.feature1Title")}>
                <input value={content[tk] as string} onChange={(e) => setField(tk, e.target.value as never)} className={inputCls} />
              </Row>
              <Row label={t(`field.${bk}` as "field.feature1Body")} full>
                <textarea rows={3} value={content[bk] as string} onChange={(e) => setField(bk, e.target.value as never)} className={`${inputCls} resize-none`} />
              </Row>
            </div>
          );
        })}
      </Section>

      <Section title={t("section.manifesto")}>
        <Row label={t("field.kicker")}>
          <input value={content.manifesto.kicker} onChange={(e) => setField("manifesto", { ...content.manifesto, kicker: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.title")}>
          <input value={content.manifesto.title} onChange={(e) => setField("manifesto", { ...content.manifesto, title: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.manifestoBody")} full>
          <textarea rows={5} value={content.manifesto.body} onChange={(e) => setField("manifesto", { ...content.manifesto, body: e.target.value })} className={`${inputCls} resize-none`} />
        </Row>
        <Row label={t("field.manifestoSignature")}>
          <input value={content.manifesto.signature} onChange={(e) => setField("manifesto", { ...content.manifesto, signature: e.target.value })} className={inputCls} />
        </Row>
      </Section>

      <Section title={t("section.faq")}>
        <Row label={t("field.kicker")}>
          <input value={content.faq.kicker} onChange={(e) => setField("faq", { ...content.faq, kicker: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.title")}>
          <input value={content.faq.title} onChange={(e) => setField("faq", { ...content.faq, title: e.target.value })} className={inputCls} />
        </Row>
        <div className="sm:col-span-2 space-y-3">
          {content.faq.items.map((it, idx) => (
            <div key={idx} className="rounded-xl border border-white/10 bg-ink-800/40 p-3 space-y-2">
              <input value={it.q} onChange={(e) => updateArray("faq", "items", idx, { ...it, q: e.target.value }, content, setContent)} placeholder={t("field.faqQ")} className={inputCls} />
              <textarea rows={3} value={it.a} onChange={(e) => updateArray("faq", "items", idx, { ...it, a: e.target.value }, content, setContent)} placeholder={t("field.faqA")} className={`${inputCls} resize-none`} />
              <button
                type="button"
                onClick={() => removeArrayItem("faq", "items", idx, content, setContent)}
                className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/5 px-3 py-1 text-[10px] uppercase tracking-wider text-red-200 hover:bg-red-400/10"
              >
                <X className="h-3 w-3" />
                {t("removeItem")}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setField("faq", { ...content.faq, items: [...content.faq.items, { q: "", a: "" }] })}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs uppercase tracking-wider text-zinc-300 hover:border-matcha-300/40 hover:text-matcha-200"
          >
            <Plus className="h-3 w-3" />
            {t("addFaq")}
          </button>
        </div>
      </Section>

      <Section title={t("section.finalCta")}>
        <Row label={t("field.finalKicker")}>
          <input value={content.finalCta.kicker} onChange={(e) => setField("finalCta", { ...content.finalCta, kicker: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.finalKickerAuthed")}>
          <input value={content.finalCta.kickerAuthed} onChange={(e) => setField("finalCta", { ...content.finalCta, kickerAuthed: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.finalTitle")} full>
          <input value={content.finalCta.title} onChange={(e) => setField("finalCta", { ...content.finalCta, title: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.finalTitleAuthed")} full>
          <input value={content.finalCta.titleAuthed} onChange={(e) => setField("finalCta", { ...content.finalCta, titleAuthed: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.finalSubtitle")} full>
          <textarea rows={2} value={content.finalCta.subtitle} onChange={(e) => setField("finalCta", { ...content.finalCta, subtitle: e.target.value })} className={`${inputCls} resize-none`} />
        </Row>
        <Row label={t("field.finalSubtitleAuthed")} full>
          <textarea rows={2} value={content.finalCta.subtitleAuthed} onChange={(e) => setField("finalCta", { ...content.finalCta, subtitleAuthed: e.target.value })} className={`${inputCls} resize-none`} />
        </Row>
        <Row label={t("field.finalButton")}>
          <input value={content.finalCta.button} onChange={(e) => setField("finalCta", { ...content.finalCta, button: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.finalButtonAuthed")}>
          <input value={content.finalCta.buttonAuthed} onChange={(e) => setField("finalCta", { ...content.finalCta, buttonAuthed: e.target.value })} className={inputCls} />
        </Row>
      </Section>

      <Section title={t("section.footer")}>
        <Row label={t("field.footerTagline")} full>
          <input value={content.footer.tagline} onChange={(e) => setField("footer", { ...content.footer, tagline: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.footerFor")}>
          <input value={content.footer.for} onChange={(e) => setField("footer", { ...content.footer, for: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.footerCopyright")} full>
          <input value={content.footer.copyright} onChange={(e) => setField("footer", { ...content.footer, copyright: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.footerUsers")}>
          <input value={content.footer.users} onChange={(e) => setField("footer", { ...content.footer, users: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.footerVenues")}>
          <input value={content.footer.venues} onChange={(e) => setField("footer", { ...content.footer, venues: e.target.value })} className={inputCls} />
        </Row>
        <Row label={t("field.footerVenuesUrl")} full>
          <input value={content.footer.venuesUrl ?? ""} onChange={(e) => setField("footer", { ...content.footer, venuesUrl: e.target.value })} placeholder="https://… or mailto:" className={inputCls} />
        </Row>
        <Row label={t("field.footerPartnersEmail")} full>
          <input type="email" value={content.footer.partnersEmail ?? ""} onChange={(e) => setField("footer", { ...content.footer, partnersEmail: e.target.value })} placeholder="partners@mattcha.uz" className={inputCls} />
        </Row>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/5 bg-ink-900/40 p-5">
      <h3 className="mb-4 text-xs uppercase tracking-[0.25em] text-matcha-200">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Row({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function updateArray<
  K extends "stats" | "faq",
  IK extends "items",
  T extends LandingContent,
>(
  group: K,
  itemKey: IK,
  idx: number,
  next: T[K]["items"][number],
  content: T,
  setContent: React.Dispatch<React.SetStateAction<T | null>>,
) {
  setContent({
    ...content,
    [group]: {
      ...content[group],
      [itemKey]: content[group][itemKey].map((it: unknown, i: number) =>
        i === idx ? next : it,
      ),
    },
  });
}

function removeArrayItem<
  K extends "stats" | "faq",
  IK extends "items",
  T extends LandingContent,
>(
  group: K,
  itemKey: IK,
  idx: number,
  content: T,
  setContent: React.Dispatch<React.SetStateAction<T | null>>,
) {
  setContent({
    ...content,
    [group]: {
      ...content[group],
      [itemKey]: content[group][itemKey].filter((_: unknown, i: number) => i !== idx),
    },
  });
}
