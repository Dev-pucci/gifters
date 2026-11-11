import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { findVariant, getProductById } from "../data/catalog";
import { productImage } from "../data/images";
import { personalizationSummary } from "../lib/personalization";
import { FREE_SHIP_AT, priceLines } from "../lib/pricing";
import { useSections } from "../state/sections";
import IconBadge from "./IconBadge";
import { CloseIcon, GiftIcon } from "./Icons";
import ProductArt from "./ProductArt";
import { money } from "./ProductCard";
import QtyStepper from "./QtyStepper";

export function FreeShippingMeter({ subtotal }: { subtotal: number }) {
  const left = Math.max(0, FREE_SHIP_AT - subtotal);
  const pct = Math.min(100, (subtotal / FREE_SHIP_AT) * 100);
  return (
    <div>
      <p className="mb-2 text-sm">{left > 0 ? <>You're <strong>{money(left)}</strong> away from free standard shipping</> : <strong className="text-pine">You've unlocked free standard shipping!</strong>}</p>
      <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Progress to free shipping">
        <div className="h-full rounded-full bg-pine transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function MiniCart() {
  const { cart, cartOpen, setCartOpen, setQty } = useSections();
  const closeBtn = useRef<HTMLButtonElement>(null);
  const totals = priceLines(cart.items);

  useEffect(() => {
    if (!cartOpen) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCartOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;
  const close = () => setCartOpen(false);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Your cart">
      <button type="button" aria-label="Close cart" className="absolute inset-0 bg-black/40" onClick={close} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-xl font-medium">Your cart ({cart.count})</h2>
          <button ref={closeBtn} type="button" aria-label="Close cart" onClick={close} className="grid h-10 w-10 place-items-center rounded-full hover:bg-cream">
            <CloseIcon />
          </button>
        </div>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <IconBadge size="lg">
              <GiftIcon strokeWidth={1.5} />
            </IconBadge>
            <p className="font-display text-xl">Your cart is empty</p>
            <p className="text-sm text-ink-soft">Find something they'll keep forever.</p>
            <Link to="/c/bestsellers" onClick={close} className="btn-primary">
              Shop bestsellers
            </Link>
          </div>
        ) : (
          <>
            <div className="border-b border-line px-5 py-4">
              <FreeShippingMeter subtotal={totals.subtotal} />
            </div>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {cart.items.map((line) => {
                const p = getProductById(line.productId);
                const v = p && findVariant(p, line.variantKey);
                if (!p || !v) return null;
                return (
                  <li key={line.lineId} className="flex gap-4 py-4">
                    <Link to={`/p/${p.slug}`} onClick={close} className="w-20 shrink-0 overflow-hidden rounded-md">
                      <ProductArt art={p.art} image={productImage(p.slug)} size="sm" label={p.name} />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-ink-soft">{v.label}</p>
                      <p className="text-xs text-ink-soft">{personalizationSummary(p, line.personalization)}</p>
                      {line.giftBag ? <p className="text-xs text-pine">+ Gift bag</p> : null}
                      <div className="mt-auto flex items-center justify-between pt-1">
                        <QtyStepper qty={line.qty} onChange={(q) => setQty(line.lineId, q)} label={p.name} />
                        <span className="text-sm font-semibold">{money(totals.lines.find((l) => l.lineId === line.lineId)?.lineTotal ?? 0)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="space-y-3 border-t border-line px-5 py-5">
              <div className="flex justify-between text-base">
                <span>Subtotal</span>
                <strong>{money(totals.subtotal)}</strong>
              </div>
              <p className="text-xs text-ink-soft">Personalization is always free. Shipping calculated at checkout.</p>
              <Link to="/cart" onClick={close} className="btn-primary w-full">
                View cart & checkout
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
