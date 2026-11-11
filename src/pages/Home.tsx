import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, GiftIcon, HeartIcon, LockIcon, QuoteIcon, ReturnIcon, TruckIcon } from "../components/Icons";
import ProductArt from "../components/ProductArt";
import ProductCard, { Stars } from "../components/ProductCard";
import { business } from "../data/business";
import { getCategory, products } from "../data/catalog";
import { bannerImage, categoryImage, heroImage } from "../data/images";
import { sampleTestimonials, testimonials } from "../data/testimonials";
import { FREE_SHIP_AT, PROMO_CODES } from "../lib/pricing";
import { useSections } from "../state/sections";

const WELCOME = Object.entries(PROMO_CODES)[0];

// ---------------------------------------------------------------- shared bits

function HeartDivider({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`flex items-center justify-center gap-3 text-olive ${className}`}>
      <span className="h-px w-10 bg-olive/30" />
      <HeartIcon width={12} height={12} />
      <span className="h-px w-10 bg-olive/30" />
    </span>
  );
}

function SectionHeading({ eyebrow, title, id, center = true }: { eyebrow?: string; title: string; id: string; center?: boolean }) {
  return (
    <div className={center ? "text-center" : ""}>
      {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
      <h2 id={id} className="font-display text-3xl font-medium text-ink sm:text-[2.1rem]">
        {title}
      </h2>
      <HeartDivider className={`mt-3 ${center ? "" : "justify-start"}`} />
    </div>
  );
}

const TRUST: { icon: ReactNode; title: string; text: string }[] = [
  { icon: <TruckIcon />, title: "Free shipping", text: `On orders $${FREE_SHIP_AT}+` },
  { icon: <GiftIcon />, title: "Gift-ready", text: "Gift bag option" },
  { icon: <ReturnIcon />, title: "Easy returns", text: `${business.guaranteeDays}-day guarantee` },
  { icon: <LockIcon />, title: "Secure checkout", text: "M-Pesa & card" },
];

// ---------------------------------------------------------------- illustrations (used until real photos exist)

function KraftGiftArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" className={className} role="img" aria-label="A kraft-paper gift box tied with a sage ribbon and a 'for you' tag">
      <defs>
        <linearGradient id="kg-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f6f1e8" />
          <stop offset="1" stopColor="#e7dccb" />
        </linearGradient>
        <linearGradient id="kg-top" x2="0" y2="1">
          <stop offset="0" stopColor="#d9b48c" />
          <stop offset="1" stopColor="#c69c72" />
        </linearGradient>
        <linearGradient id="kg-front" x2="0" y2="1">
          <stop offset="0" stopColor="#c99f75" />
          <stop offset="1" stopColor="#b38660" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#kg-bg)" />
      <ellipse cx="330" cy="372" rx="210" ry="22" fill="#000" opacity=".08" />
      {/* eucalyptus */}
      <g fill="#8a9a7b">
        <path d="M70 330c40-60 90-110 150-140" stroke="#6f7f62" strokeWidth="3" fill="none" />
        {[[95, 300, -30], [120, 270, -40], [148, 242, -45], [178, 218, -50], [205, 200, -55]].map(([x, y, r], i) => (
          <g key={i}>
            <ellipse cx={x} cy={y - 14} rx="16" ry="10" transform={`rotate(${r} ${x} ${y - 14})`} opacity=".9" />
            <ellipse cx={x + 14} cy={y + 6} rx="15" ry="9" transform={`rotate(${r + 70} ${x + 14} ${y + 6})`} opacity=".75" />
          </g>
        ))}
      </g>
      {/* box */}
      <path d="M190 160h300l-20 30H210z" fill="url(#kg-top)" />
      <rect x="210" y="190" width="260" height="175" fill="url(#kg-front)" />
      <rect x="190" y="150" width="300" height="42" rx="3" fill="url(#kg-top)" />
      {/* ribbon */}
      <rect x="322" y="150" width="36" height="215" fill="#7d8c6a" />
      <rect x="190" y="160" width="300" height="20" fill="#7d8c6a" opacity=".95" />
      <path d="M340 150c-50-60-120-40-90 0 18 22 60 10 90 0zM340 150c50-60 120-40 90 0-18 22-60 10-90 0z" fill="#6f7f5e" />
      <path d="M340 150l-34 70 16 4 18-62 18 62 16-4z" fill="#7d8c6a" />
      <circle cx="340" cy="150" r="13" fill="#5f6e52" />
      {/* tag */}
      <path d="M392 196l60 22-6 16" stroke="#8b6b4a" strokeWidth="2" fill="none" />
      <g transform="rotate(-14 470 270)">
        <path d="M430 230h70l18 18v70h-88z" fill="#fbf7ef" stroke="#e2d6c3" strokeWidth="2" />
        <circle cx="500" cy="248" r="5" fill="#e2d6c3" />
        <text x="472" y="282" textAnchor="middle" fontFamily="Dancing Script, cursive" fontSize="22" fill="#4a5940">
          for you
        </text>
        <text x="472" y="306" textAnchor="middle" fontSize="16" fill="#b4233c">
          ♥
        </text>
      </g>
    </svg>
  );
}

function EngravedBoardArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 400" className={className} role="img" aria-label="A wooden board engraved with 'The Okafor Family, Est. 2022'">
      <defs>
        <linearGradient id="eb-bg" x1="0" x2="1">
          <stop offset="0" stopColor="#f3efe7" />
          <stop offset="1" stopColor="#e5ddcf" />
        </linearGradient>
        <linearGradient id="eb-wood" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#c08a58" />
          <stop offset=".55" stopColor="#a86f42" />
          <stop offset="1" stopColor="#8c5a34" />
        </linearGradient>
      </defs>
      <rect width="640" height="400" fill="url(#eb-bg)" />
      <g transform="rotate(-8 300 210)">
        <rect x="110" y="70" width="380" height="270" rx="26" fill="#000" opacity=".1" transform="translate(10 12)" />
        <rect x="110" y="70" width="380" height="270" rx="26" fill="url(#eb-wood)" />
        <g stroke="#7a4c2a" strokeWidth="2" fill="none" opacity=".35">
          <path d="M130 110c90 14 220-10 340 6M126 160c120 20 210-16 348 4M128 250c110 12 230-12 344 2M132 300c100 10 200-8 336 2" />
        </g>
        <g fontFamily="Fraunces, Georgia, serif" textAnchor="middle">
          {[["THE OKAFOR", 168, 40], ["FAMILY", 222, 50], ["EST. 2022", 272, 22]].map(([t, y, s]) => (
            <g key={t as string}>
              <text x="301" y={(y as number) + 2} fontSize={s as number} fill="#e9c9a3" opacity=".5" letterSpacing="3">
                {t}
              </text>
              <text x="300" y={y as number} fontSize={s as number} fill="#4d2f19" letterSpacing="3">
                {t}
              </text>
            </g>
          ))}
        </g>
      </g>
      {/* eucalyptus & gift corner */}
      <g fill="#8a9a7b" opacity=".9">
        <path d="M40 380c30-50 70-80 120-100" stroke="#6f7f62" strokeWidth="3" fill="none" />
        <ellipse cx="70" cy="340" rx="16" ry="9" transform="rotate(-40 70 340)" />
        <ellipse cx="100" cy="312" rx="16" ry="9" transform="rotate(-35 100 312)" />
        <ellipse cx="132" cy="292" rx="15" ry="9" transform="rotate(-25 132 292)" />
        <ellipse cx="84" cy="360" rx="14" ry="8" transform="rotate(30 84 360)" />
      </g>
      <rect x="500" y="250" width="160" height="170" fill="#c99f75" />
      <rect x="560" y="250" width="26" height="170" fill="#f4ecdf" />
      <path d="M572 250c-30-40-80-26-60 2 12 14 40 6 60-2zM572 250c30-40 80-26 60 2-12 14-40 6-60-2z" fill="#efe4d2" />
    </svg>
  );
}

// ---------------------------------------------------------------- sections

function Hero() {
  const img = heroImage();
  return (
    <section className="relative isolate overflow-hidden bg-linen" aria-labelledby="hero-title">
      <div className="relative h-64 sm:h-80 md:absolute md:inset-y-0 md:right-0 md:h-auto md:w-[56%]">
        {img ? (
          <img src={img} alt="Wrapped gifts, a candle and keepsakes arranged on a table" fetchPriority="high" className="h-full w-full object-cover" />
        ) : (
          <KraftGiftArt className="h-full w-full object-cover" />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-linen via-transparent to-transparent md:bg-gradient-to-r md:from-linen md:via-linen/30 md:to-transparent" />
      </div>
      <div className="container-page relative flex pb-10 pt-4 md:min-h-[520px] md:items-center md:py-16 lg:min-h-[560px]">
        <div className="max-w-xl md:max-w-[46%]">
          <p className="eyebrow">Thoughtful, personalized gifts</p>
          <h1 id="hero-title" className="mt-3 font-display text-[2.6rem] font-medium leading-[1.05] text-ink sm:text-5xl lg:text-[3.6rem]">
            Make Every Moment
            <span className="mt-1 block font-wordmark text-[3.1rem] font-semibold leading-none text-olive sm:text-6xl lg:text-[4.4rem]">Unforgettable</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">Beautiful gifts for every occasion, personalized with their name and made with love and care.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/c/bestsellers" className="btn-primary">
              Shop Best Sellers
            </Link>
            <Link to="/c/all" className="btn-outline">
              Find the Perfect Gift
            </Link>
          </div>
          <ul className="mt-9 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-olive/15 pt-6 sm:grid-cols-4 md:grid-cols-2 xl:grid-cols-4">
            {TRUST.map((t) => (
              <li key={t.title} className="flex items-center gap-2.5 text-[11px] leading-tight">
                <span className="shrink-0 text-olive [&_svg]:h-6 [&_svg]:w-6">{t.icon}</span>
                <span>
                  <span className="block font-semibold text-ink">{t.title}</span>
                  <span className="text-ink-soft">{t.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const CATEGORY_CARDS: { slug: string; label: string }[] = [
  { slug: "for-her", label: "Gifts for Her" },
  { slug: "for-him", label: "Gifts for Him" },
  { slug: "wedding", label: "Anniversary & Wedding" },
  { slug: "home", label: "Home & Living" },
  { slug: "baby", label: "Baby & Kids" },
  { slug: "christmas", label: "Christmas" },
];

function ShopByCategory() {
  return (
    <section className="container-page py-14 sm:py-16" aria-labelledby="cat-title">
      <SectionHeading id="cat-title" title="Shop by Category" />
      <div className="mt-9 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        {CATEGORY_CARDS.map(({ slug, label }) => {
          const c = getCategory(slug)!;
          return (
            <Link key={slug} to={`/c/${slug}`} className="group overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(31,42,55,0.08)] transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="overflow-hidden">
                <ProductArt art={c.art} image={categoryImage(slug)} label="" className="aspect-[4/3.7]! transition duration-500 group-hover:scale-105" />
              </div>
              <div className="px-3 py-3.5 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">{label}</p>
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-ink-soft group-hover:text-olive">
                  Shop Now <ArrowRightIcon width={12} height={12} />
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function BestSellers() {
  const items = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 5);
  return (
    <section className="bg-white py-14 sm:py-16" aria-labelledby="best-title">
      <div className="container-page">
        <div className="relative">
          <SectionHeading id="best-title" eyebrow="Customer favorites" title="Best Sellers" />
          <Link to="/c/bestsellers" className="btn-outline mx-auto mt-5 flex w-fit md:absolute md:bottom-3 md:right-0 md:mt-0">
            View all products
          </Link>
        </div>
        <div className="mt-9 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PersonalTouch() {
  const img = bannerImage("personal-touch");
  return (
    <section className="container-page py-14 sm:py-16" aria-labelledby="personal-title">
      <div className="grid overflow-hidden rounded-md bg-sage-soft md:grid-cols-[1fr_1.15fr]">
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <p className="eyebrow">Make it personal</p>
          <h2 id="personal-title" className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            Add a Personal Touch
          </h2>
          <p className="mt-3 max-w-sm text-ink-soft">Names, dates, photos and messages — added free to every gift, so it's unmistakably theirs.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/c/all" className="btn-primary">
              Shop personalized gifts
            </Link>
            <Link to="/how-to-personalize" className="btn-outline">
              How it works
            </Link>
          </div>
        </div>
        <div className="min-h-56">{img ? <img src={img} alt="An engraved wooden family-name board" loading="lazy" className="h-full w-full object-cover" /> : <EngravedBoardArt className="h-full w-full" />}</div>
      </div>
    </section>
  );
}

function Testimonials() {
  const list = testimonials.length ? testimonials : import.meta.env.DEV ? sampleTestimonials : [];
  if (!list.length) return null;
  const samples = !testimonials.length;
  return (
    <section className="bg-white py-14 sm:py-16" aria-labelledby="love-title">
      <div className="container-page">
        <SectionHeading id="love-title" eyebrow="What our customers say" title="Made With Love, Received With Joy" />
        {samples ? (
          <p className="mx-auto mt-6 max-w-2xl rounded-md border border-gold/50 bg-[#fdf6e7] p-3 text-center text-xs text-[#7a5a12]">
            Layout preview (development only): add real customer reviews in <code>src/data/testimonials.ts</code>. This section stays hidden from shoppers until you do.
          </p>
        ) : null}
        <ul className="mt-9 grid gap-5 md:grid-cols-3">
          {list.map((t, i) => (
            <li key={i} className="flex flex-col rounded-md bg-white p-6 shadow-[0_2px_10px_rgba(31,42,55,0.08)]">
              <QuoteIcon width={28} height={28} className="text-olive/70" />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{t.quote}</blockquote>
              <div className="mt-5 flex items-center gap-3">
                <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-sage-soft font-display text-olive">
                  {t.name.charAt(0)}
                </span>
                <span className="flex-1 text-sm">
                  <span className="block font-semibold">{t.name}</span>
                  <span className="text-xs text-ink-soft">{t.location}</span>
                </span>
                <span aria-label={`${t.rating} out of 5 stars`}>
                  <Stars rating={t.rating} size={15} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function NewsletterBanner() {
  const { customer, subscribe } = useSections();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const img = bannerImage("newsletter");
  const [code, promo] = WELCOME;
  return (
    <section className="bg-sage-soft" aria-labelledby="news-title">
      <div className="grid md:grid-cols-2">
        <div className="h-56 md:h-auto">{img ? <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" /> : <KraftGiftArt className="h-full w-full" />}</div>
        <div className="container-page flex flex-col justify-center py-10 md:mx-0 md:max-w-xl md:px-12 md:py-14">
          <p className="eyebrow">Stay in the loop</p>
          <h2 id="news-title" className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            Get {promo.percent}% Off Your First Order
          </h2>
          <p className="mt-3 text-ink-soft">Sign up for exclusive offers, new arrivals and gift ideas.</p>
          {customer.subscribed ? (
            <p className="mt-6 rounded-md bg-white p-4 text-sm" role="status">
              You're in! Use code <strong className="font-mono text-olive">{code}</strong> at checkout for {promo.percent}% off.
            </p>
          ) : (
            <form
              noValidate
              className="mt-6"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError(null);
                try {
                  await subscribe(email);
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label htmlFor="news-email" className="sr-only">
                Email address
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="news-email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? "news-error" : undefined}
                  className="h-12 min-w-0 flex-1 rounded-[4px] border border-line bg-white px-4 text-sm focus:border-olive focus:outline-none"
                />
                <button type="submit" disabled={busy} className="btn-primary h-12">
                  {busy ? "…" : "Subscribe"}
                </button>
              </div>
              {error ? (
                <p id="news-error" className="mt-2 text-sm text-brand">
                  {error}
                </p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <ShopByCategory />
      <BestSellers />
      <PersonalTouch />
      <Testimonials />
      <NewsletterBanner />
    </>
  );
}
