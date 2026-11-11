// Storefront appearance from the admin area: the active season's colors + image overrides.

export const COLOR_KEYS = {
  primary: "--color-olive",
  primaryDark: "--color-olive-dark",
  accent: "--color-sage",
  soft: "--color-sage-soft",
  section: "--color-linen",
  page: "--color-cream",
} as const;

export type ColorKey = keyof typeof COLOR_KEYS;
export type ThemeColors = Record<ColorKey, string>;

export const COLOR_LABELS: Record<ColorKey, { label: string; hint: string }> = {
  primary: { label: "Primary", hint: "Buttons, links, icons, selected options" },
  primaryDark: { label: "Primary (dark)", hint: "Announcement bar, button hover" },
  accent: { label: "Accent", hint: "Leaves, ribbons and soft details in illustrations" },
  soft: { label: "Soft background", hint: "Banners, icon circles, newsletter" },
  section: { label: "Section background", hint: "Page headers, hero, panels" },
  page: { label: "Page background", hint: "Behind everything" },
};

export interface SiteConfig {
  theme: { id: string; name: string; colors: ThemeColors; announcement: string };
  images: Record<string, string>;
  updatedAt: string;
}

let overrides: Record<string, string> = {};
export const imageOverride = (key: string): string | undefined => overrides[key];

/** Applies colors to the page (CSS variables) and remembers image overrides. */
export function applySiteConfig(config: SiteConfig) {
  overrides = config.images ?? {};
  applyColors(config.theme.colors);
}

export function applyColors(colors: ThemeColors) {
  const root = document.documentElement;
  for (const [k, cssVar] of Object.entries(COLOR_KEYS)) root.style.setProperty(cssVar, colors[k as ColorKey]);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors.primaryDark);
}

// ---------- contrast (WCAG) so admins don't pick unreadable combinations

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const INK = "#1f2a37";

/** Readability problems with a set of colors (empty when everything passes WCAG AA). */
export function contrastWarnings(c: ThemeColors): string[] {
  const out: string[] = [];
  const check = (fg: string, bg: string, min: number, what: string) => {
    const r = contrast(fg, bg);
    if (r < min) out.push(`${what} is hard to read (contrast ${r.toFixed(1)}:1, needs ${min}:1).`);
  };
  check("#ffffff", c.primary, 4.5, "White text on Primary buttons");
  check("#ffffff", c.primaryDark, 4.5, "White text on the announcement bar");
  check(c.primary, c.page, 4.5, "Primary links on the page background");
  check(INK, c.section, 4.5, "Text on the section background");
  check(INK, c.soft, 4.5, "Text on the soft background");
  return out;
}
