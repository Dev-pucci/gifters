import { useEffect, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, type Address, type PaymentConfig, type PaymentMethodId } from "../api/client";
import IconBadge from "../components/IconBadge";
import { GiftIcon, ShieldIcon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { money } from "../components/ProductCard";
import { SHIPS_TO } from "../data/business";
import { getProductById } from "../data/catalog";
import { earliestArrival, formatDay } from "../lib/dates";
import { personalizationSummary } from "../lib/personalization";
import { normalizeKenyanPhone } from "../lib/phone";
import { formatKes, quote, SHIPPING_METHODS, toKes, type ShippingMethod } from "../lib/pricing";
import { useAuth } from "../state/auth";
import { getPromo } from "../state/promo";
import { useSections } from "../state/sections";

const COUNTRIES = SHIPS_TO;
const PENDING_KEY = "hg_pending_order";

const emptyAddress: Address = { name: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "Kenya", phone: "" };

function Field({ label, id, required, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
        {required ? "" : <span className="font-normal text-ink-soft"> (optional)</span>}
      </label>
      <input id={id} required={required} {...rest} className="h-11 w-full rounded-[4px] border border-line bg-white px-4 focus:border-olive focus:outline-none" />
    </div>
  );
}

export default function CheckoutPage() {
  const { cart, ready } = useSections();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<Address>(emptyAddress);
  // Fill in what we know about a signed-in customer (without overwriting anything typed).
  useEffect(() => {
    if (!user) return;
    setEmail((e) => e || user.email);
    setAddress((a) => (a.name ? a : { ...a, name: user.name }));
  }, [user]);
  const [method, setMethod] = useState<ShippingMethod>("standard");
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethodId | null>(null);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("canceled") ? "Payment was canceled. Your cart is still here." : null);
  const promoCode = getPromo();
  const q = quote(cart.items, { shippingMethod: method, promoCode });
  const leadDays = Math.max(0, ...cart.items.map((l) => getProductById(l.productId)?.leadDays ?? 2));

  useEffect(() => {
    api.paymentConfig().then(
      (c) => {
        setConfig(c);
        setPayMethod((m) => m ?? c.methods.find((x) => x.available)?.id ?? null);
      },
      (e) => setConfigError((e as Error).message),
    );
  }, []);

  if (ready && cart.items.length === 0) {
    return (
      <div className="container-page flex flex-col items-center py-16 text-center">
        <IconBadge size="lg" className="mb-5">
          <GiftIcon strokeWidth={1.5} />
        </IconBadge>
        <h1 className="font-display text-3xl font-medium">Your cart is empty</h1>
        <Link to="/" className="btn-primary mt-6">
          Keep shopping
        </Link>
      </div>
    );
  }

  const set = (k: keyof Address) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddress((a) => ({ ...a, [k]: e.target.value }));
  const kes = config ? toKes(q.total, config.mpesa.kesPerUsd) : 0;
  const phoneOk = !!normalizeKenyanPhone(mpesaPhone);
  const submitLabel = !payMethod
    ? "Choose a payment method"
    : payMethod === "mpesa"
      ? `Pay ${formatKes(kes)} with M-Pesa`
      : payMethod === "card"
        ? `Pay ${money(q.total)} with card`
        : "Place test order (no charge)";

  return (
    <>
    <PageHeader eyebrow="Secure checkout" title="Checkout" crumbs={[{ label: "Cart", to: "/cart" }, { label: "Checkout" }]} />
    <div className="container-page py-10">

      <form
        className="grid gap-8 lg:grid-cols-[1fr_400px]"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (!payMethod) return setError("Please choose a payment method.");
          if (payMethod === "mpesa" && !phoneOk) {
            setPhoneTouched(true);
            return setError("Enter the Safaricom number that will pay, e.g. 0712 345 678.");
          }
          setBusy(true);
          try {
            const res = await api.createOrder({
              email,
              address,
              shippingMethod: method,
              promoCode: q.promo?.code,
              paymentMethod: payMethod,
              mpesaPhone: payMethod === "mpesa" ? mpesaPhone : undefined,
              lines: cart.items.map(({ productId, variantKey, qty, giftBag, personalization }) => ({ productId, variantKey, qty, giftBag, personalization })),
            });
            try {
              localStorage.setItem(PENDING_KEY, res.orderId);
            } catch {
              /* ignore */
            }
            window.location.assign(res.redirectUrl);
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
      >
        <div className="space-y-8">
          <section className="space-y-4 card p-6" aria-labelledby="contact-h">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="contact-h" className="font-display text-xl font-medium">
                Contact
              </h2>
              {user ? (
                <p className="text-sm text-ink-soft">
                  Signed in as <strong className="text-ink">{user.email}</strong> — this order will appear in your account.
                </p>
              ) : (
                <p className="text-sm text-ink-soft">
                  Have an account?{" "}
                  <Link to="/sign-in?next=/checkout" className="font-medium text-olive underline-offset-2 hover:underline">
                    Sign in
                  </Link>
                </p>
              )}
            </div>
            <Field label="Email" id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <p className="text-xs text-ink-soft">We'll send your order confirmation and personalization proof here.</p>
          </section>

          <section className="space-y-4 card p-6" aria-labelledby="ship-h">
            <h2 id="ship-h" className="font-display text-xl font-medium">
              Shipping address
            </h2>
            <Field label="Full name" id="name" autoComplete="name" required value={address.name} onChange={set("name")} />
            <Field label="Address" id="line1" autoComplete="address-line1" required value={address.line1} onChange={set("line1")} />
            <Field label="Apartment, suite, etc." id="line2" autoComplete="address-line2" value={address.line2} onChange={set("line2")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City / Town" id="city" autoComplete="address-level2" required value={address.city} onChange={set("city")} />
              <Field label="County / State" id="region" autoComplete="address-level1" value={address.region} onChange={set("region")} />
              <Field label="Postal code" id="postal" autoComplete="postal-code" required value={address.postalCode} onChange={set("postalCode")} />
              <div>
                <label htmlFor="country" className="mb-1 block text-sm font-medium">
                  Country
                </label>
                <select id="country" autoComplete="country-name" value={address.country} onChange={set("country")} className="h-11 w-full rounded-[4px] border border-line bg-white px-3 focus:border-olive focus:outline-none">
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <Field label="Phone" id="phone" type="tel" autoComplete="tel" value={address.phone} onChange={set("phone")} />
          </section>

          <section className="space-y-3 card p-6" aria-labelledby="method-h">
            <h2 id="method-h" className="font-display text-xl font-medium">
              Delivery
            </h2>
            {(Object.keys(SHIPPING_METHODS) as ShippingMethod[]).map((m) => {
              const sm = SHIPPING_METHODS[m];
              const price = quote(cart.items, { shippingMethod: m, promoCode }).shipping;
              return (
                <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 ${method === m ? "border-olive" : "border-line"}`}>
                  <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} className="h-4 w-4 accent-[var(--color-olive)]" />
                  <span className="flex-1">
                    <span className="block font-semibold">
                      {sm.label} · {sm.detail}
                    </span>
                    <span className="text-sm text-ink-soft">Arrives by {formatDay(earliestArrival(leadDays, sm.transitDays))}</span>
                  </span>
                  <span className="font-semibold">{price ? money(price) : "Free"}</span>
                </label>
              );
            })}
          </section>

          <section className="space-y-4 card p-6" aria-labelledby="pay-h">
            <h2 id="pay-h" className="font-display text-xl font-medium">
              Payment
            </h2>
            {configError ? <p className="text-sm text-brand">{configError}</p> : null}
            {config ? (
              <>
                <div role="radiogroup" aria-label="Payment method" className="space-y-2">
                  {config.methods.map((m) => {
                    const on = payMethod === m.id;
                    return (
                      <div key={m.id} className={`rounded-md border ${on ? "border-olive" : "border-line"} ${m.available ? "" : "text-ink-soft"}`}>
                        <label className={`flex items-center justify-between gap-3 p-4 text-sm ${m.available ? "cursor-pointer" : "cursor-not-allowed"}`}>
                          <span className="flex items-center gap-3">
                            <input type="radio" name="pay" value={m.id} disabled={!m.available} checked={on} onChange={() => setPayMethod(m.id)} className="h-4 w-4 accent-[var(--color-olive)]" />
                            {m.id === "mpesa" ? <span className="rounded bg-[#00a651] px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-white">M-PESA</span> : null}
                            <span className="font-medium">{m.label}</span>
                          </span>
                          {m.note ? <span className="text-right text-xs">{m.note}</span> : null}
                        </label>

                        {on && m.id === "mpesa" ? (
                          <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
                            <div>
                              <label htmlFor="mpesa-phone" className="mb-1 block text-sm font-medium">
                                M-Pesa phone number
                              </label>
                              <input
                                id="mpesa-phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="0712 345 678"
                                value={mpesaPhone}
                                onChange={(e) => setMpesaPhone(e.target.value)}
                                onBlur={() => setPhoneTouched(true)}
                                aria-invalid={phoneTouched && !phoneOk}
                                aria-describedby="mpesa-help"
                                className={`h-11 w-full rounded-md border bg-white px-4 focus:outline-none ${phoneTouched && !phoneOk ? "border-brand" : "border-line focus:border-olive"}`}
                              />
                              {phoneTouched && !phoneOk ? <p className="mt-1 text-sm text-brand">Enter a Safaricom number like 0712 345 678 or +254 712 345 678.</p> : null}
                            </div>
                            <p id="mpesa-help" className="text-sm text-ink-soft">
                              You'll get a prompt on this phone to pay <strong className="text-ink">{formatKes(kes)}</strong> to Heartfelt Gifts. Enter your M-Pesa PIN to confirm.
                            </p>
                            <p className="text-xs text-ink-soft">
                              {money(q.total)} converted at KSh {config.mpesa.kesPerUsd} per US$1, rounded up to the nearest shilling.
                            </p>
                            {config.mpesa.mode === "simulated" ? (
                              <p className="rounded-md bg-[#fdf6e7] p-3 text-xs text-[#7a5a12]">
                                <strong>Simulator:</strong> Daraja keys aren't set, so no prompt is sent and no money moves. Any number succeeds after a few seconds; 0700000001 cancels, 0700000002 has low balance, 0700000003 enters a wrong PIN.
                              </p>
                            ) : config.mpesa.mode === "sandbox" ? (
                              <p className="rounded-md bg-[#fdf6e7] p-3 text-xs text-[#7a5a12]">
                                <strong>Daraja sandbox:</strong> use Safaricom's test number 254708374149. No real money moves.
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        {on && m.id === "card" ? (
                          <p className="flex items-center gap-2 border-t border-line px-4 pb-4 pt-3 text-sm text-ink-soft">
                            <ShieldIcon width={16} height={16} className="text-pine" /> You'll pay on Stripe's secure page. We never see your card details.
                          </p>
                        ) : null}
                        {on && m.id === "test" ? (
                          <p className="border-t border-line px-4 pb-4 pt-3 text-sm text-ink-soft">
                            Card payments aren't connected yet. This records a <strong>test order</strong> and nobody is charged.
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : !configError ? (
              <p className="text-sm text-ink-soft">Loading payment options…</p>
            ) : null}
          </section>
        </div>

        <aside className="h-fit space-y-4 card p-6 lg:sticky lg:top-32">
          <h2 className="font-display text-xl font-medium">Order summary</h2>
          <ul className="space-y-3 text-sm">
            {q.lines.map((l, i) => {
              const p = getProductById(l.productId)!;
              return (
                <li key={l.lineId ?? i} className="flex justify-between gap-4">
                  <span>
                    <span className="font-medium">
                      {l.qty} × {l.name}
                    </span>
                    <span className="block text-ink-soft">{l.variantLabel}</span>
                    <span className="block text-ink-soft">{personalizationSummary(p, cart.items[i].personalization)}</span>
                    {l.giftBag ? <span className="block text-pine">+ Gift bag</span> : null}
                  </span>
                  <span className="font-medium">{money(l.lineTotal)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{money(q.subtotal)}</dd>
            </div>
            {q.promo ? (
              <div className="flex justify-between text-pine">
                <dt>{q.promo.code}</dt>
                <dd>−{money(q.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>{q.shipping ? money(q.shipping) : "Free"}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd>{money(q.total)}</dd>
            </div>
            {payMethod === "mpesa" && config ? (
              <div className="flex justify-between text-pine">
                <dt>Pay with M-Pesa</dt>
                <dd className="font-semibold">{formatKes(kes)}</dd>
              </div>
            ) : null}
          </dl>
          {error ? (
            <p role="alert" className="rounded-md bg-brand-soft p-3 text-sm text-brand-dark">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy || !config || !payMethod} className="btn-primary w-full">
            {busy ? (payMethod === "mpesa" ? "Sending M-Pesa prompt…" : "Placing order…") : submitLabel}
          </button>
          <p className="text-center text-xs text-ink-soft">Prices are confirmed by our server before payment.</p>
        </aside>
      </form>
    </div>
    </>
  );
}
