import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, type MpesaPayment, type Order } from "../api/client";
import { PhoneIcon } from "../components/Icons";
import { money } from "../components/ProductCard";
import { normalizeKenyanPhone } from "../lib/phone";
import { formatKes, SHIPPING_METHODS } from "../lib/pricing";
import { useSections } from "../state/sections";

const PENDING_KEY = "hg_pending_order";

const statusCopy: Record<Order["status"], { title: string; text: string; tone: string }> = {
  paid: { title: "Thank you — your order is confirmed!", text: "Payment received. We'll email your personalization proof shortly.", tone: "bg-pine-soft text-pine" },
  test_order: { title: "Test order placed", text: "Nobody was charged. This is how the confirmation will look with real payments.", tone: "bg-[#fdf6e7] text-[#7a5a12]" },
  awaiting_payment: { title: "Waiting for payment", text: "We haven't received payment confirmation yet. If you just paid, this page will update in a moment.", tone: "bg-sage-soft text-ink" },
  payment_failed: { title: "Payment didn't go through", text: "Your cart is still saved — please try again.", tone: "bg-brand-soft text-brand-dark" },
};

const isMpesa = (o: Order): o is Order & { payment: MpesaPayment } => o.payment?.method === "mpesa";

function useElapsed(active: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!active) return;
    setS(0);
    const t = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  return s;
}

function MpesaPanel({ order, onUpdate }: { order: Order & { payment: MpesaPayment }; onUpdate: (o: Order) => void }) {
  const p = order.payment;
  const waiting = order.status === "awaiting_payment";
  const elapsed = useElapsed(waiting);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retry = async (newPhone?: string) => {
    setError(null);
    if (newPhone && !normalizeKenyanPhone(newPhone)) return setError("Enter a Safaricom number like 0712 345 678.");
    setBusy(true);
    try {
      onUpdate(await api.retryMpesa(order.id, newPhone || undefined));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (order.status === "paid" || order.status === "test_order") {
    return (
      <div className="mt-6 flex items-center gap-4 card p-6">
        <span className="rounded bg-[#00a651] px-2 py-1 text-xs font-bold tracking-wide text-white">M-PESA</span>
        <div className="text-sm">
          <p className="font-semibold">
            {formatKes(p.amountKes)} paid{p.mode === "simulated" ? " (simulated)" : ""} from {p.phoneMasked}
          </p>
          {p.receipt ? (
            <p className="text-ink-soft">
              M-Pesa receipt <strong className="font-mono text-ink">{p.receipt}</strong>
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (waiting) {
    return (
      <div className="mt-6 rounded-md border-2 border-[#00a651] bg-white p-6" role="status" aria-live="polite">
        <div className="flex items-center gap-4">
          <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-md bg-[#e6f6ed] text-[#00a651]" aria-hidden>
            <PhoneIcon width={28} height={28} />
            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-[#00a651]" />
          </span>
          <div>
            <h2 className="font-display text-2xl font-medium">Check your phone</h2>
            <p className="text-sm text-ink-soft">
              We sent an M-Pesa prompt to <strong className="text-ink">{p.phoneMasked}</strong> for <strong className="text-ink">{formatKes(p.amountKes)}</strong>.
            </p>
          </div>
        </div>
        <ol className="mt-5 space-y-2 text-sm">
          <li>1. Unlock your phone — the prompt says “Do you want to pay {formatKes(p.amountKes)} to Heartfelt Gifts?”</li>
          <li>2. Enter your M-Pesa PIN and press OK.</li>
          <li>3. Keep this page open. It updates by itself as soon as Safaricom confirms.</li>
        </ol>
        {p.mode === "simulated" ? <p className="mt-4 rounded-md bg-[#fdf6e7] p-3 text-xs text-[#7a5a12]">Simulator: no prompt is actually sent. The result arrives in a few seconds.</p> : null}
        <p className="mt-4 text-xs text-ink-soft">Waiting {elapsed}s…</p>
        {elapsed >= 60 ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span>Didn't get the prompt?</span>
            <button type="button" disabled={busy} onClick={() => retry()} className="btn-outline h-10 px-4 py-0">
              {busy ? "Sending…" : "Send it again"}
            </button>
          </div>
        ) : null}
        {error ? <p className="mt-2 text-sm text-brand">{error}</p> : null}
      </div>
    );
  }

  // payment_failed
  return (
    <div className="mt-6 card p-6">
      <h2 className="font-display text-xl font-medium">{p.failureReason ?? "The M-Pesa payment didn't go through."}</h2>
      <p className="mt-1 text-sm text-ink-soft">No money was taken. You can send a new prompt to {p.phoneMasked} or use another number.</p>
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          retry(phone.trim() || undefined);
        }}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="retry-phone" className="mb-1 block text-sm font-medium">
            Phone number <span className="font-normal text-ink-soft">(leave blank to reuse {p.phoneMasked})</span>
          </label>
          <input id="retry-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className="h-11 w-full rounded-md border border-line px-4 focus:border-olive focus:outline-none" />
        </div>
        <button type="submit" disabled={busy} className="btn-primary h-11">
          {busy ? "Sending…" : `Pay ${formatKes(p.amountKes)} with M-Pesa`}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-brand">{error}</p> : null}
      <p className="mt-4 text-sm">
        <Link to="/cart" className="underline">
          Back to cart
        </Link>
      </p>
    </div>
  );
}

export default function OrderPage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const { clearCart } = useSections();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionId = params.get("session_id") ?? undefined;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tries = useRef(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api.getOrder(id, sessionId).then(
        (o) => {
          if (!alive) return;
          setOrder(o);
          // M-Pesa: poll every 3 s for up to ~4 min (the server gives up after 3). Stripe: a few quick retries.
          const max = isMpesa(o) ? 80 : 5;
          if (o.status === "awaiting_payment" && tries.current++ < max) timer.current = setTimeout(load, isMpesa(o) ? 3000 : 2000);
        },
        (e) => alive && setError((e as Error).message),
      );
    tries.current = 0;
    load();
    return () => {
      alive = false;
      clearTimeout(timer.current);
    };
  }, [id, sessionId, order?.payment && isMpesa(order) ? order.payment.attempts : 0]);

  // Empty the cart once, when the order that this browser just placed is confirmed.
  useEffect(() => {
    if (!order || (order.status !== "paid" && order.status !== "test_order")) return;
    try {
      if (localStorage.getItem(PENDING_KEY) === order.id) {
        localStorage.removeItem(PENDING_KEY);
        clearCart();
      }
    } catch {
      /* ignore */
    }
  }, [order, clearCart]);

  if (error) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-3xl font-medium">We couldn't load that order</h1>
        <p className="mt-2 text-ink-soft">{error}</p>
        <Link to="/" className="btn-primary mt-6">
          Back to the shop
        </Link>
      </div>
    );
  }
  if (!order) return <p className="container-page py-16 text-center text-ink-soft">Loading your order…</p>;

  const mpesa = isMpesa(order);
  const s = statusCopy[order.status];
  const headline =
    mpesa && order.status === "test_order"
      ? { ...s, title: "Order placed (simulated M-Pesa)", text: "The M-Pesa simulator approved the payment — no money moved. Add Daraja keys to take real payments." }
      : mpesa && order.status === "awaiting_payment"
        ? { ...s, title: "Almost done — approve the payment on your phone", text: `Order ${order.id} is reserved while we wait for M-Pesa.` }
        : mpesa && order.status === "payment_failed"
          ? { ...s, text: "No money was taken. Your order is saved — try again below." }
          : s;

  return (
    <div className="container-page max-w-3xl py-10">
      <div className={`rounded-md p-6 ${headline.tone}`} role="status">
        <h1 className="font-display text-3xl font-medium">{headline.title}</h1>
        <p className="mt-2">{headline.text}</p>
      </div>

      {mpesa ? <MpesaPanel order={order} onUpdate={setOrder} /> : null}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="card p-6 text-sm">
          <p className="text-ink-soft">Order number</p>
          <p className="font-display text-2xl font-medium tracking-wide">{order.id}</p>
          <p className="mt-3 text-ink-soft">Confirmation sent to</p>
          <p>{order.email}</p>
        </div>
        <div className="card p-6 text-sm">
          <p className="text-ink-soft">Shipping to · {SHIPPING_METHODS[order.totals.shippingMethod].label}</p>
          <address className="not-italic">
            {order.address.name}
            <br />
            {order.address.line1}
            {order.address.line2 ? (
              <>
                <br />
                {order.address.line2}
              </>
            ) : null}
            <br />
            {order.address.city}
            {order.address.region ? `, ${order.address.region}` : ""} {order.address.postalCode}
            <br />
            {order.address.country}
          </address>
        </div>
      </div>
      <div className="mt-6 card p-6">
        <ul className="divide-y divide-line text-sm">
          {order.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-4 py-3">
              <span>
                <span className="font-semibold">
                  {l.qty} × {l.name}
                </span>
                <span className="block text-ink-soft">
                  {l.variantLabel} · SKU {l.sku}
                </span>
                <span className="block text-ink-soft">{l.summary}</span>
                {l.giftBag ? <span className="block text-pine">+ Gift bag</span> : null}
              </span>
              <span className="font-medium">{money(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{money(order.totals.subtotal)}</dd>
          </div>
          {order.totals.discount ? (
            <div className="flex justify-between text-pine">
              <dt>{order.totals.promoCode}</dt>
              <dd>−{money(order.totals.discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{order.totals.shipping ? money(order.totals.shipping) : "Free"}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd>{money(order.totals.total)}</dd>
          </div>
          {mpesa ? (
            <div className="flex justify-between text-pine">
              <dt>Charged via M-Pesa</dt>
              <dd className="font-semibold">{formatKes(order.payment.amountKes)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className="mt-8 text-center">
        <Link to="/" className="btn-primary">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
