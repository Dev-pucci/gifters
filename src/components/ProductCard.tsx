import { Link } from "react-router-dom";
import type { Product } from "../data/catalog";
import { productImage } from "../data/images";
import { useSections } from "../state/sections";
import { HeartIcon, StarIcon } from "./Icons";
import ProductArt from "./ProductArt";

export const money = (n: number) => `$${n.toFixed(2)}`;

export function PriceLine({ product, large }: { product: Product; large?: boolean }) {
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 ${large ? "text-xl" : "text-sm"}`}>
      {product.hasVariants ? <span className="text-xs text-ink-soft">From</span> : null}
      <span className="font-semibold text-ink">{money(product.price)}</span>
      <span className="text-xs text-ink-soft line-through decoration-1" aria-label={`Regular price ${money(product.compValue)}`}>
        {money(product.compValue)}
      </span>
    </p>
  );
}

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex text-gold" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} width={size} height={size} className={i <= Math.round(rating) ? "" : "opacity-25"} />
      ))}
    </span>
  );
}

export function Rating({ product }: { product: Product }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-ink-soft" aria-label={`Rated ${product.rating} out of 5 from ${product.reviews} reviews`}>
      <Stars rating={product.rating} />
      <span>({product.reviews.toLocaleString()})</span>
    </p>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const { isFavorite, toggleFavorite } = useSections();
  const fav = isFavorite(product.id);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(31,42,55,0.08)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/p/${product.slug}`} className="block overflow-hidden">
        <ProductArt art={product.art} image={productImage(product.slug)} label={product.name} className="transition duration-500 group-hover:scale-[1.04]" />
      </Link>
      {product.isNew ? <span className="absolute left-3 top-3 rounded-sm bg-olive px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">New</span> : null}
      <button
        type="button"
        onClick={() => toggleFavorite(product.id)}
        aria-pressed={fav}
        aria-label={fav ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
        className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm transition hover:scale-110 ${fav ? "text-brand" : "text-ink"}`}
      >
        <HeartIcon filled={fav} width={16} height={16} />
      </button>
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3.5">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-snug sm:text-sm">
          <Link to={`/p/${product.slug}`} className="hover:text-olive">
            {product.name}
          </Link>
        </h3>
        <Rating product={product} />
        <div className="mt-auto">
          <PriceLine product={product} />
        </div>
      </div>
    </article>
  );
}
