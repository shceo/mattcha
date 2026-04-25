"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "@/i18n/routing";
import { api } from "@/lib/api";
import { hasToken, type Me } from "@/lib/auth";

export function AuthNav() {
  const t = useTranslations("header");
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    setMounted(true);
    setAuthed(hasToken());
    if (hasToken()) {
      api<Me>("/auth/me")
        .then(setMe)
        .catch(() => {});
    }
    const onStorage = () => {
      setAuthed(hasToken());
      if (!hasToken()) setMe(null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!mounted) {
    return (
      <span className="inline-flex h-7 w-20 animate-pulse rounded-full bg-white/5" aria-hidden />
    );
  }

  if (authed) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/discover"
          className="hidden text-xs font-medium uppercase tracking-wider text-zinc-300 transition hover:text-matcha-200 sm:inline-flex"
        >
          {t("discover")}
        </Link>
        <Link
          href="/matches"
          className="hidden text-xs font-medium uppercase tracking-wider text-zinc-300 transition hover:text-matcha-200 sm:inline-flex"
        >
          {t("matches")}
        </Link>
        {me?.role === "admin" && (
          <Link
            href="/admin"
            className="hidden text-xs font-medium uppercase tracking-wider text-matcha-200 transition hover:text-matcha-100 sm:inline-flex"
          >
            {t("admin")}
          </Link>
        )}
        <Link
          href="/profile"
          className="inline-flex items-center rounded-full border border-matcha-300/30 bg-matcha-300/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-matcha-100 transition hover:border-matcha-300/60 hover:bg-matcha-300/20 hover:text-matcha-50"
        >
          {t("profile")}
        </Link>
      </div>
    );
  }
  return (
    <Link
      href="/auth/login"
      className="inline-flex items-center rounded-full border border-matcha-300/30 bg-matcha-300/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-matcha-100 transition hover:border-matcha-300/60 hover:bg-matcha-300/20 hover:text-matcha-50"
    >
      {t("login")}
    </Link>
  );
}
