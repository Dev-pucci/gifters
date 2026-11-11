// Single source of truth for prices and totals. The browser uses it to show the cart;
// the server uses the same code to compute what is actually charged, so a tampered
// client can't change prices.
import { findVariant, getProductById } from "../data/catalog.ts";

export const GIFT_BAG_PRICE = 2.99;
export const FREE_SHIP_AT = 59;
export const CURRENCY = "usd";

export const SHIPPING_METHODS = {
  standard: { label: "Standard", detail: "5–7 business days", price: 7.99, transitDays: 6, freeOver: FREE_SHIP_AT },
  express: { label: "Express", detail: "2–3 business days", price: 14.99, transitDays: 3, freeOver: null },
} as const;
export type ShippingMethod = keyof typeof SHIPPING_METHODS;

export const PROMO_CODES: Record<string, { percent: number; label: string }> = {
  WELCOME15: { percent: 15, label: "15% off — welcome offer" },
};

export interface LineInput {
  lineId?: string;
  productId: string;
  variantKey: string;
  qty: number;
  giftBag?: boolean;
}

export interface PricedLine {
  lineId?: string;
  productId: string;
  variantKey: string;
  name: string;
  variantLabel: string;
  sku: string;
  qty: number;
  unitPrice: number;
  compValue: number;
  giftBag: boolean;
  /** Merchandise + gift bags for this line. */
  lineTotal: number;
}

const cents = (n: number) => Math.round(n * 100);
const dollars = (c: number) => c / 100;

export class PricingError extends Error {}

export function priceLines(lines: LineInput[]) {
  const priced: PricedLine[] = lines.map((l) => {
    const product = getProductById(l.productId);
    const variant = product && findVariant(product, l.variantKey);
    if (!product || !variant) throw new PricingError(`Unknown item ${l.productId}/${l.variantKey}`);
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 99) throw new PricingError(`Invalid quantity for ${product.name}`);
    const giftBag = !!l.giftBag;
    const lineCents = cents(variant.price) * l.qty + (giftBag ? cents(GIFT_BAG_PRICE) * l.qty : 0);
    return {
      lineId: l.lineId,
      productId: product.id,
      variantKey: variant.key,
      name: product.name,
      variantLabel: variant.label,
      sku: variant.sku,
      qty: l.qty,
      unitPrice: variant.price,
      compValue: variant.compValue,
      giftBag,
      lineTotal: dollars(lineCents),
    };
  });
  const merchCents = priced.reduce((s, l) => s + cents(l.unitPrice) * l.qty, 0);
  const bagCents = priced.reduce((s, l) => s + (l.giftBag ? cents(GIFT_BAG_PRICE) * l.qty : 0), 0);
  const compCents = priced.reduce((s, l) => s + cents(l.compValue) * l.qty, 0);
  return {
    lines: priced,
    count: priced.reduce((n, l) => n + l.qty, 0),
    merchandise: dollars(merchCents),
    giftBags: dollars(bagCents),
    subtotal: dollars(merchCents + bagCents),
    savings: dollars(Math.max(0, compCents - merchCents)),
  };
}

export interface QuoteOptions {
  shippingMethod?: ShippingMethod;
  promoCode?: string;
}

export function quote(lines: LineInput[], opts: QuoteOptions = {}) {
  const base = priceLines(lines);
  const method = SHIPPING_METHODS[opts.shippingMethod ?? "standard"] ?? SHIPPING_METHODS.standard;
  const code = opts.promoCode?.trim().toUpperCase() || "";
  const promo = code ? PROMO_CODES[code] : undefined;
  const discountCents = promo ? Math.round(cents(base.merchandise) * (promo.percent / 100)) : 0;
  const shippingCents = base.count === 0 ? 0 : method.freeOver !== null && base.subtotal >= method.freeOver ? 0 : cents(method.price);
  const totalCents = cents(base.subtotal) - discountCents + shippingCents;
  return {
    ...base,
    shippingMethod: (opts.shippingMethod ?? "standard") as ShippingMethod,
    shipping: dollars(shippingCents),
    promo: promo ? { code, ...promo } : null,
    promoError: code && !promo ? "That promo code isn't valid." : null,
    discount: dollars(discountCents),
    total: dollars(totalCents),
  };
}

export type Quote = ReturnType<typeof quote>;

/** USD → whole Kenyan shillings for M-Pesa, always rounded up so the store is never short-paid. */
export function toKes(usd: number, kesPerUsd: number): number {
  return Math.ceil((Math.round(usd * 100) * kesPerUsd) / 100 - 1e-9);
}

export const formatKes = (kes: number) => `KSh ${kes.toLocaleString("en-KE")}`;
