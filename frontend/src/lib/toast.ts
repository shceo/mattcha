"use client";

export type ToastKind = "success" | "error";
export type ToastItem = { id: number; kind: ToastKind; text: string };

const subs = new Set<(items: ToastItem[]) => void>();
let items: ToastItem[] = [];
let nextId = 1;

function emit() {
  subs.forEach((s) => s(items));
}

function push(kind: ToastKind, text: string, durationMs = 3000) {
  const item: ToastItem = { id: nextId++, kind, text };
  items = [...items, item];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      items = items.filter((x) => x.id !== item.id);
      emit();
    }, durationMs);
  }
}

export const toast = {
  success: (text: string) => push("success", text),
  error: (text: string) => push("error", text, 4500),
};

export function subscribeToasts(fn: (items: ToastItem[]) => void): () => void {
  subs.add(fn);
  fn(items);
  return () => {
    subs.delete(fn);
  };
}
