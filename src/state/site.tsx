import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { applySiteConfig, type SiteConfig } from "../lib/site";

declare global {
  interface Window {
    /** Injected by the server into index.html (see server/site.mjs headInjection). */
    __SITE__?: SiteConfig;
  }
}

/** Loads the storefront theme before the first render: from the page itself, else from /api/site. */
export async function loadSiteConfig(): Promise<SiteConfig | null> {
  if (window.__SITE__) return window.__SITE__;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch("/api/site", { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) return (await res.json()) as SiteConfig;
  } catch {
    /* server unreachable: fall back to the built-in theme */
  }
  return null;
}

interface Ctx {
  config: SiteConfig | null;
  /** Re-fetches and applies the live theme (e.g. after an admin saves). */
  refresh: () => Promise<void>;
}

const SiteCtx = createContext<Ctx>({ config: null, refresh: async () => undefined });

export function SiteProvider({ initial, children }: { initial: SiteConfig | null; children: ReactNode }) {
  const [config, setConfig] = useState(initial);
  const refresh = useCallback(async () => {
    window.__SITE__ = undefined;
    const next = await loadSiteConfig();
    if (next) {
      applySiteConfig(next);
      setConfig(next);
    }
  }, []);
  return <SiteCtx.Provider value={{ config, refresh }}>{children}</SiteCtx.Provider>;
}

export const useSite = () => useContext(SiteCtx);
