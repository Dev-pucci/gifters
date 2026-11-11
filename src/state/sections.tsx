// Client-side section store.
// 1. On load, render instantly from the locally cached copy of each section.
// 2. Ask the backend for sections, sending the versions we hold; only changed ones come back.
// 3. Every mutation returns the sections it touched, which replace the cached copies.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client.ts";
import type { KnownVersions, LinePatch, Personalization, SectionName, Sections, SectionsResponse, Versioned } from "../api/types.ts";

const CACHE_PREFIX = "hg_section_v2_";

const empty: Sections = {
  cart: { count: 0, subtotal: 0, currency: "USD", items: [], saved: [] },
  favorite: { count: 0, productIds: [] },
  customer: { loggedIn: false, firstName: null, subscribed: false },
};

type Store = { [K in SectionName]: Versioned<Sections[K]> | null };

function readCache(): Store {
  const out = { cart: null, favorite: null, customer: null } as Store;
  for (const name of Object.keys(out) as SectionName[]) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + name);
      if (raw) (out as Record<string, unknown>)[name] = JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }
  return out;
}

function writeCache(name: SectionName, value: unknown) {
  try {
    localStorage.setItem(CACHE_PREFIX + name, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

interface Ctx extends Sections {
  ready: boolean;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (productId: string, variantKey: string, qty: number, p: Personalization) => Promise<void>;
  updateLine: (lineId: string, patch: LinePatch) => Promise<void>;
  setQty: (lineId: string, qty: number) => Promise<void>;
  saveForLater: (lineId: string) => Promise<void>;
  moveToCart: (lineId: string) => Promise<void>;
  removeSaved: (lineId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleFavorite: (productId: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  subscribe: (email: string) => Promise<void>;
}

const SectionContext = createContext<Ctx | null>(null);

export function SectionProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(readCache);
  const [ready, setReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  // Optimistic favorites so the heart responds immediately.
  const [pendingFav, setPendingFav] = useState<Record<string, boolean>>({});

  const apply = useCallback((res: SectionsResponse) => {
    setStore((prev) => {
      const next = { ...prev };
      for (const [name, value] of Object.entries(res.sections) as [SectionName, Versioned<never>][]) {
        (next as Record<string, unknown>)[name] = value;
        writeCache(name, value);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const known: KnownVersions = {};
    const cached = readCache();
    for (const name of Object.keys(cached) as SectionName[]) {
      const v = cached[name];
      if (v) known[name] = v.version;
    }
    api.getSections(known).then(apply).finally(() => setReady(true));
  }, [apply]);

  const value = useMemo<Ctx>(() => {
    const cart = { ...empty.cart, ...(store.cart?.data ?? {}) };
    const favorite = store.favorite?.data ?? empty.favorite;
    const customer = store.customer?.data ?? empty.customer;
    const isFavorite = (id: string) => (id in pendingFav ? pendingFav[id] : favorite.productIds.includes(id));
    return {
      cart,
      favorite,
      customer,
      ready,
      cartOpen,
      setCartOpen,
      isFavorite,
      addToCart: async (productId, variantKey, qty, p) => {
        apply(await api.addToCart(productId, variantKey, qty, p));
        setCartOpen(true);
      },
      updateLine: async (lineId, patch) => apply(await api.updateLine(lineId, patch)),
      setQty: async (lineId, qty) => apply(await api.updateLine(lineId, { qty })),
      saveForLater: async (lineId) => apply(await api.saveForLater(lineId)),
      moveToCart: async (lineId) => apply(await api.moveToCart(lineId)),
      removeSaved: async (lineId) => apply(await api.removeSaved(lineId)),
      clearCart: async () => apply(await api.clearCart()),
      toggleFavorite: async (productId) => {
        setPendingFav((m) => ({ ...m, [productId]: !isFavorite(productId) }));
        try {
          apply(await api.toggleFavorite(productId));
        } finally {
          setPendingFav((m) => {
            const { [productId]: _, ...rest } = m;
            return rest;
          });
        }
      },
      subscribe: async (email) => apply(await api.subscribe(email)),
    };
  }, [store, ready, cartOpen, pendingFav, apply]);

  return <SectionContext.Provider value={value}>{children}</SectionContext.Provider>;
}

export function useSections() {
  const ctx = useContext(SectionContext);
  if (!ctx) throw new Error("useSections must be used inside <SectionProvider>");
  return ctx;
}
