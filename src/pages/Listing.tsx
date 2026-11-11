import { useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import ProductGrid from "../components/ProductGrid";
import { getCategory, products, productsIn, searchProducts } from "../data/catalog";
import { useSections } from "../state/sections";
import NotFound from "./NotFound";

const special: Record<string, { name: string; blurb: string }> = {
  bestsellers: { name: "Bestsellers", blurb: "The gifts our customers come back for again and again." },
  new: { name: "New Arrivals", blurb: "Fresh designs, just added." },
  all: { name: "All Gifts", blurb: "Every gift we make, personalized for free." },
};

export function CategoryPage() {
  const { slug = "" } = useParams();
  const c = getCategory(slug) ?? special[slug];
  if (!c) return <NotFound />;
  return (
    <>
      <PageHeader eyebrow="Shop" title={c.name} intro={c.blurb} crumbs={[{ label: "Shop", to: "/c/all" }, { label: c.name }]} />
      <div className="container-page py-10">
        <ProductGrid key={slug} items={productsIn(slug)} />
      </div>
    </>
  );
}

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const max = Number(params.get("max")) || 0;
  const min = Number(params.get("min")) || 0;
  // A bare budget link (/search?max=25) browses everything; the grid applies the price filter.
  const items = q ? searchProducts(q) : min || max ? products : [];
  const title = q ? `Results for “${q}”` : max ? `Gifts under $${max}` : min ? `Gifts over $${min}` : "Search";
  return (
    <>
      <PageHeader eyebrow="Search" title={title} crumbs={[{ label: "Search" }]} />
      <div className="container-page py-10">
        <ProductGrid key={q} items={items} empty={q ? `We couldn't find gifts matching “${q}”. Try “mug”, “photo” or “ornament”.` : "Type in the search box to find a gift."} />
      </div>
    </>
  );
}

export function FavoritesPage() {
  const { favorite, ready } = useSections();
  const items = products.filter((p) => favorite.productIds.includes(p.id));
  return (
    <>
      <PageHeader eyebrow="Saved with love" title="Your favorites" crumbs={[{ label: "Favorites" }]} />
      <div className="container-page py-10">{ready || items.length ? <ProductGrid items={items} empty="Tap the heart on any gift to save it here." /> : <p className="text-ink-soft">Loading…</p>}</div>
    </>
  );
}
