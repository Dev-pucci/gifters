import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError, type AdminSite, type AdminTheme } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import { categories, products } from "../../data/catalog";
import { defaultImage } from "../../data/images";
import { applyColors, COLOR_KEYS, COLOR_LABELS, contrastWarnings, type ColorKey, type ThemeColors } from "../../lib/site";
import { useSite } from "../../state/site";

type Draft = Pick<AdminSite["site"], "mode" | "activeThemeId" | "defaultThemeId" | "themes">;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (mmdd: string) => `${MONTHS[Number(mmdd.slice(0, 2)) - 1]} ${Number(mmdd.slice(3))}`;
const inputCls = "h-10 w-full rounded-[4px] border border-line bg-white px-3 text-sm focus:border-olive focus:outline-none";

const pickSettings = (s: Draft) => JSON.stringify({ mode: s.mode, activeThemeId: s.activeThemeId, defaultThemeId: s.defaultThemeId, themes: s.themes });

/** Mirrors the server's rule (server/site.mjs currentTheme) so the editor can say what visitors will see. */
function liveThemeFor(d: Draft, now = new Date()): AdminTheme {
  const byId = (id: string) => d.themes.find((t) => t.id === id);
  if (d.mode === "manual") return byId(d.activeThemeId) ?? d.themes[0];
  const t = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const inRange = (sch: AdminTheme["schedule"]) => !!sch && (sch.start <= sch.end ? t >= sch.start && t <= sch.end : t >= sch.start || t <= sch.end);
  return d.themes.find((x) => inRange(x.schedule)) ?? byId(d.defaultThemeId) ?? d.themes[0];
}

/** Turns failed admin requests into a clear message; a sign-in link opens in a new tab so unsaved edits survive. */
function errorMessage(e: unknown): ReactNode {
  if (e instanceof ApiError && e.status === 401)
    return (
      <>
        You've been signed out, so this wasn't saved.{" "}
        <a href="/sign-in?next=/admin" target="_blank" rel="noreferrer" className="font-semibold underline">
          Sign in again in a new tab
        </a>
        , then come back here and press Save again — your changes are still here.
      </>
    );
  if (e instanceof ApiError && e.status === 403) return "This account isn't a store admin, so changes can't be saved.";
  return (e as Error).message;
}

function Notice({ tone, children }: { tone: "ok" | "error" | "warn"; children: ReactNode }) {
  const cls = tone === "ok" ? "bg-pine-soft text-pine-dark" : tone === "error" ? "bg-brand-soft text-brand-dark" : "bg-[#fdf6e7] text-[#7a5a12]";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-[4px] p-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}

function Swatches({ colors, size = 18 }: { colors: ThemeColors; size?: number }) {
  return (
    <span className="flex overflow-hidden rounded-full ring-1 ring-black/10" aria-hidden>
      {(Object.keys(COLOR_KEYS) as ColorKey[]).map((k) => (
        <span key={k} style={{ background: colors[k], width: size, height: size }} />
      ))}
    </span>
  );
}

// ================================================================ live preview (mini storefront)

function Preview({ theme }: { theme: AdminTheme }) {
  const c = theme.colors;
  return (
    <div className="overflow-hidden rounded-md border border-line text-[11px] shadow-sm" style={{ background: c.page }} aria-label={`Preview of ${theme.name}`}>
      <div className="py-1.5 text-center font-semibold uppercase tracking-[0.14em] text-white" style={{ background: c.primaryDark }}>
        {theme.announcement || "Free shipping on orders over $59"}
      </div>
      <div className="flex items-center justify-between border-b border-black/5 bg-white px-3 py-2">
        <span className="font-display text-sm uppercase tracking-[0.12em] text-ink">Heartfelt Gifts</span>
        <span className="flex gap-3 uppercase tracking-wider text-ink">
          <span style={{ color: c.primary }}>Home</span>
          <span>Shop</span>
          <span>Occasions</span>
        </span>
      </div>
      <div className="grid grid-cols-[1.2fr_1fr] gap-3 p-4" style={{ background: c.section }}>
        <div>
          <p className="font-semibold uppercase tracking-[0.18em]" style={{ color: c.primary }}>
            Thoughtful gifts
          </p>
          <p className="mt-1 font-display text-xl leading-tight text-ink">Make Every Moment</p>
          <p className="font-wordmark text-2xl leading-none" style={{ color: c.primary }}>
            Unforgettable
          </p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-[3px] px-2.5 py-1.5 font-semibold uppercase tracking-wider text-white" style={{ background: c.primary }}>
              Shop best sellers
            </span>
            <span className="rounded-[3px] border bg-white px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: c.primary, borderColor: c.primary }}>
              Find a gift
            </span>
          </div>
        </div>
        <div className="grid place-items-center rounded-[4px]" style={{ background: c.soft }}>
          <svg viewBox="0 0 80 60" className="h-16 w-20" aria-hidden>
            <rect x="22" y="22" width="36" height="28" fill="#c99f75" />
            <rect x="18" y="16" width="44" height="8" fill="#d9b48c" />
            <rect x="37" y="16" width="6" height="34" fill={c.accent} />
            <path d="M40 16c-8-10-20-6-14 0 4 3 10 1 14 0zm0 0c8-10 20-6 14 0-4 3-10 1-14 0z" fill={c.accent} />
            <ellipse cx="14" cy="44" rx="6" ry="3.5" fill={c.accent} transform="rotate(-35 14 44)" />
            <ellipse cx="66" cy="46" rx="6" ry="3.5" fill={c.accent} transform="rotate(35 66 46)" />
          </svg>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        {["Gifts for Her", "Gifts for Him", "Christmas"].map((n) => (
          <div key={n} className="rounded-[4px] bg-white p-2 text-center shadow-sm">
            <div className="mb-1.5 h-8 rounded-[3px]" style={{ background: c.soft }} />
            <p className="font-semibold uppercase tracking-wider text-ink">{n}</p>
            <p style={{ color: c.primary }}>Shop now →</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================================================================ seasons & colors tab

const blankSchedule = { start: "12-01", end: "12-31" };

function MonthDay({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [m, d] = [Number(value.slice(0, 2)), Number(value.slice(3))];
  const days = new Date(2024, m, 0).getDate(); // leap year so Feb 29 is allowed
  const set = (mm: number, dd: number) => onChange(`${String(mm).padStart(2, "0")}-${String(Math.min(dd, new Date(2024, mm, 0).getDate())).padStart(2, "0")}`);
  return (
    <fieldset className="flex gap-2">
      <legend className="sr-only">{label}</legend>
      <select aria-label={`${label} month`} value={m} onChange={(e) => set(Number(e.target.value), d)} className={inputCls}>
        {MONTHS.map((mn, i) => (
          <option key={mn} value={i + 1}>
            {mn}
          </option>
        ))}
      </select>
      <select aria-label={`${label} day`} value={d} onChange={(e) => set(m, Number(e.target.value))} className={`${inputCls} w-20`}>
        {Array.from({ length: days }, (_, i) => i + 1).map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>
    </fieldset>
  );
}

function SeasonsTab({ data, onSaved }: { data: AdminSite; onSaved: (d: AdminSite) => void }) {
  const { refresh, config } = useSite();
  const [draft, setDraft] = useState<Draft>(() => structuredClone(data.site));
  const [editId, setEditId] = useState(data.currentThemeId);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error" | "warn"; text: ReactNode } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const dirty = pickSettings(draft) !== pickSettings(data.site);

  const editing = draft.themes.find((t) => t.id === editId) ?? draft.themes[0];
  const warnings = contrastWarnings(editing.colors);
  const liveAfterSave = liveThemeFor(draft);
  const showNow = () => setDraft((d) => ({ ...d, mode: "manual", activeThemeId: editing.id }));

  // Preview colors across the whole page while toggled; always restore the live theme when leaving.
  useEffect(() => {
    if (previewing) applyColors(editing.colors);
    else if (config) applyColors(config.theme.colors);
  }, [previewing, editing.colors, config]);
  useEffect(() => () => {
    if (config) applyColors(config.theme.colors);
  }, [config]);

  const update = (patch: Partial<AdminTheme>) => setDraft((d) => ({ ...d, themes: d.themes.map((t) => (t.id === editing.id ? { ...t, ...patch } : t)) }));
  const setColor = (k: ColorKey, v: string) => update({ colors: { ...editing.colors, [k]: v.toLowerCase() } });

  const addSeason = () => {
    let n = 1;
    while (draft.themes.some((t) => t.id === `custom-${n}`)) n++;
    const t: AdminTheme = { ...structuredClone(editing), id: `custom-${n}`, name: `${editing.name} copy`, builtIn: false, images: {}, schedule: null };
    setDraft((d) => ({ ...d, themes: [...d.themes, t] }));
    setEditId(t.id);
  };
  const removeSeason = () => {
    if (draft.themes.length <= 1) return;
    const rest = draft.themes.filter((t) => t.id !== editing.id);
    setDraft((d) => ({
      ...d,
      themes: rest,
      activeThemeId: d.activeThemeId === editing.id ? rest[0].id : d.activeThemeId,
      defaultThemeId: d.defaultThemeId === editing.id ? rest[0].id : d.defaultThemeId,
    }));
    setEditId(rest[0].id);
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.saveSite(draft);
      onSaved(res);
      setDraft(structuredClone(res.site));
      setPreviewing(false);
      await refresh();
      const live = res.site.themes.find((t) => t.id === res.currentThemeId);
      if (live?.id === editing.id) setMsg({ tone: "ok", text: `Saved — “${live.name}” is live, so visitors see your changes now.` });
      else setMsg({ tone: "warn", text: `Saved “${editing.name}”, but it isn't showing yet: visitors see “${live?.name}”. Use “Show this season now” to switch.` });
    } catch (e) {
      setMsg({ tone: "error", text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!confirm(`Restore “${editing.name}” to its original colors, dates and message? Unsaved changes to other seasons will be kept.`)) return;
    try {
      const res = await api.restoreSeason(editing.id);
      const original = res.site.themes.find((t) => t.id === editing.id)!;
      setDraft((d) => ({ ...d, themes: d.themes.map((t) => (t.id === editing.id ? original : t)) }));
      onSaved(res);
      await refresh();
    } catch (e) {
      setMsg({ tone: "error", text: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-6">
      <section className="card p-6" aria-labelledby="which-h">
        <h2 id="which-h" className="font-display text-xl font-medium">
          Which season is showing?
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Live right now: <strong className="text-ink">{data.site.themes.find((t) => t.id === data.currentThemeId)?.name}</strong>
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className={`flex cursor-pointer gap-3 rounded-md border p-4 ${draft.mode === "auto" ? "border-olive bg-linen" : "border-line"}`}>
            <input type="radio" name="mode" checked={draft.mode === "auto"} onChange={() => setDraft((d) => ({ ...d, mode: "auto" }))} className="mt-1 accent-[var(--color-olive)]" />
            <span className="text-sm">
              <span className="block font-semibold">Automatic, by date</span>
              Each season turns on during its dates. Outside every date range, show
              <select
                aria-label="Default season"
                value={draft.defaultThemeId}
                onChange={(e) => setDraft((d) => ({ ...d, defaultThemeId: e.target.value }))}
                className="ml-1 mt-2 block h-9 rounded-[4px] border border-line bg-white px-2"
              >
                {draft.themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className={`flex cursor-pointer gap-3 rounded-md border p-4 ${draft.mode === "manual" ? "border-olive bg-linen" : "border-line"}`}>
            <input type="radio" name="mode" checked={draft.mode === "manual"} onChange={() => setDraft((d) => ({ ...d, mode: "manual" }))} className="mt-1 accent-[var(--color-olive)]" />
            <span className="text-sm">
              <span className="block font-semibold">Always show one season</span>
              Ignore dates and keep showing
              <select
                aria-label="Pinned season"
                value={draft.activeThemeId}
                onChange={(e) => setDraft((d) => ({ ...d, activeThemeId: e.target.value, mode: "manual" }))}
                className="ml-1 mt-2 block h-9 rounded-[4px] border border-line bg-white px-2"
              >
                {draft.themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section className="card h-fit p-4" aria-label="Seasons">
          <ul className="space-y-1">
            {draft.themes.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setEditId(t.id)}
                  aria-current={t.id === editing.id}
                  className={`w-full rounded-[4px] p-3 text-left transition ${t.id === editing.id ? "bg-linen ring-1 ring-olive" : "hover:bg-linen"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{t.name}</span>
                    {t.id === data.currentThemeId ? <span className="rounded-full bg-olive px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Live</span> : null}
                  </span>
                  <span className="mt-1.5 flex items-center justify-between gap-2 text-xs text-ink-soft">
                    {t.schedule ? `${fmtDate(t.schedule.start)} – ${fmtDate(t.schedule.end)}` : "No dates"}
                    <Swatches colors={t.colors} size={12} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={addSeason} className="btn-outline mt-3 w-full">
            + Add season
          </button>
        </section>

        <section className="card p-6" aria-labelledby="edit-h">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="edit-h" className="font-display text-xl font-medium">
              Edit “{editing.name}”
            </h2>
            <div className="flex gap-2">
              {editing.builtIn ? (
                <button type="button" onClick={restore} className="text-sm text-olive underline-offset-2 hover:underline">
                  Restore original
                </button>
              ) : (
                <button type="button" onClick={removeSeason} disabled={draft.themes.length <= 1} className="text-sm text-brand underline-offset-2 hover:underline disabled:opacity-40">
                  Delete season
                </button>
              )}
            </div>
          </div>

          {liveAfterSave.id !== editing.id ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[4px] bg-[#fdf6e7] p-3 text-sm text-[#7a5a12]">
              <span>
                <strong>“{editing.name}” isn't showing on the site.</strong> Visitors see “{liveAfterSave.name}”{draft.mode === "manual" ? " (pinned)" : " (by date)"}.
              </span>
              <button type="button" onClick={showNow} className="btn-primary px-4 py-2">
                Show this season now
              </button>
            </div>
          ) : (
            <p className="mt-4 rounded-[4px] bg-pine-soft p-3 text-sm text-pine-dark">
              <strong>“{editing.name}” {dirty ? "will be" : "is"} live</strong> — visitors see these colors{dirty ? " once you save" : ""}.
            </p>
          )}

          <div className="mt-5 grid gap-6 xl:grid-cols-2">
            <div className="space-y-5">
              <div>
                <label htmlFor="s-name" className="mb-1.5 block text-sm font-medium">
                  Season name
                </label>
                <input id="s-name" value={editing.name} maxLength={40} onChange={(e) => update({ name: e.target.value })} className={inputCls} />
              </div>

              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">Dates (every year)</legend>
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!editing.schedule} onChange={(e) => update({ schedule: e.target.checked ? blankSchedule : null })} className="accent-[var(--color-olive)]" />
                  Turn on automatically during these dates
                </label>
                {editing.schedule ? (
                  <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
                    <span className="text-sm text-ink-soft">From</span>
                    <MonthDay label="Start" value={editing.schedule.start} onChange={(v) => update({ schedule: { ...editing.schedule!, start: v } })} />
                    <span className="text-sm text-ink-soft">To</span>
                    <MonthDay label="End" value={editing.schedule.end} onChange={(v) => update({ schedule: { ...editing.schedule!, end: v } })} />
                  </div>
                ) : (
                  <p className="text-xs text-ink-soft">Without dates, this season only shows when you pin it or make it the default.</p>
                )}
              </fieldset>

              <div>
                <label htmlFor="s-ann" className="mb-1.5 flex justify-between text-sm font-medium">
                  <span>Announcement bar message</span>
                  <span className="font-normal text-ink-soft">{120 - editing.announcement.length} left</span>
                </label>
                <input id="s-ann" value={editing.announcement} maxLength={120} placeholder="Free shipping on orders over $59" onChange={(e) => update({ announcement: e.target.value })} className={inputCls} />
                <p className="mt-1 text-xs text-ink-soft">Leave empty to show the free-shipping message.</p>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium">Colors</legend>
                <div className="space-y-2.5">
                  {(Object.keys(COLOR_KEYS) as ColorKey[]).map((k) => (
                    <div key={k} className="flex items-center gap-3">
                      <input type="color" aria-label={`${COLOR_LABELS[k].label} color`} value={editing.colors[k]} onChange={(e) => setColor(k, e.target.value)} className="h-10 w-12 cursor-pointer rounded-[4px] border border-line bg-white p-1" />
                      <input
                        aria-label={`${COLOR_LABELS[k].label} hex value`}
                        value={editing.colors[k]}
                        maxLength={7}
                        onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && setColor(k, e.target.value)}
                        className={`${inputCls} w-24 font-mono uppercase`}
                      />
                      <span className="min-w-0 text-sm">
                        <span className="block font-medium">{COLOR_LABELS[k].label}</span>
                        <span className="block text-xs text-ink-soft">{COLOR_LABELS[k].hint}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Preview</p>
              <Preview theme={editing} />
              {warnings.length ? (
                <Notice tone="warn">
                  <ul className="list-disc space-y-1 pl-4">
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </Notice>
              ) : (
                <p className="text-xs text-pine-dark">✓ All text in this palette meets accessibility contrast guidelines.</p>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={previewing} onChange={(e) => setPreviewing(e.target.checked)} className="accent-[var(--color-olive)]" />
                Preview these colors on this whole page (only you see this)
              </label>
            </div>
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-md sm:border">
        {msg ? <div className="mr-auto">{<Notice tone={msg.tone}>{msg.text}</Notice>}</div> : dirty ? <p className="mr-auto text-sm text-ink-soft">You have unsaved changes.</p> : null}
        <button type="button" disabled={!dirty || busy} onClick={() => setDraft(structuredClone(data.site))} className="btn-outline">
          Discard
        </button>
        <button type="button" disabled={!dirty || busy} onClick={save} className="btn-primary">
          {busy ? "Saving…" : "Save & publish"}
        </button>
      </div>
    </div>
  );
}

// ================================================================ images tab

interface Slot {
  key: string;
  label: string;
  aspect: "wide" | "square";
  size: string;
}

const SLOT_GROUPS: { title: string; slots: Slot[] }[] = [
  {
    title: "Homepage",
    slots: [
      { key: "hero/christmas", label: "Hero banner (top of homepage)", aspect: "wide", size: "1600 × 1000 px, subject on the right" },
      { key: "banners/personal-touch", label: "“Add a Personal Touch” banner", aspect: "wide", size: "1600 × 900 px" },
      { key: "banners/newsletter", label: "Newsletter banner", aspect: "wide", size: "1600 × 900 px" },
    ],
  },
  { title: "Categories", slots: categories.map((c) => ({ key: `categories/${c.slug}`, label: c.name, aspect: "square" as const, size: "1200 × 1200 px" })) },
  { title: "Products", slots: products.map((p) => ({ key: `products/${p.slug}`, label: p.name, aspect: "square" as const, size: "1200 × 1200 px" })) },
];

function ImageSlot({ slot, data, scope, onSaved }: { slot: Slot; data: AdminSite; scope: string | null; onSaved: (d: AdminSite) => void }) {
  const { refresh } = useSite();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = scope ? data.site.themes.find((t) => t.id === scope) : null;
  const seasonImg = theme?.images[slot.key];
  const globalImg = data.site.images[slot.key];
  const shown = seasonImg ?? globalImg ?? defaultImage(slot.key);
  const own = scope ? seasonImg : globalImg; // override at the scope being edited
  const source = seasonImg ? `Custom for ${theme!.name}` : globalImg ? "Custom (all seasons)" : "Original";

  const run = async (fn: () => Promise<AdminSite>) => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await fn());
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? "You've been signed out. Sign in again (in a new tab), then retry." : (e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <li className="card flex flex-col overflow-hidden">
      <div className={`relative bg-linen ${slot.aspect === "wide" ? "aspect-[16/9]" : "aspect-square"}`}>
        {shown ? <img src={shown} alt={`Current image: ${slot.label}`} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center px-4 text-center text-xs text-ink-soft">Built-in illustration — upload a photo to replace it</span>}
        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${own ? "bg-olive text-white" : "bg-white/90 text-ink"}`}>{source}</span>
        {busy ? <span className="absolute inset-0 grid place-items-center bg-white/70 text-sm font-medium">Uploading…</span> : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-sm font-medium leading-snug">{slot.label}</p>
        <p className="text-xs text-ink-soft">{slot.size} · JPG, PNG or WebP up to 10 MB</p>
        {error ? (
          <p role="alert" className="text-xs text-brand">
            {error}
          </p>
        ) : null}
        <div className="mt-auto flex gap-2 pt-1">
          <label className={`btn-outline flex-1 cursor-pointer px-3 py-2 ${busy ? "pointer-events-none opacity-60" : ""}`}>
            {own ? "Replace" : "Upload"}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label={`Upload image for ${slot.label}`}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 10 * 1024 * 1024) return setError("That file is larger than 10 MB.");
                run(() => api.uploadSiteImage(slot.key, scope, f));
              }}
            />
          </label>
          {own ? (
            <button type="button" disabled={busy} onClick={() => run(() => api.resetSiteImage(slot.key, scope))} className="btn-outline px-3 py-2" aria-label={`Reset ${slot.label} to ${scope ? "the all-seasons image" : "the original"}`}>
              Reset
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ImagesTab({ data, onSaved }: { data: AdminSite; onSaved: (d: AdminSite) => void }) {
  const [scope, setScope] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const theme = scope ? data.site.themes.find((t) => t.id === scope) : null;
  const groups = useMemo(
    () => SLOT_GROUPS.map((g) => ({ ...g, slots: g.slots.filter((s) => s.label.toLowerCase().includes(filter.trim().toLowerCase())) })).filter((g) => g.slots.length),
    [filter],
  );
  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-end gap-4 p-5">
        <div className="min-w-56 flex-1">
          <label htmlFor="img-scope" className="mb-1.5 block text-sm font-medium">
            Editing images for
          </label>
          <select id="img-scope" value={scope ?? ""} onChange={(e) => setScope(e.target.value || null)} className={inputCls}>
            <option value="">All seasons</option>
            {data.site.themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} only
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-48 flex-1">
          <label htmlFor="img-filter" className="mb-1.5 block text-sm font-medium">
            Find an image
          </label>
          <input id="img-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="e.g. stocking" className={inputCls} />
        </div>
        <p className="w-full text-xs text-ink-soft">
          {theme ? `Images you upload here only show while “${theme.name}” is live, and replace the all-seasons image for that time.` : "Images you upload here show in every season, unless a season has its own."} Changes go live immediately.
        </p>
      </section>
      {groups.map((g) => (
        <section key={g.title} aria-labelledby={`g-${g.title}`}>
          <h2 id={`g-${g.title}`} className="mb-3 font-display text-xl font-medium">
            {g.title}
          </h2>
          <ul className={`grid gap-4 ${g.title === "Homepage" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}`}>
            {g.slots.map((s) => (
              <ImageSlot key={s.key + (scope ?? "")} slot={s} data={data} scope={scope} onSaved={onSaved} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ================================================================ page

export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "images" ? "images" : "seasons";
  const [data, setData] = useState<AdminSite | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.adminSite().then(setData, (e) => setError((e as Error).message));
  }, []);

  return (
    <>
      <PageHeader eyebrow="Store admin" title="Seasons & appearance" intro="Change the site's colors and pictures for each season. Everything goes live as soon as you save." crumbs={[{ label: "Admin" }]} />
      <div className="container-page py-8">
        <div role="tablist" aria-label="Admin sections" className="mb-6 inline-flex rounded-md bg-white p-1 shadow-[0_1px_3px_rgba(31,42,55,0.08)]">
          {(
            [
              ["seasons", "Seasons & colors"],
              ["images", "Images"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setParams(id === "seasons" ? {} : { tab: id }, { replace: true })}
              className={`rounded-[4px] px-5 py-2 text-sm font-medium ${tab === id ? "bg-olive text-white" : "text-ink hover:text-olive"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {error ? <Notice tone="error">{error}</Notice> : null}
        {!data && !error ? <p className="text-ink-soft">Loading…</p> : null}
        {data ? tab === "seasons" ? <SeasonsTab data={data} onSaved={setData} /> : <ImagesTab data={data} onSaved={setData} /> : null}
      </div>
    </>
  );
}
