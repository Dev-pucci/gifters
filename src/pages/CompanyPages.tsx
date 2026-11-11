import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { GiftIcon, HeartIcon, PenIcon, ShieldIcon, TruckIcon } from "../components/Icons";
import ProductArt from "../components/ProductArt";
import { productImage } from "../data/images";
import InfoPage, { Section } from "../components/InfoPage";
import { money } from "../components/ProductCard";
import { business, SHIPS_TO } from "../data/business";
import { products } from "../data/catalog";
import { FREE_SHIP_AT, GIFT_BAG_PRICE, SHIPPING_METHODS } from "../lib/pricing";

const leadRange = (() => {
  const d = products.map((p) => p.leadDays);
  return [Math.min(...d), Math.max(...d)] as const;
})();

/** Shown only while developing (never to shoppers): legal pages are a starting point, not legal advice. */
function DraftNotice() {
  if (!import.meta.env.DEV) return null;
  return (
    <p className="mb-8 rounded-md border border-gold/50 bg-[#fdf6e7] p-4 text-sm text-[#7a5a12]">
      <strong>Draft (visible in development only):</strong> fill in your business details in <code>src/data/business.ts</code> and have this page reviewed by a lawyer before launch.
    </p>
  );
}

// ================================================================ About

export function AboutPage() {
  const values: { icon: ReactNode; title: string; text: string }[] = [
    { icon: <PenIcon />, title: "Personal, for free", text: "Names, photos, initials and messages never cost extra. Making it theirs is the whole point." },
    { icon: <HeartIcon />, title: "Made to order", text: "Nothing sits on a shelf. Each piece is personalized after you order it, then checked by hand before it ships." },
    { icon: <ShieldIcon />, title: "The Love-It Guarantee", text: `If something isn't right, tell us within ${business.guaranteeDays} days of delivery and we'll remake it or refund you.` },
    { icon: <GiftIcon />, title: "Pay the way you pay", text: "M-Pesa right on your phone, or card where available — with clear prices before you pay." },
  ];
  return (
    <InfoPage eyebrow="Our story" title="About Heartfelt Gifts" intro="We make gifts that say the name of the person you love — because the best presents aren't just picked, they're made for someone.">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div className="space-y-4 text-ink-soft">
          <p>
            Heartfelt Gifts started with a simple idea: the gifts people keep for years are the ones with their name on them. A stocking that hangs every December. A mug that's unmistakably Dad's. A blanket a baby grows up with.
          </p>
          <p>So we built a shop where personalizing is easy, free and fast — and where every order is made just for the person receiving it.</p>
          <p>From Nairobi, we design, personalize and pack each gift with care, and ship it to the people on your list.</p>
        </div>
        <div className="grid grid-cols-3 gap-3" aria-hidden>
          {["family-name-stocking", "photo-color-mug", "family-wreath-ornament", "photo-teddy-tee", "toasting-flutes", "crystal-photo-block"].map((slug) => {
            const p = products.find((x) => x.slug === slug)!;
            return (
              <div key={slug} className="card overflow-hidden">
                <ProductArt art={p.art} image={productImage(slug)} size="sm" />
              </div>
            );
          })}
        </div>
      </div>

      <h2 className="mb-4 mt-12 font-display text-2xl font-medium">What we promise</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {values.map((v) => (
          <li key={v.title} className="flex gap-4 card p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sage-soft text-olive">{v.icon}</span>
            <div>
              <h3 className="font-semibold">{v.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{v.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-md bg-ink p-8 text-white">
        <div>
          <h2 className="font-display text-2xl font-medium">Find something with their name on it</h2>
          <p className="mt-1 text-white/70">Personalization is free on everything.</p>
        </div>
        <Link to="/c/bestsellers" className="btn-primary">
          Shop bestsellers
        </Link>
      </div>
    </InfoPage>
  );
}

// ================================================================ Shipping & Returns

export function ShippingReturnsPage() {
  const methods = Object.values(SHIPPING_METHODS);
  return (
    <InfoPage title="Shipping & Returns" intro="Made to order, packed with care, and backed by our Love-It Guarantee.">
      <div className="card prose-page max-w-3xl p-6 sm:p-10">
        <Section id="production" title="Made to order">
          <p>
            Every gift is personalized after you order it. Production takes <strong>{leadRange[0]}–{leadRange[1]} business days</strong> depending on the item — each product page shows its earliest arrival date, and checkout shows the date for the
            delivery speed you choose.
          </p>
        </Section>

        <Section id="shipping" title="Delivery options">
          <div className="mt-3 overflow-hidden card">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Method
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Delivery time (after production)
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {methods.map((m) => (
                  <tr key={m.label}>
                    <td className="px-4 py-3 font-medium">{m.label}</td>
                    <td className="px-4 py-3">{m.detail}</td>
                    <td className="px-4 py-3">
                      {money(m.price)}
                      {m.freeOver !== null ? <span className="block text-pine">Free on orders of {money(m.freeOver)}+</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3">Business days are Monday to Friday, excluding public holidays. Delivery times are estimates from the moment your order ships.</p>
        </Section>

        <Section id="where" title="Where we ship">
          <p>We currently deliver to: {SHIPS_TO.join(", ")}.</p>
          <p>
            For deliveries outside Kenya, import duties or taxes may be charged by the destination country and are paid by the recipient. Please double-check your address at checkout — we can't redirect a parcel once it has shipped.
          </p>
        </Section>

        <Section id="tracking" title="Tracking your order">
          <p>
            Check progress anytime on <Link to="/track-order">Order Tracking</Link> with your order number and email. We'll email you tracking details when your order ships.
          </p>
        </Section>

        <Section id="changes" title="Changes & cancellations">
          <p>
            Need to fix a name or cancel? <Link to="/contact">Contact us</Link> within <strong>{business.changeWindowHours} hours</strong> of paying. If your gift hasn't gone into production yet, we'll update it or cancel and refund you in full. After that, it's already being
            made just for you.
          </p>
        </Section>

        <Section id="guarantee" title="Our Love-It Guarantee">
          <p>If your gift arrives damaged, has a mistake we made, or isn't what you ordered, we'll remake it or refund you — your choice.</p>
          <ul>
            <li>
              Tell us within <strong>{business.guaranteeDays} days of delivery</strong> via the <Link to="/contact?topic=Returns%20or%20a%20problem%20with%20my%20gift">contact form</Link>, with your order number and a photo of the issue.
            </li>
            <li>For most problems you won't need to send anything back. If we do need the item, we'll cover return shipping.</li>
            <li>We print exactly what was entered at checkout, so spelling entered by you isn't covered — but ask us anyway, and we'll do our best to help.</li>
          </ul>
          <h3>Change-of-mind returns</h3>
          <p>Because each item is personalized, we can't resell it, so we're unable to accept returns for a change of mind. This doesn't affect your rights under consumer law.</p>
        </Section>

        <Section id="refunds" title="Refunds">
          <ul>
            <li>
              <strong>M-Pesa:</strong> refunded to the M-Pesa number that paid, usually within 3 business days of approval.
            </li>
            <li>
              <strong>Card:</strong> refunded to the original card; your bank may take 5–10 business days to show it.
            </li>
            <li>Gift bags ({money(GIFT_BAG_PRICE)}) and shipping are refunded together with the items they belong to.</li>
          </ul>
        </Section>
      </div>
      <p className="mt-10 flex items-center gap-2 text-sm text-ink-soft">
        <TruckIcon width={18} height={18} className="text-olive" /> Free standard shipping on orders over {money(FREE_SHIP_AT)}.
      </p>
    </InfoPage>
  );
}

// ================================================================ Privacy Policy

export function PrivacyPage() {
  return (
    <InfoPage eyebrow="Legal" title="Privacy Policy" intro={`Last updated ${business.policiesUpdated}`} prose>
      <DraftNotice />
      <Section title="Who we are">
        <p>
          {business.legalName} (“we”, “us”) runs this website and is responsible for the personal data described here. Contact us about privacy at <a href={`mailto:${business.email}`}>{business.email}</a> or {business.address}.
        </p>
        <p>We handle personal data in line with the Kenya Data Protection Act, 2019 and other laws that apply to you.</p>
      </Section>

      <Section title="What we collect">
        <ul>
          <li>
            <strong>Order details:</strong> your name, email, shipping address and (optionally) phone number, the items you buy, and your shipping choice.
          </li>
          <li>
            <strong>Personalization:</strong> the names, messages and initials you enter, and any photos you upload to be printed on your gift.
          </li>
          <li>
            <strong>Payment:</strong> for M-Pesa, the phone number that pays and the M-Pesa receipt number. Card payments are handled entirely by Stripe — we never receive your card number.
          </li>
          <li>
            <strong>Messages:</strong> what you send us through the contact form.
          </li>
          <li>
            <strong>Email sign-up:</strong> your email address, if you join our list.
          </li>
        </ul>
      </Section>

      <Section title="How we use it">
        <ul>
          <li>To make, personalize, ship and support your order, and to take payment for it.</li>
          <li>To answer your questions and handle problems under our guarantee.</li>
          <li>To send offers by email, only if you signed up — you can unsubscribe at any time.</li>
          <li>To keep records the law requires, such as tax and accounting records.</li>
          <li>To protect the shop against fraud and abuse.</li>
        </ul>
        <p>We use your data because it's needed to fulfil your order (contract), because the law requires it, because you agreed (email sign-up), or for our legitimate interest in running a safe shop.</p>
      </Section>

      <Section title="Who we share it with">
        <p>We don't sell your personal data. We share it only with providers who help us run the shop, and only what they need:</p>
        <ul>
          <li>
            <strong>Safaricom</strong> — to process M-Pesa payments.
          </li>
          <li>
            <strong>Stripe</strong> — to process card payments, when you pay by card.
          </li>
          <li>
            <strong>Delivery partners</strong> — your name, address and phone to deliver your parcel.
          </li>
          <li>
            <strong>Our hosting provider</strong> — which stores the website and order data.
          </li>
          <li>
            <strong>Google Fonts</strong> — the website loads its typefaces from Google, which receives your IP address when pages load.
          </li>
        </ul>
        <p>Some of these providers may process data outside Kenya; when they do, we rely on appropriate safeguards as required by law.</p>
      </Section>

      <Section title="Cookies & storage on your device">
        <p>
          We don't use advertising or analytics trackers. The site stores your cart, favorites and any promo code in your browser's local storage so they're there when you come back. You can clear them anytime in your browser settings.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep order and payment records for as long as tax and accounting laws require. Uploaded photos and personalization details are kept only as long as needed to make and support your order, and we'll delete them sooner on request. Contact
          messages are kept while we're helping you and for a reasonable period afterwards.
        </p>
      </Section>

      <Section title="Your rights">
        <p>You can ask us to:</p>
        <ul>
          <li>tell you what personal data we hold about you and give you a copy;</li>
          <li>correct anything that's wrong;</li>
          <li>delete your data, where we don't need to keep it by law;</li>
          <li>stop or limit using it, including for email marketing.</li>
        </ul>
        <p>
          Email <a href={`mailto:${business.email}`}>{business.email}</a> and we'll respond within the time the law allows. If you're unhappy with how we've handled your data, you can complain to the Office of the Data Protection Commissioner (ODPC) in Kenya.
        </p>
      </Section>

      <Section title="Security">
        <p>We use secure connections, keep payment details with specialised payment providers, and limit who can access order data. No system is perfectly secure, but we work to protect your information.</p>
      </Section>

      <Section title="Children">
        <p>Our shop is meant for adults buying gifts. We don't knowingly collect data from children; personalization may include a child's name because you chose to add it to a gift.</p>
      </Section>

      <Section title="Changes">
        <p>We'll update this page when our practices change and show the date at the top.</p>
      </Section>
    </InfoPage>
  );
}

// ================================================================ Terms of Use

export function TermsPage() {
  return (
    <InfoPage eyebrow="Legal" title="Terms of Use" intro={`Last updated ${business.policiesUpdated}`} prose>
      <DraftNotice />
      <Section title="About these terms">
        <p>
          These terms apply when you use this website or buy from {business.legalName} (“we”, “us”). By placing an order you agree to them, together with our <Link to="/privacy">Privacy Policy</Link> and <Link to="/shipping-returns">Shipping & Returns</Link> policy.
        </p>
      </Section>

      <Section title="Orders">
        <ul>
          <li>Your order is accepted once payment is confirmed and you see your order confirmation.</li>
          <li>We may cancel an order — and refund you in full — if an item becomes unavailable, a price was clearly wrong, or we suspect fraud.</li>
          <li>
            You can change or cancel within {business.changeWindowHours} hours of paying if production hasn't started (see <Link to="/shipping-returns">Shipping & Returns</Link>).
          </li>
        </ul>
      </Section>

      <Section title="Prices & payment">
        <ul>
          <li>Prices are shown in US dollars and include free personalization. Shipping and any extras, like gift bags, are shown before you pay.</li>
          <li>M-Pesa payments are charged in Kenyan shillings at the rate shown at checkout, rounded up to the nearest shilling.</li>
          <li>Payments are processed by Safaricom (M-Pesa) or Stripe (cards). Their own terms also apply to the payment.</li>
          <li>Crossed-out prices show the item's regular price before a promotion. Promo codes can't be combined unless stated.</li>
        </ul>
      </Section>

      <Section title="Your personalization">
        <ul>
          <li>We print exactly what you enter. Please check names, spelling and photos before ordering.</li>
          <li>You confirm you have the right to use any photo or text you send us, and that it doesn't break the law or anyone else's rights.</li>
          <li>We may refuse personalization that's offensive, hateful, infringes someone's rights or uses trademarks you don't own. If we do, we'll refund you.</li>
          <li>You keep ownership of your photos. You allow us to use them only to make and support your order.</li>
        </ul>
      </Section>

      <Section title="Delivery">
        <p>Production and delivery dates are estimates. We'll do our best to meet them, but delays by carriers, customs or events outside our control can happen. Risk passes to you when your parcel is delivered.</p>
      </Section>

      <Section title="Problems with your gift">
        <p>
          Our <Link to="/shipping-returns#guarantee">Love-It Guarantee</Link> covers damage, our mistakes and wrong items reported within {business.guaranteeDays} days of delivery. Nothing in these terms limits your rights under the Consumer Protection Act, 2012 or other
          consumer laws that apply to you.
        </p>
      </Section>

      <Section title="Using the website">
        <ul>
          <li>Don't misuse the site — for example by trying to break in, overload it, or scrape it automatically.</li>
          <li>The site's design, text and images belong to us or our licensors. Don't copy them without permission.</li>
        </ul>
      </Section>

      <Section title="Liability">
        <p>
          To the extent the law allows, we aren't liable for indirect or unforeseeable losses, and our total liability for an order is limited to the amount you paid for it. We don't exclude liability where it would be unlawful to do so.
        </p>
      </Section>

      <Section title="Governing law">
        <p>These terms are governed by the laws of {business.jurisdiction}. If a dispute comes up, please contact us first — most things can be solved quickly.</p>
      </Section>

      <Section title="Contact">
        <p>
          {business.legalName}, {business.address} · <a href={`mailto:${business.email}`}>{business.email}</a> · {business.phone}
        </p>
      </Section>
    </InfoPage>
  );
}
