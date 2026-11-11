// Site appearance managed from the admin area: seasonal themes (colors, date ranges, announcement)
// and image overrides (global, or per season). Stored in server/data/site.json.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Theme color keys → the CSS custom properties the site's styles read. */
export const COLOR_KEYS = {
  primary: "--color-olive",
  primaryDark: "--color-olive-dark",
  accent: "--color-sage",
  soft: "--color-sage-soft",
  section: "--color-linen",
  page: "--color-cream",
};

const preset = (id, name, colors, schedule, announcement = "") => ({ id, name, colors, schedule, announcement, images: {}, builtIn: true });

export const PRESETS = [
  preset("everyday", "Everyday Sage", { primary: "#4a5940", primaryDark: "#37432f", accent: "#8a9a7b", soft: "#eceee6", section: "#f5f1ea", page: "#f8f6f1" }, null),
  preset("valentines", "Valentine's", { primary: "#9b2f52", primaryDark: "#76213e", accent: "#d68aa3", soft: "#f8e8ee", section: "#fbf1f4", page: "#fdf8f9" }, { start: "01-25", end: "02-14" }, "Order by Feb 9 for Valentine's delivery"),
  preset("spring", "Spring Blossom", { primary: "#6f5585", primaryDark: "#54406a", accent: "#b6a1c8", soft: "#f0ebf5", section: "#f7f3f8", page: "#fbf9fc" }, { start: "03-01", end: "05-31" }),
  preset("summer", "Summer Breeze", { primary: "#1d6a73", primaryDark: "#144e56", accent: "#7fb5ae", soft: "#e5f1f0", section: "#f2f7f6", page: "#f8fbfa" }, { start: "06-01", end: "08-31" }),
  preset("autumn", "Autumn Harvest", { primary: "#8f5328", primaryDark: "#6b3d1c", accent: "#c79a6a", soft: "#f3eadf", section: "#f7f0e6", page: "#fbf7f1" }, { start: "09-01", end: "11-14" }),
  preset("christmas", "Christmas", { primary: "#8c1d2c", primaryDark: "#6a1420", accent: "#3f7a5a", soft: "#f2ebe5", section: "#f7efe7", page: "#fbf7f2" }, { start: "11-15", end: "12-31" }, "Order by Dec 15 for Christmas delivery"),
];

const HEX = /^#[0-9a-f]{6}$/i;
const MMDD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const IMAGE_KEY = /^(hero\/christmas|banners\/(personal-touch|newsletter)|categories\/[a-z0-9-]{1,40}|products\/[a-z0-9-]{1,60})$/;
const SITE_IMAGE_URL = /^\/api\/site-images\/si_[a-z0-9]{16}\.(jpg|png|webp)$/;

const md = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** True when today's month-day is inside the range (ranges may wrap the new year, e.g. 12-20 → 01-05). */
function inRange(schedule, today) {
  if (!schedule) return false;
  const t = md(today);
  return schedule.start <= schedule.end ? t >= schedule.start && t <= schedule.end : t >= schedule.start || t <= schedule.end;
}

export function createSite({ dataDir }) {
  const file = join(dataDir, "site.json");
  // Starts pinned to the everyday look, so nothing changes until an admin turns on automatic seasons.
  const fresh = () => ({ mode: "manual", activeThemeId: "everyday", defaultThemeId: "everyday", themes: structuredClone(PRESETS), images: {}, updatedAt: new Date().toISOString() });
  let site = existsSync(file) ? { ...fresh(), ...JSON.parse(readFileSync(file, "utf8")) } : fresh();
  const save = () => {
    site.updatedAt = new Date().toISOString();
    writeFileSync(file + ".tmp", JSON.stringify(site, null, 1));
    renameSync(file + ".tmp", file);
  };
  if (!existsSync(file)) save();

  const themeById = (id) => site.themes.find((t) => t.id === id);

  /** The theme visitors see right now. */
  function currentTheme(now = new Date()) {
    if (site.mode === "manual") return themeById(site.activeThemeId) ?? themeById(site.defaultThemeId) ?? site.themes[0];
    // Automatic: first theme (in list order) whose date range includes today, else the default.
    return site.themes.find((t) => t.schedule && inRange(t.schedule, now)) ?? themeById(site.defaultThemeId) ?? site.themes[0];
  }

  /** What the storefront needs: colors, announcement and the merged image overrides. */
  function publicConfig(now = new Date()) {
    const t = currentTheme(now);
    return { theme: { id: t.id, name: t.name, colors: t.colors, announcement: t.announcement || "" }, images: { ...site.images, ...(t.images || {}) }, updatedAt: site.updatedAt };
  }

  /** Validates and stores the theme list + mode coming from the admin form. Throws Error(message) on bad input. */
  function updateThemes(body) {
    const themes = Array.isArray(body.themes) ? body.themes.slice(0, 20) : null;
    if (!themes || !themes.length) throw new Error("At least one theme is required.");
    const seen = new Set();
    const clean = themes.map((t) => {
      const id = String(t.id || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
      if (!id || seen.has(id)) throw new Error("Each theme needs a unique id.");
      seen.add(id);
      const name = String(t.name || "").trim().slice(0, 40);
      if (!name) throw new Error("Each theme needs a name.");
      const colors = {};
      for (const k of Object.keys(COLOR_KEYS)) {
        const v = String(t.colors?.[k] || "");
        if (!HEX.test(v)) throw new Error(`${name}: "${k}" must be a color like #4a5940.`);
        colors[k] = v.toLowerCase();
      }
      let schedule = null;
      if (t.schedule && (t.schedule.start || t.schedule.end)) {
        if (!MMDD.test(t.schedule.start) || !MMDD.test(t.schedule.end)) throw new Error(`${name}: dates must look like 12-01 (month-day).`);
        schedule = { start: t.schedule.start, end: t.schedule.end };
      }
      const prev = themeById(id);
      return {
        id,
        name,
        colors,
        schedule,
        announcement: String(t.announcement || "").trim().slice(0, 120),
        images: prev?.images ?? {}, // images are managed through the image endpoints
        builtIn: !!prev?.builtIn,
      };
    });
    const mode = body.mode === "manual" ? "manual" : "auto";
    const activeThemeId = seen.has(body.activeThemeId) ? body.activeThemeId : clean[0].id;
    const defaultThemeId = seen.has(body.defaultThemeId) ? body.defaultThemeId : clean[0].id;
    site = { ...site, themes: clean, mode, activeThemeId, defaultThemeId };
    save();
  }

  /** Sets (url) or clears (null) an image override, globally or for one theme. Returns the replaced URL, if any. */
  function setImage(key, themeId, url) {
    if (!IMAGE_KEY.test(key)) throw new Error("Unknown image slot.");
    if (url !== null && !SITE_IMAGE_URL.test(url)) throw new Error("Invalid image.");
    const target = themeId ? themeById(themeId)?.images : site.images;
    if (!target) throw new Error("Unknown season.");
    const old = target[key];
    if (url === null) delete target[key];
    else target[key] = url;
    save();
    return old;
  }

  /** Is this stored file still referenced anywhere? (so replaced uploads can be cleaned up) */
  const isReferenced = (url) => Object.values(site.images).includes(url) || site.themes.some((t) => Object.values(t.images || {}).includes(url));

  const restorePreset = (id) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) throw new Error("Only built-in seasons can be restored.");
    const i = site.themes.findIndex((t) => t.id === id);
    const restored = { ...structuredClone(p), images: site.themes[i]?.images ?? {} };
    if (i >= 0) site.themes[i] = restored;
    else site.themes.push(restored);
    save();
  };

  return { get: () => site, currentTheme, publicConfig, updateThemes, setImage, isReferenced, restorePreset };
}

/** CSS + bootstrap script injected into index.html so the page renders in the right theme immediately. */
export function headInjection(config) {
  const vars = Object.entries(COLOR_KEYS)
    .map(([k, cssVar]) => `${cssVar}:${config.theme.colors[k]}`)
    .join(";");
  const json = JSON.stringify(config).replace(/</g, "\\u003c");
  return `<style id="site-theme">:root{${vars}}</style><script>window.__SITE__=${json}</script>`;
}
