"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Link } from "@/i18n/routing";
import { hasToken } from "@/lib/auth";

type Variant = "hero" | "final";

export function LandingCta({
  variant = "hero",
  withSparkles = false,
  primaryLabel,
  primaryAuthedLabel,
}: {
  variant?: Variant;
  withSparkles?: boolean;
  primaryLabel: string;
  primaryAuthedLabel: string;
}) {
  void variant;
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthed(hasToken());
    const onStorage = () => setAuthed(hasToken());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!mounted) {
    return (
      <span
        className="inline-flex h-12 w-44 animate-pulse rounded-full bg-white/5"
        aria-hidden
      />
    );
  }

  const href = authed ? "/profile" : "/auth/register";
  const label = authed ? primaryAuthedLabel : primaryLabel;

  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-full bg-matcha-300 px-7 py-3.5 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-matcha-200"
    >
      {withSparkles && <Sparkles className="h-4 w-4" aria-hidden />}
      {label}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export function LandingFinalCopy({
  kicker,
  title,
  subtitle,
  kickerAuthed,
  titleAuthed,
  subtitleAuthed,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  kickerAuthed: string;
  titleAuthed: string;
  subtitleAuthed: string;
}) {
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthed(hasToken());
    const onStorage = () => setAuthed(hasToken());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!mounted) return null;

  const k = authed ? kickerAuthed : kicker;
  const t = authed ? titleAuthed : title;
  const s = authed ? subtitleAuthed : subtitle;

  return (
    <>
      <span className="text-[11px] uppercase tracking-[0.25em] text-matcha-200">{k}</span>
      <h2 className="mt-3 font-display text-4xl font-light leading-[1.1] tracking-tight text-zinc-50 sm:text-5xl md:text-6xl">
        {t}
      </h2>
      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
        {s}
      </p>
    </>
  );
}
