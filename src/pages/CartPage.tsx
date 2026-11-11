import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CartLine } from "../api/types";
import IconBadge from "../components/IconBadge";
import { GiftIcon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { FreeShippingMeter } from "../components/MiniCart";
import ProductArt from "../components/ProductArt";
import { money } from "../components/ProductCard";
import QtyStepper from "../components/QtyStepper";
import { findVariant, getProductById } from "../data/catalog";
import { productImage } from "../data/images";
import { personalizationSummary } from "../lib/personalization";
import { GIFT_BAG_PRICE, quote } from "../lib/pricing";
import { getPromo, setPromo } from "../state/promo";
import { useSections } from "../state/sections";

function useLineAction() {
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return { error, run };
}

function LineItem({ line, lineTotal }: { line: CartLine; lineTotal: number }) {
  const { setQty, updateLine, saveForLater } = useSections();
  const { error, run } = useLineAction();
  const p = getProductById(line.productId);
  const v = p && findVariant(p, line.variantKey);
  if (!p || !v) return null;
  const editUrl = `/p/${p.slug}?edit=${line.lineId}`;
  return (
    <li className="flex gap-4 py-5">
      <Link to={`/p/${p.slug}`} className="w-24 shrink-0 overflow-hidden rounded-md sm:w-28">
        <ProductArt art={p.art} image={productImage(p.slug)} size="sm" label={p.name} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex justify-between gap-4">
          <Link to={`/p/${p.slug}`} className="font-semibold hover:text-olive">
            {p.name}
          </Link>
          <span className="font-semibold">{money(lineTotal)}</span>
        </div>
        <p className="text-sm text-ink-soft">{v.label}</p>
        <p className="text-sm text-ink-soft">{personalizationSummary(p, line.personalization)}</p>
        <p className="text-sm">
          <span className="font-semibold text-ink">{money(v.price)}</span> <span className="text-ink-soft line-through">{money(v.compValue)}</span> <span className="text-ink-soft">each</span>
        </p>
        <label className="mt-1 flex w-fit cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={line.giftBag} onChange={(e) => run(() => updateLine(line.lineId, { giftBag: e.target.checked }))} className="h-4 w-4 accent-[var(--color-olive)]" />
          <GiftIcon width={16} height={16} className="text-olive" /> Add a gift bag — {money(GIFT_BAG_PRICE)} each
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <QtyStepper qty={line.qty} onChange={(q) => run(() => setQty(line.lineId, q))} label={p.name} />
          <Link to={editUrl} className="text-sm underline hover:text-olive">
            Edit
          </Link>
          <button type="button" onClick={() => run(() => saveForLater(line.lineId))} className="text-sm underline hover:text-olive">
            Save for later
          </button>
          <button type="button" onClick={() => run(() => setQty(line.lineId, 0))} className="text-sm text-ink-soft underline hover:text-olive">
            Remove
          </button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-brand">
            {error}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function SavedItem({ line }: { line: CartLine }) {
  const { moveToCart, removeSaved } = useSections();
  const { error, run } = useLineAction();
  const p = getProductById(line.productId);
  const v = p && findVariant(p, line.variantKey);
  if (!p || !v) return null;
  return (
    <li className="flex gap-4 py-4">
      <div className="w-20 shrink-0 overflow-hidden rounded-md">
        <ProductArt art={p.art} image={productImage(p.slug)} size="sm" label={p.name} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-semibold">{p.name}</p>
        <p className="text-sm text-ink-soft">
          {v.label} · {personalizationSummary(p, line.personalization)}
        </p>
        <p className="text-sm">{v.inStock ? money(v.price) : <span className="text-brand">Out of stock</span>}</p>
        <div className="flex gap-4">
          <button type="button" disabled={!v.inStock} onClick={() => run(() => moveToCart(line.lineId))} className="text-sm font-semibold text-olive underline disabled:text-ink-soft disabled:no-underline">
            Move to cart
          </button>
          <button type="button" onClick={() => run(() => removeSaved(line.lineId))} className="text-sm text-ink-soft underline">
            Remove
          </button>
        </div>
        {error ? <p className="text-sm text-brand">{error}</p> : null}
      </div>
    </li>
  );
}

export default function CartPage() {
  const { cart } = useSections();
  const navigate = useNavigate();
  const [code, setCode] = useState(getPromo);
  const [codeInput, setCodeInput] = useState(getPromo);
  const q = quote(cart.items, { promoCode: code });

  return (
    <>
    <PageHeader eyebrow="Almost theirs" title="Your cart" crumbs={[{ label: "Cart" }]} />
    <div className="container-page py-10">
      {cart.items.length === 0 ? (
        <div className="card flex flex-col items-center p-12 text-center">
          <IconBadge size="lg" className="mb-5">
            <GiftIcon strokeWidth={1.5} />
          </IconBadge>
          <p className="font-display text-2xl">Nothing here yet</p>
          <p className="mt-2 text-ink-soft">Personalized gifts are waiting for you.</p>
          <Link to="/" className="btn-primary mt-6">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <ul className="divide-y divide-line card px-5">
            {cart.items.map((line) => (
              <LineItem key={line.lineId} line={line} lineTotal={q.lines.find((l) => l.lineId === line.lineId)?.lineTotal ?? 0} />
            ))}
          </ul>

          <aside className="h-fit space-y-4 card p-6 lg:sticky lg:top-32">
            <h2 className="font-display text-xl font-medium">Order summary</h2>
            <FreeShippingMeter subtotal={q.subtotal} />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Items ({q.count})</dt>
                <dd>{money(q.merchandise)}</dd>
              </div>
              {q.giftBags ? (
                <div className="flex justify-between">
                  <dt>Gift bags</dt>
                  <dd>{money(q.giftBags)}</dd>
                </div>
              ) : null}
              {q.promo ? (
                <div className="flex justify-between text-pine">
                  <dt>{q.promo.code}</dt>
                  <dd>−{money(q.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt>Personalization</dt>
                <dd>Free</dd>
              </div>
              <div className="flex justify-between">
                <dt>Standard shipping</dt>
                <dd>{q.shipping ? money(q.shipping) : "Free"}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
                <dt>Estimated total</dt>
                <dd>{money(q.total)}</dd>
              </div>
            </dl>
            {q.savings ? <p className="text-right text-xs text-pine">You're saving {money(q.savings + q.discount)} vs. regular prices</p> : null}

            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const next = codeInput.trim().toUpperCase();
                setCode(next);
                if (!quote(cart.items, { promoCode: next }).promoError) setPromo(next);
              }}
            >
              <label htmlFor="promo" className="text-sm font-medium">
                Promo code
              </label>
              <div className="flex gap-2">
                <input id="promo" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="e.g. WELCOME15" className="h-10 min-w-0 flex-1 rounded-[4px] border border-line px-4 text-sm uppercase focus:border-olive focus:outline-none" />
                <button type="submit" className="btn-outline h-10 px-4 py-0">
                  Apply
                </button>
              </div>
              {q.promoError ? <p className="text-sm text-brand">{q.promoError}</p> : null}
              {q.promo ? (
                <p className="flex justify-between text-sm text-pine">
                  {q.promo.label}
                  <button
                    type="button"
                    className="text-ink-soft underline"
                    onClick={() => {
                      setCode("");
                      setCodeInput("");
                      setPromo("");
                    }}
                  >
                    Remove
                  </button>
                </p>
              ) : null}
            </form>

            <button type="button" className="btn-primary w-full" onClick={() => navigate("/checkout")}>
              Checkout
            </button>
            <p className="text-center text-xs text-ink-soft">Taxes, if any, are calculated by the payment provider.</p>
          </aside>
        </div>
      )}

      {cart.saved.length ? (
        <section className="mt-12" aria-labelledby="saved-title">
          <h2 id="saved-title" className="mb-4 font-display text-2xl font-medium">
            Saved for later ({cart.saved.length})
          </h2>
          <ul className="divide-y divide-line card px-5">
            {cart.saved.map((l) => (
              <SavedItem key={l.lineId} line={l} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
    </>
  );
}
