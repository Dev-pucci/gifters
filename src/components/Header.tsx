import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { categories, occasionLabels } from "../data/catalog";
import { FREE_SHIP_AT } from "../lib/pricing";
import { useAuth } from "../state/auth";
import { useSite } from "../state/site";
import { useSections } from "../state/sections";
import { BagIcon, ChevronIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, TruckIcon, UserIcon } from "./Icons";
import SearchBox from "./SearchBox";

type NavItem = { label: string; to: string; menu?: { label: string; to: string }[] };

const NAV: NavItem[] = [
  { label: "Home", to: "/" },
  {
    label: "Shop",
    to: "/c/all",
    menu: [{ label: "All Gifts", to: "/c/all" }, { label: "Best Sellers", to: "/c/bestsellers" }, { label: "New Arrivals", to: "/c/new" }, ...categories.map((c) => ({ label: c.name, to: `/c/${c.slug}` }))],
  },
  {
    label: "Occasions",
    to: "/c/all",
    menu: (Object.keys(occasionLabels) as (keyof typeof occasionLabels)[]).map((o) => ({ label: occasionLabels[o], to: `/c/all?occasion=${o}` })),
  },
  { label: "Personalized", to: "/how-to-personalize" },
  { label: "About Us", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const ANNOUNCE_KEY = "hg_announce_dismissed_v2";

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-olive px-1 text-[10px] font-bold text-white">{n > 99 ? "99+" : n}</span>;
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" aria-label="Heartfelt Gifts home" className={`group inline-flex shrink-0 items-center gap-2.5 ${light ? "text-white" : "text-ink"}`}>
      <svg aria-hidden viewBox="0 0 40 40" className="h-8 w-8 shrink-0 sm:h-10 sm:w-10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="5" y="15" width="30" height="21" rx="1.5" />
        <path d="M3 10h34v6H3zM20 10v26" />
        <path d="M20 10c-3-6-10-7-10-2.5S16 10 20 10zm0 0c3-6 10-7 10-2.5S24 10 20 10z" />
      </svg>
      <span className="leading-none">
        <span className="block whitespace-nowrap font-display text-[15px] font-medium uppercase tracking-[0.08em] sm:text-lg sm:tracking-[0.14em]">Heartfelt Gifts</span>
        <span className={`mt-1 hidden text-[11px] sm:block ${light ? "text-white/70" : "text-ink-soft"}`}>Personalized with love, every time.</span>
      </span>
    </Link>
  );
}

function AnnouncementBar() {
  const { config } = useSite();
  // The season can set its own message; otherwise show the free-shipping offer.
  const message = config?.theme.announcement || `Free shipping on orders over $${FREE_SHIP_AT}`;
  // Remember which message was dismissed, so a new seasonal message shows again.
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(ANNOUNCE_KEY);
    } catch {
      return null;
    }
  });
  if (dismissed === message) return null;
  return (
    <div className="bg-olive-dark text-white">
      <div className="container-page relative flex h-9 items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em]">
        <TruckIcon width={16} height={16} aria-hidden className="shrink-0" />
        <span className="truncate pr-8 sm:pr-0">
          {message}
          <span className="hidden sm:inline">
            {" · "}
            <Link to="/shipping-returns" className="underline-offset-2 hover:underline">
              Details
            </Link>
          </span>
        </span>
        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={() => {
            setDismissed(message);
            try {
              localStorage.setItem(ANNOUNCE_KEY, message);
            } catch {
              /* ignore */
            }
          }}
          className="absolute right-2 grid h-7 w-7 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white sm:right-4"
        >
          <CloseIcon width={14} height={14} />
        </button>
      </div>
    </div>
  );
}

function DesktopNav() {
  const [open, setOpen] = useState<string | null>(null);
  const { pathname } = useLocation();
  return (
    <nav aria-label="Main" className="hidden lg:block" onMouseLeave={() => setOpen(null)}>
      <ul className="flex items-center gap-1 xl:gap-3">
        {NAV.map((item) => (
          <li key={item.label} className="relative" onMouseEnter={() => setOpen(item.menu ? item.label : null)}>
            {item.menu ? (
              <button
                type="button"
                aria-expanded={open === item.label}
                aria-haspopup="true"
                onClick={() => setOpen(open === item.label ? null : item.label)}
                className={`flex items-center gap-1 px-3 py-2 text-[12px] font-medium uppercase tracking-[0.12em] hover:text-olive ${pathname.startsWith("/c/") && item.label === "Shop" ? "text-olive" : "text-ink"}`}
              >
                {item.label}
                <ChevronIcon dir="down" width={13} height={13} />
              </button>
            ) : (
              <NavLink
                to={item.to}
                end
                className={({ isActive }) => `block px-3 py-2 text-[12px] font-medium uppercase tracking-[0.12em] hover:text-olive ${isActive ? "text-olive underline decoration-olive decoration-1 underline-offset-[10px]" : "text-ink"}`}
              >
                {item.label}
              </NavLink>
            )}
            {item.menu && open === item.label ? (
              <div className="absolute left-1/2 top-full z-50 w-max min-w-56 -translate-x-1/2 pt-3">
                <ul className={`grid gap-x-8 gap-y-2 rounded-md border border-line bg-white px-6 py-5 shadow-xl ${item.menu.length > 8 ? "grid-cols-2" : ""}`}>
                  {item.menu.map((m) => (
                    <li key={m.label}>
                      <Link to={m.to} onClick={() => setOpen(null)} className="block whitespace-nowrap py-0.5 text-sm text-ink hover:text-olive">
                        {m.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function AccountLink() {
  const { user } = useAuth();
  return user ? (
    <>
    {user.isAdmin ? (
      <Link to="/admin" className="flex items-center gap-3 border-b border-line px-5 py-4 text-sm font-medium text-olive">
        Store admin: seasons & images
      </Link>
    ) : null}
    <Link to="/account" className="flex items-center gap-3 px-5 py-4 text-sm">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-olive text-xs text-white">{user.name.charAt(0).toUpperCase()}</span>
      My account
    </Link>
    </>
  ) : (
    <Link to="/sign-in" className="flex items-center gap-3 px-5 py-4 text-sm font-medium">
      <UserIcon width={20} height={20} /> Sign in / Create account
    </Link>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-white text-ink">
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <Logo />
          <button type="button" aria-label="Close menu" className="grid h-10 w-10 place-items-center rounded-full hover:bg-cream" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="border-b border-line p-4">
          <SearchBox onDone={onClose} />
        </div>
        <ul className="divide-y divide-line">
          {NAV.map((item) => (
            <li key={item.label}>
              {item.menu ? (
                <>
                  <button
                    type="button"
                    aria-expanded={openGroup === item.label}
                    onClick={() => setOpenGroup(openGroup === item.label ? null : item.label)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium uppercase tracking-[0.12em]"
                  >
                    {item.label}
                    <ChevronIcon dir={openGroup === item.label ? "down" : "right"} width={18} height={18} />
                  </button>
                  {openGroup === item.label ? (
                    <ul className="space-y-3 bg-linen px-7 py-4">
                      {item.menu.map((m) => (
                        <li key={m.label}>
                          <Link to={m.to} className="text-sm">
                            {m.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <Link to={item.to} className="block px-5 py-4 text-sm font-medium uppercase tracking-[0.12em]">
                  {item.label}
                </Link>
              )}
            </li>
          ))}
          <li>
            <Link to="/track-order" className="block px-5 py-4 text-sm text-ink-soft">
              Track an order
            </Link>
          </li>
          <li>
            <AccountLink />
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function Header() {
  const { cart, favorite, setCartOpen } = useSections();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrap = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!searchOpen) return;
    searchWrap.current?.querySelector("input")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSearchOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const iconBtn = "relative grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-linen hover:text-olive sm:h-10 sm:w-10";

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="container-page flex h-[68px] items-center gap-1.5 sm:gap-3 lg:h-20">
          <button type="button" className={`-ml-2 lg:hidden ${iconBtn}`} aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </button>
          <Logo />
          <div className="mx-auto">
            <DesktopNav />
          </div>
          <nav aria-label="Account" className="ml-auto flex items-center gap-0.5 sm:gap-1 lg:ml-0">
            {user?.isAdmin ? (
              <Link to="/admin" className="mr-1 hidden rounded-[4px] border border-olive/30 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-olive hover:border-olive lg:inline-block">
                Admin
              </Link>
            ) : null}
            <button type="button" aria-label="Search" aria-expanded={searchOpen} onClick={() => setSearchOpen((o) => !o)} className={`hidden sm:grid ${iconBtn}`}>
              <SearchIcon width={21} height={21} />
            </button>
            {user ? (
              <Link to="/account" aria-label={`My account (${user.name})`} title={`Signed in as ${user.email}`} className={`hidden sm:grid ${iconBtn}`}>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-olive font-display text-sm text-white">{user.name.charAt(0).toUpperCase()}</span>
              </Link>
            ) : (
              <Link to="/sign-in" aria-label="Sign in" className={`hidden sm:grid ${iconBtn}`}>
                <UserIcon width={21} height={21} />
              </Link>
            )}
            <Link to="/favorites" aria-label={`Favorites, ${favorite.count} items`} className={iconBtn}>
              <HeartIcon width={21} height={21} />
              <Badge n={favorite.count} />
            </Link>
            <button type="button" onClick={() => setCartOpen(true)} aria-label={`Cart, ${cart.count} items`} className={iconBtn}>
              <BagIcon width={21} height={21} />
              <Badge n={cart.count} />
            </button>
          </nav>
        </div>
        {searchOpen ? (
          <div ref={searchWrap} className="border-t border-line bg-white">
            <div className="container-page flex max-w-3xl items-center gap-3 py-4">
              <div className="flex-1 [&_input]:border-line [&_input]:bg-linen">
                <SearchBox onDone={() => setSearchOpen(false)} />
              </div>
              <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)} className={iconBtn}>
                <CloseIcon />
              </button>
            </div>
          </div>
        ) : null}
      </header>
      {mobileOpen ? <MobileMenu onClose={() => setMobileOpen(false)} /> : null}
    </>
  );
}
