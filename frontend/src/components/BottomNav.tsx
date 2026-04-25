"use client";

import { Compass, MessageCircle, UserCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link, usePathname } from "@/i18n/routing";
import { hasToken } from "@/lib/auth";
import { useUnread } from "@/lib/useUnread";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

export function BottomNav() {
  const t = useTranslations("nav");
  const path = usePathname();
  const unread = useUnread();
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthed(hasToken());
    const onStorage = () => setAuthed(hasToken());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!mounted || !authed) return null;

  const items: Item[] = [
    { href: "/discover", label: t("home"), Icon: Compass },
    { href: "/matches", label: t("chats"), Icon: MessageCircle, badge: unread },
    { href: "/profile", label: t("profile"), Icon: UserCircle2 },
  ];

  return (
    <nav
      aria-label="primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-950/85 backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-3 py-2">
        {items.map((it) => {
          const active = path === it.href || path.startsWith(`${it.href}/`);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition ${
                  active ? "text-matcha-200" : "text-zinc-400"
                }`}
              >
                <span className="relative">
                  <it.Icon className="h-5 w-5" />
                  {it.badge != null && it.badge > 0 && (
                    <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-matcha-300 px-1 text-[10px] font-semibold text-ink-950 shadow-glow">
                      {it.badge > 99 ? "99+" : it.badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] uppercase tracking-wider">{it.label}</span>
                {active && (
                  <span
                    aria-hidden
                    className="absolute -top-[1px] left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-matcha-300"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
