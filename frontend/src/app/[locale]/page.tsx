import {
  ChevronDown,
  Leaf,
  MapPin,
  MessageCircle,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";

import { Header } from "@/components/Header";
import { LandingCta, LandingFinalCopy } from "@/components/LandingCta";
import { Particles } from "@/components/Particles";
import { Link } from "@/i18n/routing";
import { loadLandingContent, type LandingContent } from "@/lib/landing-content";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = await loadLandingContent(locale);
  return <Landing c={content} />;
}

function Landing({ c }: { c: LandingContent }) {
  const year = new Date().getFullYear();

  return (
    <>
      <Header />

      <main className="relative overflow-hidden">
        <section className="relative">
          <div className="aurora -z-10" aria-hidden />
          <Particles />

          <div className="mx-auto max-w-6xl px-5 pb-24 pt-20 sm:px-6 sm:pt-32 md:pt-40">
            <div className="mx-auto max-w-3xl text-center fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-matcha-300/20 bg-matcha-300/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-matcha-200 backdrop-blur sm:text-[11px]">
                <Leaf className="h-3 w-3" aria-hidden />
                {c.kicker}
              </span>
              <h1 className="mt-6 font-display text-[34px] font-light leading-[1.05] tracking-tight text-zinc-50 text-balance glow-text sm:mt-7 sm:text-6xl md:text-7xl lg:text-[88px]">
                {c.title}
              </h1>
              <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-zinc-400 text-pretty sm:text-lg">
                {c.subtitle}
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <LandingCta
                  variant="hero"
                  primaryLabel={c.ctaPrimary}
                  primaryAuthedLabel={c.ctaPrimaryAuthed}
                />
                <a
                  href="#how"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-6 py-3 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:text-zinc-50"
                >
                  {c.ctaSecondary}
                </a>
              </div>
            </div>
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[120%] -translate-x-1/2 rounded-[50%] bg-matcha-300/10 blur-3xl"
          />
        </section>

        <section className="relative border-y border-white/5 bg-ink-900/30">
          <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
            <div className="mb-8 flex flex-col items-start gap-2 sm:mb-10 sm:flex-row sm:items-baseline sm:justify-between">
              <span className="text-[11px] uppercase tracking-[0.25em] text-matcha-200">
                {c.stats.kicker}
              </span>
              <h2 className="font-display text-2xl text-zinc-100 sm:text-3xl">
                {c.stats.title}
              </h2>
            </div>
            <ul className="grid gap-4 sm:grid-cols-3">
              {c.stats.items.map((s, idx) => (
                <li
                  key={idx}
                  className="group relative overflow-hidden rounded-2xl border border-white/5 bg-ink-900/40 p-7 transition hover:border-matcha-300/30"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-matcha-300/5 blur-2xl transition group-hover:bg-matcha-300/15"
                  />
                  <p className="font-display text-7xl font-light leading-none tracking-tight text-zinc-50 sm:text-8xl">
                    {s.value}
                  </p>
                  <p className="mt-4 text-sm font-medium text-matcha-200">{s.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{s.hint}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how" className="relative">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <div className="mb-10 flex flex-col items-start gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <span className="text-[11px] uppercase tracking-[0.25em] text-matcha-200">
                {c.stepsKicker}
              </span>
              <h2 className="font-display text-3xl text-zinc-100 sm:text-4xl">
                {c.stepsTitle}
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Step index={1} icon={<Users className="h-5 w-5" aria-hidden />} title={c.feature1Title} body={c.feature1Body} />
              <Step
                index={2}
                icon={<MessageCircle className="h-5 w-5" aria-hidden />}
                title={c.feature2Title}
                body={c.feature2Body}
              />
              <Step
                index={3}
                icon={<UtensilsCrossed className="h-5 w-5" aria-hidden />}
                title={c.feature3Title}
                body={c.feature3Body}
              />
            </div>
          </div>
        </section>

        <section className="relative border-y border-white/5 bg-gradient-to-b from-ink-900/30 to-ink-950">
          <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
            <span className="text-[11px] uppercase tracking-[0.25em] text-matcha-200">
              {c.manifesto.kicker}
            </span>
            <h2 className="mt-4 font-display text-4xl font-light leading-[1.1] tracking-tight text-zinc-50 text-balance sm:text-5xl md:text-6xl">
              {c.manifesto.title}
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-zinc-400 text-pretty sm:text-lg">
              {c.manifesto.body}
            </p>
            <p className="mt-6 text-xs uppercase tracking-[0.25em] text-matcha-200">
              {c.manifesto.signature}
            </p>
          </div>
        </section>

        <section className="relative">
          <div className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
            <div className="mb-10 text-center">
              <span className="text-[11px] uppercase tracking-[0.25em] text-matcha-200">
                {c.faq.kicker}
              </span>
              <h2 className="mt-3 font-display text-3xl text-zinc-100 sm:text-4xl">
                {c.faq.title}
              </h2>
            </div>
            <ul className="space-y-3">
              {c.faq.items.map((item, idx) => (
                <li key={idx}>
                  <details className="group rounded-2xl border border-white/5 bg-ink-900/40 p-5 transition open:border-matcha-300/30 open:bg-ink-900/60">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-zinc-100">
                      <span>{item.q}</span>
                      <ChevronDown
                        className="h-4 w-4 flex-shrink-0 text-zinc-400 transition group-open:rotate-180 group-open:text-matcha-200"
                        aria-hidden
                      />
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400 text-pretty">
                      {item.a}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-white/5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-20 h-80 bg-matcha-300/10 blur-3xl"
          />
          <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
            <LandingFinalCopy
              kicker={c.finalCta.kicker}
              title={c.finalCta.title}
              subtitle={c.finalCta.subtitle}
              kickerAuthed={c.finalCta.kickerAuthed}
              titleAuthed={c.finalCta.titleAuthed}
              subtitleAuthed={c.finalCta.subtitleAuthed}
            />
            <div className="mt-8">
              <LandingCta
                variant="final"
                withSparkles
                primaryLabel={c.finalCta.button}
                primaryAuthedLabel={c.finalCta.buttonAuthed}
              />
            </div>
          </div>
        </section>

        <footer className="border-t border-white/5 bg-ink-950">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-baseline gap-1.5">
                <span className="font-display text-2xl text-zinc-100">mattcha</span>
                <span className="h-1.5 w-1.5 rounded-full bg-matcha-300 shadow-[0_0_12px_rgba(168,199,115,0.8)]" />
              </div>
              <p className="mt-2 text-xs text-zinc-500">{c.footer.tagline}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-xs text-zinc-500 sm:grid-cols-2">
              <span className="uppercase tracking-[0.2em] text-zinc-600">{c.footer.for}</span>
              <span className="uppercase tracking-[0.2em] text-zinc-600">{c.footer.for}</span>
              <Link href="/auth/register" className="hover:text-matcha-200">
                {c.footer.users}
              </Link>
              <a
                href={c.footer.partnersEmail ? `mailto:${c.footer.partnersEmail}` : c.footer.venuesUrl || "mailto:partners@mattcha.uz"}
                className="hover:text-matcha-200"
              >
                {c.footer.venues}
              </a>
            </div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">
              {c.footer.copyright.replace("{year}", String(year))}
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}

function Step({
  index,
  icon,
  title,
  body,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/5 bg-ink-900/40 p-7 transition hover:border-matcha-300/30 hover:shadow-glow">
      <div className="flex items-start justify-between">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-matcha-300/20 bg-matcha-300/5 text-matcha-200">
          {icon}
        </span>
        <span className="font-display text-5xl font-light text-zinc-700/40">0{index}</span>
      </div>
      <h3 className="mt-6 font-display text-2xl text-zinc-50 text-balance">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400 text-pretty">{body}</p>
    </article>
  );
}
