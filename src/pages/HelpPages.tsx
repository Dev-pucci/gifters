import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, type Order } from "../api/client";
import { ChatIcon, CheckIcon, GiftIcon, PenIcon, ShieldIcon, TruckIcon } from "../components/Icons";
import ProductArt from "../components/ProductArt";
import { productImage } from "../data/images";
import InfoPage from "../components/InfoPage";
import { money } from "../components/ProductCard";
import { business } from "../data/business";
import { getProductById, products } from "../data/catalog";
import { addBusinessDays, formatDay } from "../lib/dates";
import { FREE_SHIP_AT, GIFT_BAG_PRICE, SHIPPING_METHODS } from "../lib/pricing";

const leadRange = (() => {
  const d = products.map((p) => p.leadDays);
  return [Math.min(...d), Math.max(...d)] as const;
})();

const inputCls = "h-11 w-full rounded-[4px] border border-line bg-white px-4 focus:border-olive focus:outline-none";

// ================================================================ Contact

const TOPICS = ["An order I placed", "Personalization question", "Payment or M-Pesa", "Shipping & delivery", "Returns or a problem with my gift", "Something else"];

export function ContactPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", topic: params.get("topic") ?? TOPICS[0], orderId: params.get("order") ?? "", message: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api.contact(form);
      setTicket(r.ticket);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <InfoPage title="Contact Us" intro={<>We're real people who love a good gift. Send us a message and we'll reply {business.responseTime}.</>}>
      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
        {ticket ? (
          <div className="rounded-md bg-pine-soft p-8 text-pine" role="status">
            <h2 className="font-display text-2xl font-medium">Message sent — thank you!</h2>
            <p className="mt-2">
              Your reference is <strong className="font-mono">{ticket}</strong>. We'll reply to {form.email} {business.responseTime}.
            </p>
            <Link to="/" className="btn-primary mt-6">
              Back to the shop
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 card p-6 sm:p-8" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="c-name" className="mb-1 block text-sm font-medium">
                  Your name
                </label>
                <input id="c-name" autoComplete="name" required value={form.name} onChange={set("name")} className={inputCls} />
              </div>
              <div>
                <label htmlFor="c-email" className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <input id="c-email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} className={inputCls} />
              </div>
              <div>
                <label htmlFor="c-topic" className="mb-1 block text-sm font-medium">
                  What's it about?
                </label>
                <select id="c-topic" value={form.topic} onChange={set("topic")} className={inputCls}>
                  {TOPICS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="c-order" className="mb-1 block text-sm font-medium">
                  Order number <span className="font-normal text-ink-soft">(optional)</span>
                </label>
                <input id="c-order" value={form.orderId} onChange={set("orderId")} placeholder="HG…" className={`${inputCls} uppercase`} />
              </div>
            </div>
            <div>
              <label htmlFor="c-msg" className="mb-1 flex justify-between text-sm font-medium">
                <span>Message</span>
                <span className="font-normal text-ink-soft">{2000 - form.message.length} characters left</span>
              </label>
              <textarea id="c-msg" rows={6} maxLength={2000} required value={form.message} onChange={set("message")} className="w-full rounded-[4px] border border-line bg-white px-4 py-3 focus:border-olive focus:outline-none" />
            </div>
            {/* Honeypot: hidden from people, filled in by bots. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
              <label htmlFor="c-website">Website</label>
              <input id="c-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
            </div>
            {error ? (
              <p role="alert" className="rounded-md bg-brand-soft p-3 text-sm text-brand-dark">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Sending…" : "Send message"}
            </button>
          </form>
        )}

        <aside className="space-y-4">
          <ContactCard icon={<ChatIcon />} title="WhatsApp or call">
            <a href={`https://wa.me/${business.whatsapp}`} className="font-medium text-olive underline">
              {business.phone}
            </a>
            <p className="text-ink-soft">{business.hours}</p>
          </ContactCard>
          <ContactCard icon={<GiftIcon />} title="Email">
            <a href={`mailto:${business.email}`} className="font-medium text-olive underline">
              {business.email}
            </a>
          </ContactCard>
          <ContactCard icon={<TruckIcon />} title="Where's my order?">
            <Link to="/track-order" className="font-medium text-olive underline">
              Track your order
            </Link>
            <p className="text-ink-soft">Your order number and email are all you need.</p>
          </ContactCard>
          <ContactCard icon={<PenIcon />} title="Quick answers">
            <Link to="/faq" className="font-medium text-olive underline">
              Browse the FAQs
            </Link>
          </ContactCard>
        </aside>
      </div>
    </InfoPage>
  );
}

function ContactCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 card p-5 text-sm">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-soft text-olive">{icon}</span>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {children}
      </div>
    </div>
  );
}

// ================================================================ FAQ

const std = SHIPPING_METHODS.standard;
const exp = SHIPPING_METHODS.express;

const FAQ: { group: string; items: { q: string; a: ReactNode }[] }[] = [
  {
    group: "Personalization",
    items: [
      { q: "Is personalization really free?", a: "Yes. Names, initials, messages, photos and color choices never cost extra — the price you see is the price you pay." },
      { q: "What characters can I use?", a: "Name fields accept letters, spaces and - ' , . &. Message fields accept almost anything except < > { }. Each field shows how many characters you have left, and we'll tell you right away if something isn't allowed." },
      { q: "Will my gift look exactly like the preview?", a: "The preview shows your text and colors so you can check spelling and placement. The finished item is made by hand, so exact position and size can vary slightly." },
      { q: "Can I change my personalization after adding to cart?", a: (<>Yes — tap <strong>Edit</strong> next to the item in your cart. Once you've paid, contact us within {business.changeWindowHours} hours and we'll update it if it hasn't gone into production.</>) },
      { q: "What photo should I upload?", a: (<>A sharp, well-lit JPG, PNG or WebP up to 10 MB. Photos at least 1500 pixels wide print best. See <Link to="/how-to-personalize">How to Personalize</Link> for tips.</>) },
    ],
  },
  {
    group: "Payment",
    items: [
      { q: "How do I pay with M-Pesa?", a: "Choose M-Pesa at checkout and enter your Safaricom number. You'll get a prompt on your phone — enter your M-Pesa PIN to confirm. The order page updates by itself as soon as Safaricom confirms." },
      { q: "Why is the M-Pesa amount in shillings?", a: "Our prices are listed in US dollars; M-Pesa charges in Kenyan shillings. Checkout shows the exact KSh amount and the rate used before you pay, rounded up to the nearest shilling." },
      { q: "My M-Pesa payment failed. Was I charged?", a: "No — if the order page says the payment didn't go through, no money was taken. You can send a new prompt from that page to the same or another number." },
      { q: "Can I pay by card?", a: "Card, Apple Pay and Google Pay are processed on Stripe's secure checkout page when enabled — we never see your card details." },
      { q: "Do you have promo codes?", a: "Sign up for our emails in the footer for a welcome offer. Enter codes in your cart; only one code can be used per order." },
    ],
  },
  {
    group: "Shipping",
    items: [
      { q: "How long will my order take?", a: (<>Each gift is made to order in {leadRange[0]}–{leadRange[1]} business days, then ships {std.detail} (Standard) or {exp.detail} (Express). Every product page shows the earliest arrival date.</>) },
      { q: "How much is shipping?", a: (<>Standard shipping is {money(std.price)}, or free on orders of {money(FREE_SHIP_AT)} or more. Express is {money(exp.price)}.</>) },
      { q: "Where do you ship?", a: (<>See the full list on our <Link to="/shipping-returns">Shipping & Returns</Link> page.</>) },
      { q: "How do I track my order?", a: (<>Use <Link to="/track-order">Order Tracking</Link> with your order number and email.</>) },
    ],
  },
  {
    group: "Returns & problems",
    items: [
      { q: "What if something is wrong with my gift?", a: (<>Our Love-It Guarantee has you covered: tell us within {business.guaranteeDays} days of delivery and we'll remake it or refund you. <Link to="/shipping-returns">Read the details</Link>.</>) },
      { q: "Can I return a personalized item I changed my mind about?", a: "Because each item is made just for you, we can't resell it, so we don't accept change-of-mind returns. If we made a mistake or it arrived damaged, we'll make it right." },
      { q: "Can I cancel my order?", a: `Contact us within ${business.changeWindowHours} hours of paying. If production hasn't started, we'll cancel and refund you in full.` },
    ],
  },
  {
    group: "Gift wrap & extras",
    items: [
      { q: "Do you offer gift wrapping?", a: `Yes — tick "Add a gift bag" on any item in your cart for ${money(GIFT_BAG_PRICE)} each.` },
      { q: "Do I need an account?", a: "No. Your cart and favorites are saved on your device, and you can check out as a guest." },
    ],
  },
];

export function FaqPage() {
  return (
    <InfoPage title="Frequently Asked Questions" intro="Quick answers about personalizing, paying, shipping and returns.">
      <div className="space-y-10">
        {FAQ.map((g) => (
          <section key={g.group} aria-labelledby={`faq-${g.group}`}>
            <h2 id={`faq-${g.group}`} className="mb-3 font-display text-2xl font-medium">
              {g.group}
            </h2>
            <div className="divide-y divide-line card">
              {g.items.map((it) => (
                <details key={it.q} className="group px-5 [&_a]:font-medium [&_a]:text-olive [&_a]:underline">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                    {it.q}
                    <span aria-hidden className="text-xl text-ink-soft transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="pb-5 text-ink-soft">{it.a}</div>
                </details>
              ))}
            </div>
          </section>
        ))}
        <p className="rounded-md bg-sage-soft p-5 text-sm">
          Still stuck?{" "}
          <Link to="/contact" className="font-semibold text-olive underline">
            Contact us
          </Link>{" "}
          — we reply {business.responseTime}.
        </p>
      </div>
    </InfoPage>
  );
}

// ================================================================ How to personalize

const STEPS = [
  { title: "Choose your options", text: "Pick a size, color or set. Every combination shows its own price, and anything out of stock is greyed out." },
  { title: "Tap Personalize", text: "The personalization form opens. Fields marked * are required." },
  { title: "Add your details", text: "Type names or messages, pick an initial or a color, or upload a photo. The preview updates as you go." },
  { title: "Check, then add to cart", text: "Double-check spelling — we print exactly what you type. You can still edit from your cart." },
];

export function HowToPersonalizePage() {
  const examples = ["family-name-stocking", "photo-color-mug", "embroidered-initial-cap", "family-wreath-ornament"].map((s) => products.find((p) => p.slug === s)!);
  return (
    <InfoPage title="How to Personalize" intro="Making a gift that's truly theirs takes about a minute. Here's how it works — and how to get the best result.">
      <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card p-5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-olive font-display text-lg font-medium text-white">{i + 1}</span>
            <h2 className="mt-3 font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Tip title="Names & messages">
          <li>Letters, spaces and - ' , . & are allowed in names; each field shows how many characters you have left.</li>
          <li>We print exactly what you type, including capital letters — check spelling twice.</li>
          <li>Short is sweet: shorter text prints larger and reads better.</li>
          <li>For family pieces, try “The Okafors” or a list like “Amara, Kofi, Zara”.</li>
        </Tip>
        <Tip title="Photos">
          <li>Use a sharp, well-lit photo — at least 1500 pixels wide prints best.</li>
          <li>JPG, PNG or WebP, up to 10 MB.</li>
          <li>Keep faces away from the edges; some items are cropped slightly.</li>
          <li>Screenshots and heavily filtered photos can print blurry.</li>
        </Tip>
        <Tip title="Initials & monograms">
          <li>Tap a letter on the A–Z picker. Traditionally the last-name initial is used for couples and families.</li>
        </Tip>
        <Tip title="Colors">
          <li>Thread and name colors are shown as swatches; the preview text changes to match.</li>
          <li>Screens vary, so the finished color may look slightly different.</li>
        </Tip>
      </div>

      <div className="mt-10 rounded-md bg-sage-soft p-6">
        <h2 className="font-display text-2xl font-medium">Try it on a favorite</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {examples.map((p) => (
            <li key={p.id}>
              <Link to={`/p/${p.slug}`} className="flex items-center gap-3 rounded-md bg-white p-3 hover:shadow">
                <span className="w-14 shrink-0 overflow-hidden rounded-md" aria-hidden>
                  <ProductArt art={p.art} image={productImage(p.slug)} size="sm" />
                </span>
                <span>
                  <span className="block font-semibold">{p.name}</span>
                  <span className="text-sm text-ink-soft">Personalize with: {p.fields.map((f) => f.label.toLowerCase()).join(", ")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </InfoPage>
  );
}

function Tip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="font-display text-xl font-medium">{title}</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">{children}</ul>
    </section>
  );
}

// ================================================================ Order tracking

type Step = { label: string; detail: string; state: "done" | "current" | "upcoming" | "problem" };

function timeline(o: Order): Step[] {
  const placed = new Date(o.createdAt);
  const lead = Math.max(2, ...o.lines.map((l) => getProductById(l.productId)?.leadDays ?? 2));
  const transit = SHIPPING_METHODS[o.totals.shippingMethod].transitDays;
  const shipBy = addBusinessDays(placed, lead);
  const arrive = addBusinessDays(placed, lead + transit);
  const paid = o.status === "paid" || o.status === "test_order";
  const now = new Date();
  const making = paid && now < shipBy;
  return [
    { label: "Order placed", detail: placed.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }), state: "done" },
    {
      label: "Payment",
      detail: o.status === "paid" ? "Received" : o.status === "test_order" ? "Test order — no charge" : o.status === "payment_failed" ? "Didn't go through" : "Waiting for payment",
      state: paid ? "done" : o.status === "payment_failed" ? "problem" : "current",
    },
    { label: "Being personalized", detail: `Made to order — ships by ${formatDay(shipBy)}`, state: !paid ? "upcoming" : making ? "current" : "done" },
    { label: "Delivered", detail: `Estimated ${formatDay(arrive)} (${SHIPPING_METHODS[o.totals.shippingMethod].label})`, state: paid && !making ? "current" : "upcoming" },
  ];
}

export function TrackOrderPage() {
  const [params] = useSearchParams();
  const [orderId, setOrderId] = useState(params.get("order") ?? "");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setOrder(null);
    setBusy(true);
    try {
      setOrder(await api.lookupOrder(orderId.trim().toUpperCase(), email.trim()));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <InfoPage title="Order Tracking" intro="Enter your order number and the email you used at checkout.">
      <form onSubmit={submit} className="grid max-w-2xl gap-4 card p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="t-order" className="mb-1 block text-sm font-medium">
            Order number
          </label>
          <input id="t-order" required value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="HG…" className={`${inputCls} uppercase`} />
        </div>
        <div>
          <label htmlFor="t-email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input id="t-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <button type="submit" disabled={busy} className="btn-primary h-11">
          {busy ? "Looking…" : "Track"}
        </button>
      </form>
      <p className="mt-3 text-sm text-ink-soft">Your order number starts with “HG” and is in your confirmation email.</p>

      {error ? (
        <p role="alert" className="mt-6 max-w-2xl rounded-md bg-brand-soft p-4 text-sm text-brand-dark">
          {error}
        </p>
      ) : null}

      {order ? (
        <section className="mt-8 max-w-2xl card p-6" aria-labelledby="track-h">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="track-h" className="font-display text-2xl font-medium">
              Order {order.id}
            </h2>
            <Link to={`/order/${order.id}`} className="text-sm font-semibold text-olive underline">
              View full order
            </Link>
          </div>
          <ol className="mt-6 space-y-0">
            {timeline(order).map((s, i, all) => (
              <li key={s.label} className="relative flex gap-4 pb-6 last:pb-0">
                {i < all.length - 1 ? <span aria-hidden className={`absolute left-[11px] top-6 h-full w-0.5 ${s.state === "done" ? "bg-pine" : "bg-line"}`} /> : null}
                <span
                  aria-hidden
                  className={`relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${
                    s.state === "done" ? "bg-pine" : s.state === "current" ? "bg-gold ring-4 ring-gold/25" : s.state === "problem" ? "bg-brand" : "bg-line"
                  }`}
                >
                  {s.state === "done" ? <CheckIcon width={14} height={14} strokeWidth={3} /> : s.state === "problem" ? "!" : ""}
                </span>
                <div>
                  <p className={`font-semibold ${s.state === "upcoming" ? "text-ink-soft" : ""}`}>
                    {s.label}
                    <span className="sr-only"> — {s.state}</span>
                  </p>
                  <p className="text-sm text-ink-soft">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 flex items-start gap-2 rounded-md bg-cream p-3 text-xs text-ink-soft">
            <ShieldIcon width={16} height={16} className="mt-0.5 shrink-0" /> Dates are estimates based on production and shipping times. We'll email you tracking details when your order ships.
          </p>
          <p className="mt-4 text-sm">
            {order.lines.reduce((n, l) => n + l.qty, 0)} item(s) · {money(order.totals.total)} ·{" "}
            <Link to={`/contact?order=${order.id}&topic=${encodeURIComponent(TOPICS[0])}`} className="text-olive underline">
              Ask about this order
            </Link>
          </p>
        </section>
      ) : null}
    </InfoPage>
  );
}
