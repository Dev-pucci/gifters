// In-browser stand-in for the cart/favorites backend. It keeps its "database" in
// localStorage so state survives reloads, and bumps a section's version on every change.
// Orders and payments are NOT handled here — they go to the real Node server (server/index.mjs).

import { findVariant, getProductById } from "../data/catalog.ts";
import { validatePersonalization } from "../lib/personalization.ts";
import { priceLines } from "../lib/pricing.ts";
import type { CartLine, KnownVersions, LinePatch, Personalization, SectionName, Sections, SectionsResponse } from "./types.ts";

const DB_KEY = "hg_mock_db_v2";

interface Db {
  cart: CartLine[];
  saved: CartLine[];
  favorites: string[];
  customer: { loggedIn: boolean; firstName: string | null; subscribed: boolean };
  versions: Record<SectionName, number>;
}

const fresh = (): Db => ({
  cart: [],
  saved: [],
  favorites: [],
  customer: { loggedIn: false, firstName: null, subscribed: false },
  versions: { cart: 1, favorite: 1, customer: 1 },
});

/** Drop lines whose product/variant no longer exists (e.g. after a catalog change). */
const valid = (l: CartLine) => {
  const p = getProductById(l.productId);
  return !!p && !!findVariant(p, l.variantKey);
};

function load(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const db = { ...fresh(), ...JSON.parse(raw) } as Db;
      db.cart = db.cart.filter(valid);
      db.saved = db.saved.filter(valid);
      return db;
    }
  } catch {
    /* storage unavailable: fall through to an in-memory db */
  }
  return fresh();
}

let db = load();

function save(changed: SectionName[]) {
  for (const s of changed) db.versions[s] += 1;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

function render(): Sections {
  const totals = priceLines(db.cart);
  return {
    cart: { count: totals.count, subtotal: totals.subtotal, currency: "USD", items: db.cart, saved: db.saved },
    favorite: { count: db.favorites.length, productIds: db.favorites },
    customer: db.customer,
  };
}

/** Returns only the sections whose version differs from what the client already has. */
function sections(known: KnownVersions = {}, only?: SectionName[]): SectionsResponse {
  const all = render();
  const out: SectionsResponse = { sections: {} };
  for (const name of only ?? (Object.keys(all) as SectionName[])) {
    if (known[name] === db.versions[name]) continue;
    (out.sections as Record<string, unknown>)[name] = { version: db.versions[name], data: all[name] };
  }
  return out;
}

const latency = <T>(value: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(value)), 100 + Math.random() * 120));
const fail = (msg: string) => Promise.reject(new Error(msg));

const sameLine = (a: CartLine, b: Pick<CartLine, "productId" | "variantKey" | "giftBag" | "personalization">) =>
  a.productId === b.productId && a.variantKey === b.variantKey && a.giftBag === b.giftBag && JSON.stringify(a.personalization) === JSON.stringify(b.personalization);

function checkItem(productId: string, variantKey: string, personalization: Personalization) {
  const product = getProductById(productId);
  if (!product) return { error: "Unknown product" } as const;
  const variant = findVariant(product, variantKey);
  if (!variant) return { error: "Please choose all options." } as const;
  if (!variant.inStock) return { error: "That option is out of stock." } as const;
  const v = validatePersonalization(product, personalization);
  if (!v.ok) return { error: Object.values(v.errors)[0] } as const;
  return { product, variant, clean: v.clean } as const;
}

export const mockServer = {
  // POST /rest/sections
  getSections(known: KnownVersions) {
    db = load();
    return latency(sections(known));
  },

  // POST /rest/cart/items
  addToCart(productId: string, variantKey: string, qty: number, personalization: Personalization) {
    const c = checkItem(productId, variantKey, personalization);
    if ("error" in c) return fail(c.error!);
    const draft = { productId, variantKey, giftBag: false, personalization: c.clean };
    const existing = db.cart.find((l) => sameLine(l, draft));
    if (existing) existing.qty = Math.min(99, existing.qty + qty);
    else db.cart.push({ lineId: crypto.randomUUID(), qty, unitPrice: c.variant.price, ...draft });
    save(["cart"]);
    return latency(sections({}, ["cart"]));
  },

  // PATCH /rest/cart/items/:lineId
  updateLine(lineId: string, patch: LinePatch) {
    const line = db.cart.find((l) => l.lineId === lineId);
    if (!line) return fail("That item is no longer in your cart.");
    if (patch.qty !== undefined && patch.qty <= 0) {
      db.cart = db.cart.filter((l) => l.lineId !== lineId);
    } else {
      const next = { ...line, ...patch };
      if (patch.variantKey || patch.personalization) {
        const c = checkItem(next.productId, next.variantKey, next.personalization);
        if ("error" in c) return fail(c.error!);
        next.personalization = c.clean;
        next.unitPrice = c.variant.price;
      }
      next.qty = Math.min(99, Math.max(1, next.qty));
      db.cart = db.cart.map((l) => (l.lineId === lineId ? next : l));
    }
    save(["cart"]);
    return latency(sections({}, ["cart"]));
  },

  // POST /rest/cart/items/:lineId/save-for-later
  saveForLater(lineId: string) {
    const line = db.cart.find((l) => l.lineId === lineId);
    if (!line) return fail("That item is no longer in your cart.");
    db.cart = db.cart.filter((l) => l.lineId !== lineId);
    db.saved = [line, ...db.saved];
    save(["cart"]);
    return latency(sections({}, ["cart"]));
  },

  // POST /rest/cart/saved/:lineId/move-to-cart
  moveToCart(lineId: string) {
    const line = db.saved.find((l) => l.lineId === lineId);
    if (!line) return fail("That item is no longer saved.");
    const variant = findVariant(getProductById(line.productId)!, line.variantKey);
    if (!variant?.inStock) return fail("That option is out of stock right now.");
    db.saved = db.saved.filter((l) => l.lineId !== lineId);
    db.cart.push({ ...line, unitPrice: variant.price });
    save(["cart"]);
    return latency(sections({}, ["cart"]));
  },

  // DELETE /rest/cart/saved/:lineId
  removeSaved(lineId: string) {
    db.saved = db.saved.filter((l) => l.lineId !== lineId);
    save(["cart"]);
    return latency(sections({}, ["cart"]));
  },

  // Called after an order is placed.
  clearCart() {
    db.cart = [];
    save(["cart"]);
    return latency(sections({}, ["cart"]));
  },

  // POST /rest/favorites/toggle
  toggleFavorite(productId: string) {
    db.favorites = db.favorites.includes(productId) ? db.favorites.filter((id) => id !== productId) : [...db.favorites, productId];
    save(["favorite"]);
    return latency(sections({}, ["favorite"]));
  },

  // POST /rest/newsletter
  subscribe(email: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Please enter a valid email address.");
    db.customer = { ...db.customer, subscribed: true };
    save(["customer"]);
    return latency(sections({}, ["customer"]));
  },
};
