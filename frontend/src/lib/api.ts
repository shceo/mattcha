const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : "request failed");
    this.status = status;
    this.detail = detail;
  }
}

function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("mattcha:access");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type RequestOpts = Omit<RequestInit, "body"> & {
  json?: unknown;
  body?: BodyInit;
};

export async function api<T = unknown>(path: string, opts: RequestOpts = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  Object.entries(authHeader()).forEach(([k, v]) => headers.set(k, v));
  let body = opts.body;
  if (opts.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.json);
  }
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers, body });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const detail =
      (data && typeof data === "object" && "detail" in (data as Record<string, unknown>)
        ? (data as Record<string, unknown>).detail
        : data) ?? res.statusText;
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

export const apiBaseUrl = API_URL;
