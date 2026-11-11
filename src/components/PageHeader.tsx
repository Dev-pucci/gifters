import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { HeartIcon } from "./Icons";

export function HeartDivider({ className = "", align = "center" }: { className?: string; align?: "center" | "start" }) {
  return (
    <span aria-hidden className={`flex items-center gap-3 text-olive ${align === "center" ? "justify-center" : "justify-start"} ${className}`}>
      <span className="h-px w-10 bg-olive/30" />
      <HeartIcon width={12} height={12} />
      <span className="h-px w-10 bg-olive/30" />
    </span>
  );
}

interface Props {
  title: ReactNode;
  eyebrow?: string;
  intro?: ReactNode;
  /** Breadcrumb trail after "Home", e.g. [{ label: "Cart", to: "/cart" }, { label: "Checkout" }]. */
  crumbs?: { label: string; to?: string }[];
  align?: "center" | "start";
  children?: ReactNode;
}

/** Linen title band used at the top of every inner page, matching the landing page's section headings. */
export default function PageHeader({ title, eyebrow, intro, crumbs = [], align = "center", children }: Props) {
  const center = align === "center";
  return (
    <div className="border-b border-line bg-linen">
      <div className={`container-page py-9 sm:py-11 ${center ? "text-center" : ""}`}>
        {crumbs.length ? (
          <nav aria-label="Breadcrumb" className={`mb-4 flex flex-wrap gap-1.5 text-xs text-ink-soft ${center ? "justify-center" : ""}`}>
            <Link to="/" className="hover:text-olive">
              Home
            </Link>
            {crumbs.map((c) => (
              <span key={c.label} className="flex gap-1.5">
                <span aria-hidden>/</span>
                {c.to ? (
                  <Link to={c.to} className="hover:text-olive">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-ink" aria-current="page">
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="font-display text-[2rem] font-medium leading-tight text-ink sm:text-4xl">{title}</h1>
        <HeartDivider className="mt-3" align={align} />
        {intro ? <div className={`mt-4 text-ink-soft ${center ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>{intro}</div> : null}
        {children}
      </div>
    </div>
  );
}
