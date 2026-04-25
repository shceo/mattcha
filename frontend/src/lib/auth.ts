import { api } from "./api";

const ACCESS_KEY = "mattcha:access";
const REFRESH_KEY = "mattcha:refresh";

export type Tokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type Me = {
  id: number;
  email: string | null;
  phone: string | null;
  role: "user" | "admin";
  is_banned: boolean;
};

export function saveTokens(t: Tokens): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, t.access_token);
  localStorage.setItem(REFRESH_KEY, t.refresh_token);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function hasToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(ACCESS_KEY);
}

export async function registerUser(payload: {
  email?: string;
  phone?: string;
  password: string;
}): Promise<Tokens> {
  const tokens = await api<Tokens>("/auth/register", { method: "POST", json: payload });
  saveTokens(tokens);
  return tokens;
}

export async function loginUser(payload: {
  identifier: string;
  password: string;
}): Promise<Tokens> {
  const tokens = await api<Tokens>("/auth/login", { method: "POST", json: payload });
  saveTokens(tokens);
  return tokens;
}

export async function fetchMe(): Promise<Me> {
  return api<Me>("/auth/me");
}
