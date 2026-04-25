"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { routing, usePathname, useRouter } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  function pick(l: (typeof routing.locales)[number]) {
    setOpen(false);
    if (l === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: l });
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("label")}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-800/60 px-3 py-1.5 text-xs uppercase tracking-wide text-zinc-300 transition hover:border-matcha-300/40 hover:text-matcha-200"
      >
        <Globe className="h-3.5 w-3.5 opacity-70" aria-hidden />
        {locale}
        <ChevronDown
          className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 p-1 shadow-glow backdrop-blur"
        >
          {routing.locales.map((l) => {
            const active = l === locale;
            return (
              <li key={l} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => pick(l)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition ${
                    active
                      ? "bg-matcha-300/10 text-matcha-100"
                      : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
                  }`}
                >
                  <span>{t(l)}</span>
                  {active && <Check className="h-3 w-3" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
