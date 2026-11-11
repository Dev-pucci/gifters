import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import PageHeader from "./PageHeader";

export const helpPages = [
  { to: "/contact", label: "Contact Us" },
  { to: "/faq", label: "FAQs" },
  { to: "/how-to-personalize", label: "How to Personalize" },
  { to: "/track-order", label: "Order Tracking" },
  { to: "/shipping-returns", label: "Shipping & Returns" },
  { to: "/about", label: "About Us" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Use" },
] as const;

interface Props {
  title: string;
  intro?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  /** Narrow, document-style layout for long legal text. */
  prose?: boolean;
}

/** Shared layout for help, company and policy pages: title band, side navigation, content. */
export default function InfoPage({ title, intro, eyebrow = "Help & info", children, prose }: Props) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} intro={intro} crumbs={[{ label: title }]} />
      <div className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-[230px_1fr] lg:gap-10">
          <aside className="order-last lg:order-first">
            <nav aria-label="Help pages" className="card p-4 lg:sticky lg:top-28">
              <p className="eyebrow mb-3 px-2">Help & info</p>
              <ul className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
                {helpPages.map((p) => (
                  <li key={p.to}>
                    <NavLink
                      to={p.to}
                      className={({ isActive }) =>
                        `block rounded-[4px] px-3 py-2 text-sm transition ${isActive ? "bg-olive text-white" : "bg-linen text-ink hover:text-olive lg:bg-transparent lg:hover:bg-linen"}`
                      }
                    >
                      {p.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          <div className="min-w-0">
            <div className={prose ? "card prose-page max-w-3xl p-6 sm:p-10" : ""}>{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Heading + body block used inside prose pages. */
export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
