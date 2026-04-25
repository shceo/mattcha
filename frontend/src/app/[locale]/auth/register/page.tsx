"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Header } from "@/components/Header";
import { Link, useRouter } from "@/i18n/routing";
import { ApiError } from "@/lib/api";
import { registerUser } from "@/lib/auth";

type Mode = "email" | "phone";

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const tErr = useTranslations("auth.errors");
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError(tErr("passwordTooShort"));
    if (password !== confirm) return setError(tErr("passwordMismatch"));
    if (mode === "phone") {
      const cleaned = phone.replace(/\s+/g, "");
      if (!/^\+\d{6,}$/.test(cleaned)) return setError(tErr("invalidPhone"));
    }
    setSubmitting(true);
    try {
      await registerUser(
        mode === "email"
          ? { email: email.trim().toLowerCase(), password }
          : { phone: phone.replace(/\s+/g, ""), password },
      );
      router.push("/profile");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(tErr("alreadyExists"));
      } else if (err instanceof ApiError && typeof err.detail === "string") {
        setError(err.detail);
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
            <div className="inline-flex w-full rounded-full border border-white/10 bg-ink-800/60 p-1 text-xs">
              {(["email", "phone"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-full px-4 py-1.5 uppercase tracking-wider transition ${
                    mode === m
                      ? "bg-matcha-300 text-ink-950"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {m === "email" ? t("useEmail") : t("usePhone")}
                </button>
              ))}
            </div>

            {mode === "email" ? (
              <Field label={t("useEmail")}>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </Field>
            ) : (
              <Field label={t("usePhone")}>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder={t("phonePlaceholder")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls}
                />
              </Field>
            )}

            <Field label={t("password")} hint={t("passwordHint")}>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label={t("passwordConfirm")}>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputCls}
              />
            </Field>

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
            {t("haveAccount")}{" "}
            <Link href="/auth/login" className="text-matcha-200 hover:text-matcha-100">
              {t("loginLink")}
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-matcha-300/50 focus:bg-ink-800";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-zinc-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}
