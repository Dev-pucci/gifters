// Faceted product listing (category + search pages), modeled on the original site's filter
// sidebar: every filter value shows how many products it would leave, and all state lives in
// the URL (?recipient=her,him&type=Drinkware&min=10&max=50&sort=price-asc&per=24&page=2).

import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { occasionLabels, recipientLabels, type Product } from "../data/catalog";
import { CloseIcon } from "./Icons";
import ProductCard from "./ProductCard";

const sorts = {
  featured: { label: "Featured", fn: () => 0 },
  popular: { label: "Most reviewed", fn: (a: Product, b: Product) => b.reviews - a.reviews },
  "price-asc": { label: "Price: low to high", fn: (a: Product, b: Product) => a.price - b.price },
  "price-desc": { label: "Price: high to low", fn: (a: Product, b: Product) => b.price - a.price },
  rating: { label: "Top rated", fn: (a: Product, b: Product) => b.rating - a.rating },
  new: { label: "Newest", fn: (a: Product, b: Product) => Number(!!b.isNew) - Number(!!a.isNew) },
} as const;
type SortKey = keyof typeof sorts;

interface Facet {
  id: "recipient" | "occasion" | "type" | "personalize";
  label: string;
  values: (p: Product) => string[];
  labelOf: (v: string) => string;
}

const personalizeKinds = (p: Product) => [...new Set(p.fields.map((f) => (f.type === "photo" ? "photo" : f.type === "swatch" ? "color" : f.id === "initial" ? "initial" : "name")))];

const facets: Facet[] = [
  { id: "recipient", label: "Gift for", values: (p) => p.recipients, labelOf: (v) => recipientLabels[v as keyof typeof recipientLabels] ?? v },
  { id: "occasion", label: "Occasion", values: (p) => p.occasions, labelOf: (v) => occasionLabels[v as keyof typeof occasionLabels] ?? v },
  { id: "type", label: "Product type", values: (p) => [p.type], labelOf: (v) => v },
  { id: "personalize", label: "Personalize with", values: personalizeKinds, labelOf: (v) => ({ name: "Name or text", photo: "Photo", initial: "Initial / monogram", color: "Color choice" })[v] ?? v },
];

const priceRanges = [
  { label: "Under $25", min: 0, max: 25 },
  { label: "$25 – $50", min: 25, max: 50 },
  { label: "$50 – $100", min: 50, max: 100 },
  { label: "$100+", min: 100, max: Infinity },
];

const PER_PAGE = [12, 24, 48];

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export default function ProductGrid({ items, empty }: { items: Product[]; empty?: string }) {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selected = useMemo(() => Object.fromEntries(facets.map((f) => [f.id, list(params.get(f.id))])) as Record<Facet["id"], string[]>, [params]);
  const min = Number(params.get("min")) || 0;
  const max = Number(params.get("max")) || Infinity;
  const sort = (params.get("sort") as SortKey) in sorts ? (params.get("sort") as SortKey) : "featured";
  const per = PER_PAGE.includes(Number(params.get("per"))) ? Number(params.get("per")) : 12;

  const update = (mut: (p: URLSearchParams) => void, resetPage = true) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      mut(next);
      if (resetPage) next.delete("page");
      return next;
    }, { replace: true });

  const inPrice = (p: Product) => p.price >= min && p.price <= max;
  const matchesFacets = (p: Product, except?: Facet["id"]) => facets.every((f) => f.id === except || !selected[f.id].length || f.values(p).some((v) => selected[f.id].includes(v)));
  const matches = (p: Product, except?: Facet["id"]) => inPrice(p) && matchesFacets(p, except);

  const filtered = useMemo(() => items.filter((p) => matches(p)).sort(sorts[sort].fn), [items, selected, min, max, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const page = Math.min(pages, Math.max(1, Number(params.get("page")) || 1));
  const shown = filtered.slice((page - 1) * per, page * per);

  const toggle = (facet: Facet["id"], value: string) =>
    update((p) => {
      const cur = new Set(list(p.get(facet)));
      if (cur.has(value)) cur.delete(value);
      else cur.add(value);
      if (cur.size) p.set(facet, [...cur].join(","));
      else p.delete(facet);
    });

  const activeCount = facets.reduce((n, f) => n + selected[f.id].length, 0) + (min || max !== Infinity ? 1 : 0);

  const sidebar = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">Price</h3>
        <ul className="space-y-2">
          {priceRanges.map((r) => {
            const count = items.filter((p) => matchesFacets(p) && p.price >= r.min && p.price <= r.max).length;
            const on = min === r.min && max === r.max;
            return (
              <li key={r.label}>
                <label className={`flex cursor-pointer items-center justify-between gap-2 text-sm ${count === 0 && !on ? "text-ink-soft/60" : ""}`}>
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="price"
                      checked={on}
                      disabled={count === 0 && !on}
                      onChange={() =>
                        update((p) => {
                          if (r.min) p.set("min", String(r.min));
                          else p.delete("min");
                          if (r.max !== Infinity) p.set("max", String(r.max));
                          else p.delete("max");
                        })
                      }
                      className="h-4 w-4 accent-[var(--color-olive)]"
                    />
                    {r.label}
                  </span>
                  <span className="text-ink-soft">({count})</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      {facets.map((f) => {
        const values = [...new Set(items.flatMap(f.values))].sort((a, b) => f.labelOf(a).localeCompare(f.labelOf(b)));
        if (values.length < 2 && !selected[f.id].length) return null;
        return (
          <div key={f.id}>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">{f.label}</h3>
            <ul className="space-y-2">
              {values.map((v) => {
                const count = items.filter((p) => matches(p, f.id) && f.values(p).includes(v)).length;
                const on = selected[f.id].includes(v);
                return (
                  <li key={v}>
                    <label className={`flex cursor-pointer items-center justify-between gap-2 text-sm ${count === 0 && !on ? "text-ink-soft/60" : ""}`}>
                      <span className="flex items-center gap-2">
                        <input type="checkbox" checked={on} disabled={count === 0 && !on} onChange={() => toggle(f.id, v)} className="h-4 w-4 accent-[var(--color-olive)]" />
                        {f.labelOf(v)}
                      </span>
                      <span className="text-ink-soft">({count})</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );

  const chips = [
    ...facets.flatMap((f) => selected[f.id].map((v) => ({ key: `${f.id}:${v}`, label: f.labelOf(v), remove: () => toggle(f.id, v) }))),
    ...(min || max !== Infinity
      ? [{ key: "price", label: max === Infinity ? `$${min}+` : `$${min} – $${max}`, remove: () => update((p) => (p.delete("min"), p.delete("max"))) }]
      : []),
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside aria-label="Filters" className="lg:sticky lg:top-32 lg:self-start">
        <button type="button" className="btn-outline w-full lg:hidden" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((o) => !o)}>
          {filtersOpen ? "Hide filters" : `Filters${activeCount ? ` (${activeCount})` : ""}`}
        </button>
        <div className={`${filtersOpen ? "mt-4 block card p-5" : "hidden"} lg:block lg:border-0 lg:bg-transparent lg:p-0`}>{sidebar}</div>
      </aside>

      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "gift" : "gifts"}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-ink-soft">Sort</span>
              <select value={sort} onChange={(e) => update((p) => p.set("sort", e.target.value))} className="rounded-[4px] border border-line bg-white px-3 py-2">
                {Object.entries(sorts).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-ink-soft">Show</span>
              <select value={per} onChange={(e) => update((p) => p.set("per", e.target.value))} className="rounded-[4px] border border-line bg-white px-3 py-2">
                {PER_PAGE.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {chips.length ? (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <button key={c.key} type="button" onClick={c.remove} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm hover:border-olive/50" aria-label={`Remove filter ${c.label}`}>
                <span className="inline-flex items-center gap-1.5">
                  {c.label} <CloseIcon width={13} height={13} />
                </span>
              </button>
            ))}
            <button type="button" onClick={() => update((p) => ["min", "max", ...facets.map((f) => f.id)].forEach((k) => p.delete(k)))} className="text-sm font-semibold text-olive underline">
              Clear all
            </button>
          </div>
        ) : null}

        {shown.length === 0 ? (
          <p className="rounded-md border border-dashed border-line bg-white p-10 text-center text-ink-soft">{items.length ? "No gifts match these filters." : empty ?? "No gifts found."}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {pages > 1 ? (
          <nav aria-label="Pagination" className="mt-8 flex justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-current={n === page ? "page" : undefined}
                onClick={() => {
                  update((p) => p.set("page", String(n)), false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`h-10 w-10 rounded-full text-sm font-semibold ${n === page ? "bg-olive text-white" : "border border-line bg-white hover:border-olive/50"}`}
              >
                {n}
              </button>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
