// Personalization rules, shared by the product page and the server (which re-validates every order).
import type { PersonalizationField, Product } from "../data/catalog.ts";

export type PersonalizationValues = Record<string, string>;

/** Normalizes a raw value the way the field expects (trim, letter case). */
export function normalize(field: PersonalizationField, raw: string | undefined): string {
  const v = (raw ?? "").replace(/\s+/g, " ").trim();
  if (field.type === "text" && field.textCase === "upper") return v.toUpperCase();
  return v;
}

/** Returns an error message, or null when the value is acceptable. */
export function validateField(field: PersonalizationField, raw: string | undefined): string | null {
  const v = normalize(field, raw);
  if (!v) return field.required ? (field.type === "swatch" ? `Choose a ${field.label.toLowerCase()}.` : field.type === "photo" ? "Upload a photo." : `${field.label} is required.`) : null;
  if (field.type === "text") {
    if (v.length < field.min) return `${field.label} needs at least ${field.min} characters.`;
    if (v.length > field.max) return `${field.label} can be at most ${field.max} characters.`;
    if (!new RegExp(field.pattern).test(v)) return field.patternMessage;
  }
  if (field.type === "swatch" && !field.options.some((o) => o.id === v)) return `Choose a ${field.label.toLowerCase()}.`;
  if (field.type === "photo" && !/^up_[a-z0-9]{16}$/.test(v)) return "Upload a photo.";
  return null;
}

export function validatePersonalization(product: Product, values: PersonalizationValues) {
  const errors: Record<string, string> = {};
  const clean: PersonalizationValues = {};
  for (const f of product.fields) {
    const err = validateField(f, values[f.id]);
    if (err) errors[f.id] = err;
    const v = normalize(f, values[f.id]);
    if (v) clean[f.id] = v;
  }
  return { ok: Object.keys(errors).length === 0, errors, clean };
}

/** Human-readable summary, e.g. "Name: Amara · Thread color: Gold". */
export function personalizationSummary(product: Product, values: PersonalizationValues): string {
  const parts = product.fields
    .map((f) => {
      const v = values[f.id];
      if (!v) return null;
      if (f.type === "swatch") return `${f.label}: ${f.options.find((o) => o.id === v)?.label ?? v}`;
      if (f.type === "photo") return "Photo uploaded";
      return f.id === "message" ? `“${v}”` : `${f.label}: ${v}`;
    })
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : "Not personalized";
}
