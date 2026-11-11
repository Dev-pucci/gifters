// The only module the UI uses to reach a backend.
//  - Cart, favorites and newsletter: in-browser mock (src/api/mockServer.ts). Swap the bodies
//    for fetch() calls when a real cart service exists.
//  - Photo uploads, orders and payments: the real Node server (server/index.mjs) under /api.

import type { ShippingMethod } from "../lib/pricing.ts";
import type { ThemeColors } from "../lib/site.ts";
import { mockServer } from "./mockServer.ts";
import type { CartLine, KnownVersions, LinePatch, Personalization, SectionsResponse } from "./types.ts";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new Error("Can't reach the store server. Start it with `npm run dev`.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  return body as T;
}

/** A failed request, with its HTTP status (401 = signed out, 403 = not allowed). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const postJson = <T,>(path: string, body: unknown) => http<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  isAdmin?: boolean;
}

export interface AdminTheme {
  id: string;
  name: string;
  colors: ThemeColors;
  schedule: { start: string; end: string } | null;
  announcement: string;
  images: Record<string, string>;
  builtIn?: boolean;
}

export interface AdminSite {
  site: { mode: "auto" | "manual"; activeThemeId: string; defaultThemeId: string; themes: AdminTheme[]; images: Record<string, string>; updatedAt: string };
  currentThemeId: string;
  presets: string[];
}

export interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export type PaymentMethodId = "mpesa" | "card" | "test";

export interface OrderRequest {
  email: string;
  address: Address;
  shippingMethod: ShippingMethod;
  promoCode?: string;
  paymentMethod: PaymentMethodId;
  mpesaPhone?: string;
  lines: Pick<CartLine, "productId" | "variantKey" | "qty" | "giftBag" | "personalization">[];
}

export interface MpesaPayment {
  method: "mpesa";
  mode: "simulated" | "sandbox" | "production";
  amountKes: number;
  kesPerUsd: number;
  phoneMasked: string;
  attempts: number;
  pending: boolean;
  receipt: string | null;
  failureReason: string | null;
  paidAt?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  status: "awaiting_payment" | "paid" | "test_order" | "payment_failed";
  paymentProvider: "stripe" | "placeholder" | "mpesa";
  payment?: MpesaPayment | { method: "card" | "test" };
  email: string;
  address: Address;
  lines: (OrderRequest["lines"][number] & { name: string; variantLabel: string; sku: string; unitPrice: number; lineTotal: number; summary: string })[];
  totals: { subtotal: number; giftBags: number; discount: number; shipping: number; total: number; promoCode: string | null; shippingMethod: ShippingMethod };
}

export interface PaymentConfig {
  provider: "stripe" | "placeholder";
  mpesa: { mode: MpesaPayment["mode"]; kesPerUsd: number };
  methods: { id: PaymentMethodId; label: string; available: boolean; note?: string }[];
}

export const api = {
  getSections: (known: KnownVersions): Promise<SectionsResponse> => mockServer.getSections(known),
  addToCart: (productId: string, variantKey: string, qty: number, p: Personalization) => mockServer.addToCart(productId, variantKey, qty, p),
  updateLine: (lineId: string, patch: LinePatch) => mockServer.updateLine(lineId, patch),
  saveForLater: (lineId: string) => mockServer.saveForLater(lineId),
  moveToCart: (lineId: string) => mockServer.moveToCart(lineId),
  removeSaved: (lineId: string) => mockServer.removeSaved(lineId),
  clearCart: () => mockServer.clearCart(),
  toggleFavorite: (productId: string) => mockServer.toggleFavorite(productId),
  subscribe: (email: string) => mockServer.subscribe(email),

  paymentConfig: () => http<PaymentConfig>("/api/config"),
  uploadPhoto: (file: File) => http<{ id: string }>("/api/uploads", { method: "POST", headers: { "Content-Type": file.type }, body: file }),
  createOrder: (req: OrderRequest) =>
    http<{ orderId: string; redirectUrl: string }>("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) }),
  getOrder: (id: string, sessionId?: string) => http<Order>(`/api/orders/${encodeURIComponent(id)}${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`),
  // ---- accounts (cookie session; same-origin fetches send the cookie automatically)
  me: () => http<{ user: User | null }>("/api/auth/me"),
  signUp: (name: string, email: string, password: string) => postJson<{ user: User }>("/api/auth/signup", { name, email, password }),
  signIn: (email: string, password: string) => postJson<{ user: User }>("/api/auth/signin", { email, password }),
  signOut: () => postJson<{ ok: true }>("/api/auth/signout", {}),
  forgotPassword: (email: string) => postJson<{ ok: true }>("/api/auth/forgot", { email }),
  resetPassword: (token: string, password: string) => postJson<{ user: User }>("/api/auth/reset", { token, password }),
  updateProfile: (name: string) => postJson<{ user: User }>("/api/account/profile", { name }),
  changePassword: (current: string, next: string) => postJson<{ ok: true }>("/api/account/password", { current, next }),
  deleteAccount: (password: string) => postJson<{ ok: true }>("/api/account/delete", { password }),
  myOrders: () => http<{ orders: Order[] }>("/api/account/orders"),

  // ---- admin: site appearance
  adminSite: () => http<AdminSite>("/api/admin/site"),
  saveSite: (s: Pick<AdminSite["site"], "mode" | "activeThemeId" | "defaultThemeId" | "themes">) =>
    http<AdminSite>("/api/admin/site", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }),
  restoreSeason: (id: string) => postJson<AdminSite>("/api/admin/site/restore", { id }),
  uploadSiteImage: (key: string, themeId: string | null, file: File) =>
    http<AdminSite>(`/api/admin/images?key=${encodeURIComponent(key)}${themeId ? `&theme=${encodeURIComponent(themeId)}` : ""}`, { method: "POST", headers: { "Content-Type": file.type }, body: file }),
  resetSiteImage: (key: string, themeId: string | null) => http<AdminSite>(`/api/admin/images?key=${encodeURIComponent(key)}${themeId ? `&theme=${encodeURIComponent(themeId)}` : ""}`, { method: "DELETE" }),

  lookupOrder: (orderId: string, email: string) =>
    http<Order>("/api/orders/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, email }) }),
  contact: (msg: { name: string; email: string; topic: string; orderId?: string; message: string; website?: string }) =>
    http<{ ticket: string }>("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(msg) }),
  retryMpesa: (id: string, phone?: string) =>
    http<Order>(`/api/orders/${encodeURIComponent(id)}/mpesa/retry`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) }),
};

export const uploadUrl = (id: string) => `/api/uploads/${id}`;
