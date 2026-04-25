"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { subscribeToasts, type ToastItem } from "@/lib/toast";

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end"
      aria-live="polite"
      aria-atomic="true"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto inline-flex max-w-[92vw] items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium shadow-glow backdrop-blur-xl transition sm:max-w-md ${
            t.kind === "success"
              ? "border-matcha-300/40 bg-matcha-300/15 text-matcha-50"
              : "border-red-400/40 bg-red-400/10 text-red-100"
          }`}
        >
          {t.kind === "success" ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-matcha-200" aria-hidden />
          ) : (
            <XCircle className="h-4 w-4 flex-shrink-0 text-red-300" aria-hidden />
          )}
          <span className="truncate">{t.text}</span>
        </div>
      ))}
    </div>
  );
}
