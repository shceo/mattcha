"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Header } from "@/components/Header";
import { Link, useRouter } from "@/i18n/routing";
import { ApiError } from "@/lib/api";
import { loginUser } from "@/lib/auth";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const tErr = useTranslations("auth.errors");
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginUser({ identifier: identifier.trim(), password });
      router.push("/profile");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError(tErr("invalidCredentials"));
      } else {
        setError(tErr("generic"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <main className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-matcha-radial" aria-hidden />
        <section className="mx-auto flex max-w-md flex-col px-6 pb-16 pt-16">
          <h1 className="font-display text-4xl font-light tracking-tight text-zinc-50">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">{t("subtitle")}</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wider text-zinc-400">
                {t("identifier")}
              </span>
              <input
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-matcha-300/50 focus:bg-ink-800"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wider text-zinc-400">
                {t("password")}
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-matcha-300/50 focus:bg-ink-800"
              />
            </label>

            {error && (
              <p className="rounded-xl border border-red-400/30 bg-red-400/5 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-matcha-300 px-6 py-3 text-sm font-medium text-ink-950 shadow-glow transition hover:bg-matcha-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("submit")}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            {t("noAccount")}{" "}
            <Link href="/auth/register" className="text-matcha-200 hover:text-matcha-100">
              {t("registerLink")}
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
