import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";

import { AuthNav } from "./AuthNav";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const t = useTranslations("header");
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group inline-flex items-baseline gap-1.5">
          <span className="font-display text-xl font-medium tracking-tight text-zinc-100">
            {t("brand")}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-matcha-300 shadow-[0_0_12px_rgba(168,199,115,0.8)] transition group-hover:bg-matcha-200" />
        </Link>
        <nav className="flex items-center gap-3">
          <LanguageSwitcher />
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
