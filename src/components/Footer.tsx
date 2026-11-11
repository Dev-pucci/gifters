import { useState } from "react";
import { Link } from "react-router-dom";
import { useSections } from "../state/sections";

export function TrustRow() {
  const items = [
    { icon: "personalize", title: "Free Personalization", text: "We perfectly personalize each and every gift and home décor item, for free." },
    { icon: "quality", title: "Commitment to Quality", text: "We’re committed to high standards for our products and service." },
    { icon: "gift", title: "Perfect Gift Guarantee", text: "We want you to love your gift. If something isn’t right, contact us." },
  ];
  return (
    <section aria-labelledby="promise-title" className="border-t border-line bg-linen text-olive">
      <div className="container-page max-w-6xl py-10 sm:py-12">
        <h2 id="promise-title" className="mb-7 text-center font-display text-xl font-semibold text-ink sm:text-2xl">Our Promise to You</h2>
        <div className="grid gap-9 sm:grid-cols-3 sm:gap-6">
          {items.map(({ icon, title, text }) => (
            <div key={title} className="flex flex-col items-center px-3 text-center">
              <span className="mb-3 grid h-14 w-14 place-items-center text-olive">
                {icon === "personalize" ? (
                  <svg aria-hidden="true" viewBox="0 0 64 64" fill="none" className="h-14 w-14" stroke="currentColor" strokeWidth="2.5"><circle cx="32" cy="32" r="28"/><circle cx="32" cy="32" r="23"/><text x="32" y="43" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="Georgia,serif" fontWeight="700" fontSize="34">M</text></svg>
                ) : icon === "quality" ? (
                  <svg aria-hidden="true" viewBox="0 0 64 64" fill="none" className="h-14 w-14" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"><path d="M32 4c6 0 9 6 14 7s11 2 12 8-3 10-2 15 4 10 0 14-10 3-14 6-6 8-12 8-9-6-14-7-11-2-12-8 3-10 2-15-4-10 0-14 10-3 14-6 6-8 12-8z"/><circle cx="32" cy="29" r="14"/><path d="m32 19 3 7h7l-6 4 2 8-6-5-6 5 2-8-6-4h8zM22 47l-7 13 12-4 5 7 4-12m8-5 7 14-12-4-5 7"/></svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 64 64" fill="none" className="h-14 w-14" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"><path d="M8 25h48v33H8zM5 19h54v9H5zM32 19v39M32 19H18c-9 0-8-12-1-12 8 0 15 12 15 12zm0 0h14c9 0 8-12 1-12-8 0-15 12-15 12zM4 10l-2-3m9-5V0m43 11 3-4m-9-5V0"/></svg>
                )}
              </span>
              <h3 className="font-display text-lg font-semibold text-olive sm:text-xl">{title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink sm:text-base">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Newsletter() {
  const { customer, subscribe } = useSections();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (customer.subscribed) return <p className="rounded-lg border border-olive/30 bg-white px-4 py-3 text-sm">You’re on the list. Watch your inbox for savings and gift ideas.</p>;

  return (
    <form noValidate onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      try { await subscribe(email); }
      catch (err) { setError((err as Error).message); }
      finally { setBusy(false); }
    }}>
      <label htmlFor="newsletter-email" className="mb-3 block text-sm font-semibold text-ink">Sign Up for Email Savings</label>
      <div className="flex max-w-lg">
        <input id="newsletter-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-invalid={!!error} aria-describedby={error ? "newsletter-error" : undefined} className="h-11 min-w-0 flex-1 rounded-l-md border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-olive focus:outline-none" />
        <button type="submit" disabled={busy} className="h-11 rounded-r-md bg-olive px-4 text-xs font-semibold uppercase tracking-wide text-white hover:bg-olive-dark disabled:opacity-60">{busy ? "…" : "Submit"}</button>
      </div>
      {error ? <p id="newsletter-error" className="mt-2 text-sm text-brand">{error}</p> : null}
    </form>
  );
}

const cols = [
  { title: "Our Company", links: [["About Us", "/about"], ["Shipping & Returns", "/shipping-returns"], ["Terms of Use", "/terms"], ["Privacy Policy", "/privacy"]] },
  { title: "Help", links: [["Contact Us", "/contact"], ["Frequently Asked Questions", "/faq"], ["How to Order", "/how-to-personalize"], ["Home", "/"]] },
  { title: "Info", links: [["My Account", "/account"], ["Order Tracking", "/track-order"], ["Shipping, Returns & Fees", "/shipping-returns"], ["My Privacy Choices", "/privacy"]] },
] as const;

export default function Footer() {
  return (
    <>
      <TrustRow />
      <footer className="bg-sage-soft text-ink">
        <div className="container-page max-w-6xl grid gap-9 py-9 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.7fr] lg:gap-12 lg:py-10">
          {cols.map((c) => (
            <div key={c.title}>
              <h2 className="mb-4 text-sm font-bold text-ink">{c.title}</h2>
              <ul className="space-y-2.5">
                {c.links.map(([label, to]) => <li key={label}><Link to={to} className="text-sm text-olive hover:text-olive-dark hover:underline">{label}</Link></li>)}
              </ul>
            </div>
          ))}
          <div>
            <Newsletter />
            <div className="mt-5">
              <h2 className="text-sm font-bold text-ink">Stay Connected</h2>
              <p className="mt-2 text-sm text-ink-soft">Follow Heartfelt Gifts on social media</p>
              <div className="mt-2 flex gap-2" aria-hidden="true">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-olive text-lg font-bold leading-none text-white">f</span>
                <span className="grid h-7 w-7 place-items-center rounded-md bg-olive text-white"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1" fill="currentColor" stroke="none"/></svg></span>
              </div>
            </div>
          </div>
        </div>
        <div className="container-page pb-8 pt-2 text-center text-[11px] leading-relaxed text-ink-soft">
          <p className="mb-5">© {new Date().getFullYear()} Heartfelt Gifts. All Rights Reserved.</p>
          <p className="mx-auto max-w-4xl">Comparable value prices reflect the regular price before promotions. Promotions and estimated delivery dates may vary. Product colors and personalization previews may appear differently on your screen.</p>
          <p className="mx-auto mt-3 max-w-4xl">We’re committed to making our website accessible. If you need assistance, please contact our customer service team.</p>
          <p className="mx-auto mt-3 max-w-4xl">Please contact us with any questions about your order, our products, or these policies.</p>
        </div>
      </footer>
    </>
  );
}
