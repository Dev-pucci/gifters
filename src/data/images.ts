// Image for each slot: an admin upload (from the active season or "all seasons") wins, then the
// generated/bundled image (see scripts/generate-images.mjs), then the built-in illustration fallback.
import { imageOverride } from "../lib/site";
import manifest from "./images.json";

const m = manifest as Record<string, string>;
const pick = (key: string): string | undefined => imageOverride(key) ?? m[key];

export const productImage = (slug: string): string | undefined => pick(`products/${slug}`);
export const categoryImage = (slug: string): string | undefined => pick(`categories/${slug}`);
export const heroImage = (): string | undefined => pick("hero/christmas");
/** Homepage banners: "personal-touch" and "newsletter". */
export const bannerImage = (name: "personal-touch" | "newsletter"): string | undefined => pick(`banners/${name}`);
/** The bundled image for a slot, ignoring admin uploads (used by the admin "reset" preview). */
export const defaultImage = (key: string): string | undefined => m[key];
