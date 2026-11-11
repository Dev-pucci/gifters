import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchProducts } from "../data/catalog";
import { productImage } from "../data/images";
import { SearchIcon } from "./Icons";
import ProductArt from "./ProductArt";
import { money } from "./ProductCard";

/** Search field with keyboard-navigable suggestions (combobox pattern). */
export default function SearchBox({ onDone, compact = false }: { onDone?: () => void; compact?: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const listId = useId();
  const wrap = useRef<HTMLFormElement>(null);

  const results = useMemo(() => (q.trim().length >= 2 ? searchProducts(q).slice(0, 6) : []), [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    setActive(-1);
    navigate(path);
    onDone?.();
  };

  return (
    <form
      ref={wrap}
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && results[active]) go(`/p/${results[active].slug}`);
        else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search gifts
      </label>
      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={compact ? "Search..." : "Search for a gift, a name, an occasion…"}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, -1));
          } else if (e.key === "Escape") setOpen(false);
        }}
        className={`${compact ? "h-[34px] text-[13px]" : "h-11 text-sm"} w-full rounded-[4px] border border-transparent bg-white pl-5 pr-12 text-ink placeholder:text-ink-soft/80 focus:border-olive focus:outline-none`}
      />
      <button type="submit" aria-label="Search" className={`absolute right-1.5 top-1/2 grid -translate-y-1/2 place-items-center rounded-full text-ink hover:bg-cream ${compact ? "h-7 w-7" : "h-8 w-8"}`}>
        <SearchIcon width={18} height={18} />
      </button>

      {open && results.length > 0 ? (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden card py-2 text-ink shadow-xl">
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(`/p/${p.slug}`);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2 ${i === active ? "bg-cream" : ""}`}
            >
              <div className="w-10 shrink-0 overflow-hidden rounded-lg">
                <ProductArt art={p.art} image={productImage(p.slug)} size="sm" />
              </div>
              <span className="flex-1 text-sm font-medium">{p.name}</span>
              <span className="text-sm font-semibold text-ink">{money(p.price)}</span>
            </li>
          ))}
          <li
            role="option"
            aria-selected={false}
            onMouseDown={(e) => {
              e.preventDefault();
              go(`/search?q=${encodeURIComponent(q.trim())}`);
            }}
            className="cursor-pointer border-t border-line px-4 pt-2 text-sm font-semibold text-olive hover:underline"
          >
            See all results for “{q.trim()}”
          </li>
        </ul>
      ) : null}
    </form>
  );
}
