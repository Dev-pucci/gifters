import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { uploadUrl } from "../api/client";
import Carousel, { CarouselItem } from "../components/Carousel";
import { HeartIcon, PenIcon, ShieldIcon, TruckIcon } from "../components/Icons";
import { FieldInput, OptionPicker } from "../components/Personalize";
import ProductArt from "../components/ProductArt";
import ProductCard, { money, Rating } from "../components/ProductCard";
import QtyStepper from "../components/QtyStepper";
import { findVariant, getCategory, getProduct, products, variantKey, type Product } from "../data/catalog";
import { productImage } from "../data/images";
import { earliestArrival, formatDay } from "../lib/dates";
import { validatePersonalization, type PersonalizationValues } from "../lib/personalization";
import { SHIPPING_METHODS } from "../lib/pricing";
import { useSections } from "../state/sections";
import NotFound from "./NotFound";

const parseKey = (key: string) => Object.fromEntries(key === "default" ? [] : key.split("|").map((p) => p.split(":") as [string, string]));

/** Option values that would land on an out-of-stock variant, given the other current selections. */
function unavailableFor(product: Product, groupId: string, selection: Record<string, string>) {
  const out = new Set<string>();
  const group = product.options.find((g) => g.id === groupId)!;
  for (const v of group.values) {
    const candidates = product.variants.filter((variant) => variant.selection[groupId] === v.id && Object.entries(selection).every(([g, val]) => g === groupId || variant.selection[g] === val));
    if (candidates.length && candidates.every((c) => !c.inStock)) out.add(v.id);
  }
  return out;
}

export default function ProductPage() {
  const { slug = "" } = useParams();
  const product = getProduct(slug);
  return product ? <ProductView key={product.id} product={product} /> : <NotFound />;
}

function ProductView({ product }: { product: Product }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { cart, addToCart, updateLine, isFavorite, toggleFavorite } = useSections();
  const editId = params.get("edit");
  const editing = editId ? cart.items.find((l) => l.lineId === editId) : undefined;

  const [values, setValues] = useState<PersonalizationValues>(() => editing?.personalization ?? {});
  const [qty, setQty] = useState(editing?.qty ?? 1);
  const [step, setStep] = useState<"options" | "personalize">(editing || product.options.length === 0 ? "personalize" : "options");
  const [showOptionErrors, setShowOptionErrors] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [localPhoto, setLocalPhoto] = useState<string>();
  const formRef = useRef<HTMLDivElement>(null);

  // Selection lives in the URL (?size=15oz&handle=black), like the original site, so a variant is linkable.
  const selection = useMemo(() => {
    const fromUrl: Record<string, string> = {};
    for (const g of product.options) {
      const v = params.get(g.id);
      if (v && g.values.some((x) => x.id === v)) fromUrl[g.id] = v;
    }
    return fromUrl;
  }, [params, product.options]);

  // When editing a cart line, seed the URL with that line's options once.
  useEffect(() => {
    if (!editing || Object.keys(selection).length) return;
    const sel = parseKey(editing.variantKey);
    setParams((p) => {
      const next = new URLSearchParams(p);
      for (const [g, v] of Object.entries(sel)) next.set(g, v);
      return next;
    }, { replace: true });
  }, [editing?.lineId]);

  useEffect(() => () => {
    if (localPhoto) URL.revokeObjectURL(localPhoto);
  }, [localPhoto]);

  const complete = product.options.every((g) => selection[g.id]);
  const variant = complete ? findVariant(product, variantKey(selection, product.options)) : undefined;
  const validation = validatePersonalization(product, values);
  const fieldError = (id: string) => (triedSubmit || values[id] ? validation.errors[id] ?? null : null);

  const textValues = product.fields.filter((f) => f.type === "text" && values[f.id] && f.id !== "message").map((f) => values[f.id]);
  const overlay = textValues.join(" · ") || (values.message ? `“${values.message}”` : undefined);
  const swatchField = product.fields.find((f) => f.type === "swatch");
  const swatch = swatchField?.type === "swatch" ? swatchField.options.find((o) => o.id === values[swatchField.id]) : undefined;
  const photoValue = product.fields.find((f) => f.type === "photo") ? values.photo : undefined;
  const photoUrl = localPhoto ?? (photoValue ? uploadUrl(photoValue) : undefined);

  const fav = isFavorite(product.id);
  const category = getCategory(product.categories[0]);
  const related = products.filter((x) => x.id !== product.id && x.categories.some((c) => product.categories.includes(c))).slice(0, 8);
  const arrival = formatDay(earliestArrival(product.leadDays, SHIPPING_METHODS.standard.transitDays));
  const expressArrival = formatDay(earliestArrival(product.leadDays, SHIPPING_METHODS.express.transitDays));
  const shownPrice = variant ?? { price: product.price, compValue: product.compValue };

  const choose = (groupId: string, valueId: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set(groupId, valueId);
      return next;
    }, { replace: true });

  const onPrimary = async () => {
    setServerError(null);
    if (step === "options") {
      if (!complete) return setShowOptionErrors(true);
      if (!variant?.inStock) return setServerError("That combination is out of stock. Please choose another option.");
      setStep("personalize");
      requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setTriedSubmit(true);
    if (!complete) return setShowOptionErrors(true);
    if (!variant?.inStock) return setServerError("That combination is out of stock. Please choose another option.");
    if (!validation.ok) return;
    setBusy(true);
    try {
      if (editing) {
        await updateLine(editing.lineId, { variantKey: variant.key, personalization: validation.clean, qty });
        navigate("/cart");
      } else {
        await addToCart(product.id, variant.key, qty, validation.clean);
      }
    } catch (e) {
      setServerError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="container-page py-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-soft">
          <Link to="/" className="hover:text-olive">
            Home
          </Link>
          {category ? (
            <>
              {" / "}
              <Link to={`/c/${category.slug}`} className="hover:text-olive">
                {category.name}
              </Link>
            </>
          ) : null}
          {" / "}
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="card overflow-hidden">
              <ProductArt art={product.art} image={productImage(product.slug)} eager overlay={overlay} overlayColor={swatch?.colors[0]} photoUrl={photoUrl} size="lg" label={`Preview of ${product.name}`} />
            </div>
            <p className="mt-3 text-center text-xs text-ink-soft">{variant ? variant.label : "Choose your options"} · live preview updates as you personalize</p>
          </div>

          <div>
            {product.isNew ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-pine">New</p> : null}
            <h1 className="font-display text-3xl font-medium sm:text-4xl">{product.name}</h1>
            <div className="mt-3">
              <Rating product={product} />
            </div>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-2 text-xl" aria-live="polite">
              {!variant && product.hasVariants ? <span className="text-ink-soft">Starting at</span> : null}
              <span className="font-semibold text-ink">{money(shownPrice.price)}</span>
              <span className="text-ink-soft line-through decoration-1">{money(shownPrice.compValue)}</span>
              <span className="text-sm text-pine">Save {money(shownPrice.compValue - shownPrice.price)}</span>
            </p>
            <p className="mt-4 text-ink-soft">{product.description}</p>

            <div className="mt-8 space-y-6 card p-5 sm:p-6">
              {product.options.map((g) => (
                <OptionPicker key={g.id} group={g} value={selection[g.id]} onChange={(v) => choose(g.id, v)} unavailable={unavailableFor(product, g.id, selection)} showError={showOptionErrors} />
              ))}

              {variant && !variant.inStock ? <p className="text-sm font-medium text-brand">This combination is out of stock.</p> : null}

              {step === "personalize" ? (
                <div ref={formRef} className="space-y-5 rounded-md bg-linen p-4 sm:p-5">
                  <h2 className="flex items-center gap-2 font-display text-xl font-medium">
                    <PenIcon width={20} height={20} className="text-olive" /> Personalize it — free
                  </h2>
                  {product.fields.map((f) => (
                    <FieldInput key={f.id} field={f} value={values[f.id] ?? ""} onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))} error={fieldError(f.id)} onPreview={setLocalPhoto} />
                  ))}
                </div>
              ) : null}

              <div className="flex items-start gap-2 border-y border-line py-3 text-sm">
                <TruckIcon width={18} height={18} className="mt-0.5 shrink-0 text-olive" />
                <p>
                  Earliest arrival <strong>{arrival}</strong> <span className="text-ink-soft">· Express by {expressArrival}</span>
                </p>
              </div>

              {serverError ? (
                <p role="alert" className="text-sm font-medium text-brand">
                  {serverError}
                </p>
              ) : null}
              {triedSubmit && !validation.ok ? (
                <p role="alert" className="text-sm font-medium text-brand">
                  Please fix the highlighted personalization fields.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <QtyStepper qty={qty} onChange={(q) => setQty(Math.min(99, Math.max(1, q)))} label={product.name} />
                <button type="button" onClick={onPrimary} disabled={busy} className="btn-primary flex-1">
                  {busy ? "Saving…" : step === "options" ? "Personalize" : editing ? "Update item" : "Add to cart"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleFavorite(product.id)}
                  aria-pressed={fav}
                  aria-label={fav ? "Remove from favorites" : "Save to favorites"}
                  className={`grid h-12 w-12 place-items-center rounded-full border border-line bg-white ${fav ? "text-brand" : ""}`}
                >
                  <HeartIcon filled={fav} />
                </button>
              </div>
            </div>

            <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <PenIcon width={18} height={18} className="text-olive" /> Free personalization
              </li>
              <li className="flex items-center gap-2">
                <TruckIcon width={18} height={18} className="text-olive" /> Free shipping over $59
              </li>
              <li className="flex items-center gap-2">
                <ShieldIcon width={18} height={18} className="text-olive" /> Love-it guarantee
              </li>
            </ul>
          </div>
        </div>
      </div>

      {related.length ? (
        <Carousel title="You might also love">
          {related.map((r) => (
            <CarouselItem key={r.id}>
              <ProductCard product={r} />
            </CarouselItem>
          ))}
        </Carousel>
      ) : null}
    </>
  );
}
