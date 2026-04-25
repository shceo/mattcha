"use client";

import {
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldOff,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Header } from "@/components/Header";
import { useRouter } from "@/i18n/routing";
import { ApiError, api, apiBaseUrl } from "@/lib/api";
import { clearTokens, fetchMe, hasToken, type Me } from "@/lib/auth";
import { toast } from "@/lib/toast";

import { ContentTab } from "./ContentTab";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink-800/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-matcha-300/50 focus:bg-ink-800";

type AdminUser = {
  id: number;
  email: string | null;
  phone: string | null;
  role: "user" | "admin";
  is_banned: boolean;
  created_at: string;
  has_profile: boolean;
  full_name: string | null;
  gender: "male" | "female" | null;
  age: number | null;
  primary_photo_url: string | null;
};

type AdminUsersPage = { items: AdminUser[]; total: number };

type Promo = {
  id: number;
  code: string;
  description: string | null;
  discount_text: string;
  is_active: boolean;
};

type Venue = {
  id: number;
  name: string;
  description: string | null;
  address: string;
  lat: number;
  lng: number;
  image_url: string | null;
  is_active: boolean;
  promos: Promo[];
  distance_km: number | null;
};

type Tab = "users" | "venues" | "content";

export default function AdminPage() {
  const t = useTranslations("admin");
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("users");

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/auth/login");
      return;
    }
    fetchMe()
      .then(setMe)
      .catch(() => {
        clearTokens();
        router.replace("/auth/login");
      })
      .finally(() => setBootLoading(false));
  }, [router]);

  if (bootLoading) {
    return (
      <>
        <Header />
        <main className="mx-auto flex max-w-4xl items-center justify-center px-6 py-24 text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        </main>
      </>
    );
  }

  if (!me || me.role !== "admin") {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-md px-6 py-20 text-center">
          <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-8">
            <ShieldOff className="mx-auto h-8 w-8 text-red-300" />
            <p className="mt-4 text-sm text-red-200">{t("forbidden")}</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-matcha-radial" aria-hidden />
        <section className="mx-auto max-w-5xl px-6 pb-24 pt-12">
          <h1 className="font-display text-4xl font-light tracking-tight text-zinc-50 sm:text-5xl">
            {t("title")}
          </h1>

          <div className="mt-8 inline-flex rounded-full border border-white/10 bg-ink-800/60 p-1 text-xs">
            {(["users", "venues", "content"] as Tab[]).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-full px-4 py-1.5 uppercase tracking-wider transition ${
                  tab === key
                    ? "bg-matcha-300 text-ink-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t(`tabs.${key}` as "tabs.users" | "tabs.venues" | "tabs.content")}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {tab === "users" ? (
              <UsersTab adminId={me.id} />
            ) : tab === "venues" ? (
              <VenuesTab />
            ) : (
              <ContentTab />
            )}
          </div>
        </section>
      </main>
    </>
  );
}

// --- Users ----------------------------------------------------------------

function UsersTab({ adminId }: { adminId: number }) {
  const t = useTranslations("admin.users");
  const tToast = useTranslations("toast");
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load(nextOffset: number, replace: boolean, query: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "30",
        offset: String(nextOffset),
      });
      if (query) params.set("q", query);
      const data = await api<AdminUsersPage>(`/admin/users?${params.toString()}`);
      setTotal(data.total);
      setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
      setOffset(nextOffset + data.items.length);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(0, true, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    void load(0, true, q.trim());
  }

  async function ban(id: number) {
    try {
      const u = await api<AdminUser>(`/admin/users/${id}/ban`, { method: "POST" });
      setItems((prev) => prev.map((x) => (x.id === id ? u : x)));
      toast.success(tToast("userBanned"));
    } catch {
      toast.error(tToast("saveFailed"));
    }
  }
  async function unban(id: number) {
    try {
      const u = await api<AdminUser>(`/admin/users/${id}/unban`, { method: "POST" });
      setItems((prev) => prev.map((x) => (x.id === id ? u : x)));
      toast.success(tToast("userUnbanned"));
    } catch {
      toast.error(tToast("saveFailed"));
    }
  }
  async function remove(id: number) {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await api(`/admin/users/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.id !== id));
      setTotal((n) => Math.max(0, n - 1));
      toast.success(tToast("userDeleted"));
    } catch {
      toast.error(tToast("saveFailed"));
    }
  }

  return (
    <>
      <form onSubmit={onSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className={`${inputCls} pl-9`}
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center rounded-full bg-matcha-300 px-4 py-2 text-xs font-medium uppercase tracking-wider text-ink-950 hover:bg-matcha-200"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      </form>

      {items.length === 0 && !loading ? (
        <p className="mt-10 rounded-2xl border border-white/10 bg-ink-900/40 p-8 text-center text-sm text-zinc-400">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/5 bg-ink-900/40 p-4"
            >
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-white/10 bg-ink-800">
                {u.primary_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${apiBaseUrl}${u.primary_photo_url}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-700">
                    <UserCircle2 className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-base text-zinc-50">
                    {u.full_name ?? `#${u.id}`}
                  </span>
                  {u.age != null && <span className="text-zinc-500">{u.age}</span>}
                  {u.role === "admin" && (
                    <span className="rounded-full border border-matcha-300/40 bg-matcha-300/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-matcha-200">
                      admin
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                      u.is_banned
                        ? "border-red-400/30 bg-red-400/5 text-red-300"
                        : "border-white/10 bg-white/5 text-zinc-400"
                    }`}
                  >
                    {u.is_banned ? t("banned") : t("active")}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {u.email ?? u.phone ?? "—"}
                  {!u.has_profile && ` · ${t("noProfile")}`}
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                {u.id !== adminId && (
                  <>
                    {u.is_banned ? (
                      <button
                        onClick={() => unban(u.id)}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-xs uppercase tracking-wider text-zinc-300 hover:border-matcha-300/40 hover:text-matcha-200"
                      >
                        {t("unban")}
                      </button>
                    ) : (
                      <button
                        onClick={() => ban(u.id)}
                        className="rounded-full border border-red-400/30 bg-red-400/5 px-3 py-1.5 text-xs uppercase tracking-wider text-red-200 hover:bg-red-400/10"
                      >
                        {t("ban")}
                      </button>
                    )}
                    <button
                      onClick={() => remove(u.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/5 px-3 py-1.5 text-xs uppercase tracking-wider text-red-200 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-3 w-3" />
                      {t("delete")}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {offset < total && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => void load(offset, false, q.trim())}
            disabled={loading}
            className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-wider text-zinc-300 hover:border-matcha-300/40 hover:text-matcha-200 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("loadMore")}
          </button>
        </div>
      )}
    </>
  );
}

// --- Venues ---------------------------------------------------------------

type VenueDraft = {
  name: string;
  description: string;
  address: string;
  lat: string;
  lng: string;
  image_url: string;
  is_active: boolean;
};

const emptyDraft: VenueDraft = {
  name: "",
  description: "",
  address: "",
  lat: "",
  lng: "",
  image_url: "",
  is_active: true,
};

function VenuesTab() {
  const t = useTranslations("admin.venues");
  const tToast = useTranslations("toast");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api<Venue[]>("/admin/venues");
      setVenues(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createVenue(draft: VenueDraft) {
    try {
      const v = await api<Venue>("/admin/venues", {
        method: "POST",
        json: serializeDraft(draft),
      });
      setVenues((prev) => [{ ...v, promos: [], distance_km: null }, ...prev]);
      setCreating(false);
      toast.success(tToast("venueSaved"));
    } catch {
      toast.error(tToast("saveFailed"));
    }
  }

  async function updateVenue(id: number, draft: VenueDraft) {
    try {
      const v = await api<Venue>(`/admin/venues/${id}`, {
        method: "PATCH",
        json: serializeDraft(draft),
      });
      setVenues((prev) =>
        prev.map((x) => (x.id === id ? { ...x, ...v } : x)),
      );
      setEditingId(null);
      toast.success(tToast("venueSaved"));
    } catch {
      toast.error(tToast("saveFailed"));
    }
  }

  async function deleteVenue(id: number) {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await api(`/admin/venues/${id}`, { method: "DELETE" });
      setVenues((prev) => prev.filter((x) => x.id !== id));
      toast.success(tToast("venueDeleted"));
    } catch {
      toast.error(tToast("saveFailed"));
    }
  }

  if (loading) {
    return (
      <p className="flex items-center justify-center py-12 text-zinc-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      </p>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        {creating ? null : (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-full bg-matcha-300 px-4 py-2 text-xs font-medium uppercase tracking-wider text-ink-950 shadow-glow hover:bg-matcha-200"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("createNew")}
          </button>
        )}
      </div>

      {creating && (
        <VenueForm
          initial={emptyDraft}
          onSave={createVenue}
          onCancel={() => setCreating(false)}
        />
      )}

      {venues.length === 0 && !creating ? (
        <p className="mt-8 rounded-2xl border border-white/10 bg-ink-900/40 p-8 text-center text-sm text-zinc-400">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {venues.map((v) => (
            <li
              key={v.id}
              className="rounded-2xl border border-white/5 bg-ink-900/40 p-5"
            >
              {editingId === v.id ? (
                <VenueForm
                  initial={venueToDraft(v)}
                  onSave={(d) => updateVenue(v.id, d)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <VenueRow
                  venue={v}
                  onEdit={() => setEditingId(v.id)}
                  onDelete={() => deleteVenue(v.id)}
                  onPromosChange={(promos) =>
                    setVenues((prev) =>
                      prev.map((x) => (x.id === v.id ? { ...x, promos } : x)),
                    )
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function VenueRow({
  venue,
  onEdit,
  onDelete,
  onPromosChange,
}: {
  venue: Venue;
  onEdit: () => void;
  onDelete: () => void;
  onPromosChange: (promos: Promo[]) => void;
}) {
  const t = useTranslations("admin.venues");
  return (
    <>
      <div className="flex flex-wrap items-start gap-4">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-ink-800">
          {venue.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={venue.image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-700">
              <MapPin className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="font-display text-lg text-zinc-50">{venue.name}</h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                venue.is_active
                  ? "border-matcha-300/40 bg-matcha-300/10 text-matcha-200"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              {venue.is_active ? t("isActive") : "—"}
            </span>
          </div>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <MapPin className="h-3 w-3" />
            {venue.address}
            <span className="text-zinc-600">
              · {venue.lat.toFixed(4)}, {venue.lng.toFixed(4)}
            </span>
          </p>
          {venue.description && (
            <p className="mt-2 line-clamp-2 text-sm text-zinc-300">
              {venue.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs uppercase tracking-wider text-zinc-300 hover:border-matcha-300/40 hover:text-matcha-200"
          >
            <Pencil className="h-3 w-3" />
            {t("edit")}
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/5 px-3 py-1.5 text-xs uppercase tracking-wider text-red-200 hover:bg-red-400/10"
          >
            <Trash2 className="h-3 w-3" />
            {t("delete")}
          </button>
        </div>
      </div>

      <PromosSection venue={venue} onChange={onPromosChange} />
    </>
  );
}

function VenueForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: VenueDraft;
  onSave: (d: VenueDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations("admin.venues");
  const [draft, setDraft] = useState<VenueDraft>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof VenueDraft>(k: K, v: VenueDraft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function useGeo() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      set("lat", pos.coords.latitude.toFixed(6));
      set("lng", pos.coords.longitude.toFixed(6));
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSave(draft);
    } catch (err) {
      if (err instanceof ApiError && typeof err.detail === "string") setError(err.detail);
      else setError("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-white/5 bg-ink-800/40 p-4 sm:grid-cols-2">
      <Field label={t("name")}>
        <input value={draft.name} onChange={(e) => set("name", e.target.value)} required className={inputCls} />
      </Field>
      <Field label={t("address")}>
        <input value={draft.address} onChange={(e) => set("address", e.target.value)} required className={inputCls} />
      </Field>
      <Field label={t("description")} full>
        <textarea
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </Field>
      <Field label={t("lat")}>
        <input
          type="number"
          step="any"
          value={draft.lat}
          onChange={(e) => set("lat", e.target.value)}
          required
          className={inputCls}
        />
      </Field>
      <Field label={t("lng")}>
        <input
          type="number"
          step="any"
          value={draft.lng}
          onChange={(e) => set("lng", e.target.value)}
          required
          className={inputCls}
        />
      </Field>
      <button
        type="button"
        onClick={useGeo}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-wider text-zinc-300 hover:border-matcha-300/40 hover:text-matcha-200 sm:col-span-2 sm:w-fit"
      >
        <MapPin className="h-3.5 w-3.5" />
        geo
      </button>
      <Field label={t("imageUrl")} full>
        <input
          value={draft.image_url}
          onChange={(e) => set("image_url", e.target.value)}
          placeholder="https://..."
          className={inputCls}
        />
      </Field>
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-300 sm:col-span-2">
        <input
          type="checkbox"
          checked={draft.is_active}
          onChange={(e) => set("is_active", e.target.checked)}
          className="h-3.5 w-3.5 accent-matcha-300"
        />
        {t("isActive")}
      </label>

      {error && (
        <p className="rounded-xl border border-red-400/30 bg-red-400/5 px-3 py-2 text-xs text-red-300 sm:col-span-2">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 sm:col-span-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wider text-zinc-300 hover:border-white/20"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-matcha-300 px-4 py-2 text-xs font-medium uppercase tracking-wider text-ink-950 shadow-glow hover:bg-matcha-200 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("save")}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

// --- Promos ---------------------------------------------------------------

function PromosSection({
  venue,
  onChange,
}: {
  venue: Venue;
  onChange: (promos: Promo[]) => void;
}) {
  const t = useTranslations("admin.promos");
  const tToast = useTranslations("toast");
  const [adding, setAdding] = useState(false);

  async function add(draft: { code: string; description: string; discount_text: string; is_active: boolean }) {
    try {
      const created = await api<Promo>(`/admin/venues/${venue.id}/promos`, {
        method: "POST",
        json: draft,
      });
      onChange([...venue.promos, created]);
      setAdding(false);
      toast.success(tToast("promoSaved"));
    } catch {
      toast.error(tToast("saveFailed"));
    }
  }

  async function update(id: number, draft: Partial<Promo>) {
    try {
      const updated = await api<Promo>(`/admin/promos/${id}`, {
        method: "PATCH",
        json: draft,
      });
      onChange(venue.promos.map((p) => (p.id === id ? updated : p)));
      toast.success(tToast("promoSaved"));
    } catch {
      toast.error(tToast("saveFailed"));
    }
  }

  async function remove(id: number) {
    try {
      await api(`/admin/promos/${id}`, { method: "DELETE" });
      onChange(venue.promos.filter((p) => p.id !== id));
      toast.success(tToast("promoDeleted"));
    } catch {
      toast.error(tToast("saveFailed"));
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-white/5 bg-ink-800/40 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs uppercase tracking-wider text-zinc-400">{t("title")}</h4>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-matcha-200 hover:text-matcha-100"
          >
            <Plus className="h-3 w-3" />
            {t("add")}
          </button>
        )}
      </div>

      {adding && (
        <PromoEditor
          initial={{ code: "", description: "", discount_text: "", is_active: true }}
          onSave={async (d) => {
            await add(d);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {venue.promos.length === 0 && !adding ? (
        <p className="mt-3 text-xs text-zinc-500">{t("empty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {venue.promos.map((p) => (
            <li key={p.id}>
              <PromoRow
                promo={p}
                onUpdate={(d) => update(p.id, d)}
                onDelete={() => remove(p.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PromoRow({
  promo,
  onUpdate,
  onDelete,
}: {
  promo: Promo;
  onUpdate: (d: Partial<Promo>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const t = useTranslations("admin.promos");
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <PromoEditor
        initial={{
          code: promo.code,
          description: promo.description ?? "",
          discount_text: promo.discount_text,
          is_active: promo.is_active,
        }}
        onSave={async (d) => {
          await onUpdate(d);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-ink-900/60 px-3 py-2">
      <span className="font-mono text-xs text-matcha-100">{promo.code}</span>
      <span className="rounded-full border border-matcha-300/30 bg-matcha-300/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-matcha-200">
        {promo.discount_text}
      </span>
      {!promo.is_active && (
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">off</span>
      )}
      {promo.description && (
        <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">
          {promo.description}
        </span>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-300 hover:border-matcha-300/40 hover:text-matcha-200"
        >
          <Pencil className="h-2.5 w-2.5" />
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-red-200 hover:bg-red-400/10"
        >
          <X className="h-2.5 w-2.5" />
          {t("delete")}
        </button>
      </div>
    </div>
  );
}

function PromoEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: { code: string; description: string; discount_text: string; is_active: boolean };
  onSave: (d: { code: string; description: string; discount_text: string; is_active: boolean }) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations("admin.promos");
  const [draft, setDraft] = useState(initial);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(draft);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-ink-900/60 p-3 sm:grid-cols-3"
    >
      <input
        value={draft.code}
        onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
        placeholder={t("code")}
        required
        className={`${inputCls} font-mono`}
      />
      <input
        value={draft.discount_text}
        onChange={(e) => setDraft({ ...draft, discount_text: e.target.value })}
        placeholder={t("discount")}
        required
        className={inputCls}
      />
      <input
        value={draft.description}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        placeholder={t("description")}
        className={inputCls}
      />
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={draft.is_active}
          onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
          className="h-3.5 w-3.5 accent-matcha-300"
        />
        {t("isActive")}
      </label>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs uppercase tracking-wider text-zinc-300 hover:border-white/20"
        >
          ✕
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-matcha-300 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-ink-950 hover:bg-matcha-200 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
          {t("save")}
        </button>
      </div>
    </form>
  );
}

// --- helpers --------------------------------------------------------------

function venueToDraft(v: Venue): VenueDraft {
  return {
    name: v.name,
    description: v.description ?? "",
    address: v.address,
    lat: String(v.lat),
    lng: String(v.lng),
    image_url: v.image_url ?? "",
    is_active: v.is_active,
  };
}

function serializeDraft(d: VenueDraft) {
  return {
    name: d.name,
    description: d.description || null,
    address: d.address,
    lat: Number(d.lat),
    lng: Number(d.lng),
    image_url: d.image_url || null,
    is_active: d.is_active,
  };
}
