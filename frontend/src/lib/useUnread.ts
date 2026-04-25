"use client";

import { useEffect, useState } from "react";

import { api } from "./api";
import { hasToken } from "./auth";

type MatchListItem = { unread_count: number };

const POLL_MS = 15_000;

let cached = 0;
const subs = new Set<(n: number) => void>();

function broadcast(n: number) {
  cached = n;
  subs.forEach((s) => s(n));
}

let pollerHandle: number | null = null;

async function tick() {
  if (!hasToken()) {
    broadcast(0);
    return;
  }
  try {
    const list = await api<MatchListItem[]>("/matches");
    const total = list.reduce((acc, m) => acc + (m.unread_count || 0), 0);
    broadcast(total);
  } catch {
    /* silent */
  }
}

function ensurePoller() {
  if (pollerHandle != null) return;
  void tick();
  pollerHandle = window.setInterval(() => void tick(), POLL_MS);
}

export function useUnread(): number {
  const [n, setN] = useState<number>(cached);

  useEffect(() => {
    subs.add(setN);
    ensurePoller();
    return () => {
      subs.delete(setN);
    };
  }, []);

  return n;
}

export function bumpUnread() {
  void tick();
}
