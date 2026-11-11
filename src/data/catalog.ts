// Product catalog, modeled on the variant + personalization structure observed on
// gifts.com (see docs/gifts-com-teardown.md):
//   - option groups (size, color, set…) whose every combination is its own variant
//     with its own SKU, price and stock flag;
//   - personalization fields per product with length limits, an allowed-character
//     pattern, letter case and suggestions; "swatch" fields pick from icon options.
// This file is shared by the browser and the Node server (server/index.mjs), so it
// must stay free of imports and non-erasable TypeScript.

export type Recipient = "her" | "him" | "kids" | "baby" | "couple" | "family";
export type Occasion = "christmas" | "wedding" | "birthday" | "new-baby" | "anniversary" | "everyday";
export type ProductType =
  | "Drinkware"
  | "Home Décor"
  | "Ornaments & Stockings"
  | "Apparel & Accessories"
  | "Blankets & Throws"
  | "Jewelry"
  | "Toys & Plush"
  | "Barware & Entertaining";

export const recipientLabels: Record<Recipient, string> = { her: "Her", him: "Him", kids: "Kids", baby: "Baby", couple: "Couples", family: "Family" };
export const occasionLabels: Record<Occasion, string> = { christmas: "Christmas", wedding: "Wedding", birthday: "Birthday", "new-baby": "New Baby", anniversary: "Anniversary", everyday: "Just Because" };

export interface Art {
  emoji: string;
  from: string;
  to: string;
}

export interface OptionValue {
  id: string;
  label: string;
  /** Added to the base price before multipliers. */
  priceDelta?: number;
  /** Multiplies the price, e.g. a set of 4. */
  multiplier?: number;
  /** CSS color shown as a swatch on the option tile. */
  swatch?: string;
}

export interface OptionGroup {
  id: string;
  label: string;
  values: OptionValue[];
}

export interface Variant {
  /** Stable key, e.g. "size:15oz|handle:black|set:2". "default" when a product has no options. */
  key: string;
  sku: string;
  label: string;
  price: number;
  compValue: number;
  inStock: boolean;
  selection: Record<string, string>;
}

export interface TextField {
  id: string;
  type: "text";
  label: string;
  required: boolean;
  min: number;
  max: number;
  /** Regular expression source the whole value must match. */
  pattern: string;
  patternMessage: string;
  textCase: "mixed" | "upper";
  suggestions?: string[];
  placeholder?: string;
  /** Render as an A–Z letter picker instead of a text box. */
  ui?: "letters";
}

export interface SwatchOption {
  id: string;
  label: string;
  colors: [string, string];
}

export interface SwatchField {
  id: string;
  type: "swatch";
  label: string;
  required: boolean;
  options: SwatchOption[];
}

export interface PhotoField {
  id: string;
  type: "photo";
  label: string;
  required: boolean;
}

export type PersonalizationField = TextField | SwatchField | PhotoField;

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  reviews: number;
  rating: number;
  isNew?: boolean;
  categories: string[];
  recipients: Recipient[];
  occasions: Occasion[];
  type: ProductType;
  art: Art;
  /** Business days to make the item before it ships. */
  leadDays: number;
  options: OptionGroup[];
  variants: Variant[];
  fields: PersonalizationField[];
  /** Lowest in-stock variant price ("Starting at"). */
  price: number;
  compValue: number;
  hasVariants: boolean;
}

export interface Category {
  slug: string;
  name: string;
  blurb: string;
  art: Art;
}

// ---------- personalization field presets ----------

const NAME_PATTERN = "^[A-Za-z' .,&-]*$";
const NAME_MESSAGE = "Only letters, spaces and - ' , . & are allowed.";
const NAME_SUGGESTIONS = ["Amara", "Wanjiru", "Kofi", "Sofia", "Liam", "Zara", "Noah", "Maya"];
const FAMILY_SUGGESTIONS = ["The Okafors", "The Kamaus", "The Garcias", "The Smiths"];

const nameField = (label = "Name", max = 12, min = 2, id = "name", suggestions = NAME_SUGGESTIONS): TextField => ({
  id,
  type: "text",
  label,
  required: true,
  min,
  max,
  pattern: NAME_PATTERN,
  patternMessage: NAME_MESSAGE,
  textCase: "mixed",
  suggestions,
  placeholder: suggestions[0],
});

const messageField = (max = 40, required = false): TextField => ({
  id: "message",
  type: "text",
  label: "Message",
  required,
  min: required ? 2 : 0,
  max,
  pattern: "^[^<>{}]*$",
  patternMessage: "Please avoid the characters < > { }.",
  textCase: "mixed",
  placeholder: "Love you to the moon",
});

const initialField = (): TextField => ({
  id: "initial",
  type: "text",
  label: "Initial",
  required: true,
  min: 1,
  max: 1,
  pattern: "^[A-Z]$",
  patternMessage: "Choose a single letter A–Z.",
  textCase: "upper",
  ui: "letters",
});

const yearField = (): TextField => ({
  id: "year",
  type: "text",
  label: "Year",
  required: true,
  min: 4,
  max: 4,
  pattern: "^(19|20)[0-9]{2}$",
  patternMessage: "Enter a year like 2026.",
  textCase: "mixed",
  suggestions: ["2026", "2027"],
  placeholder: "2026",
});

const namesListField = (max = 60): TextField => ({
  id: "names",
  type: "text",
  label: "Names (separate with commas)",
  required: true,
  min: 2,
  max,
  pattern: NAME_PATTERN,
  patternMessage: NAME_MESSAGE,
  textCase: "mixed",
  placeholder: "Amara, Kofi, Zara",
});

const COLOR_PAIRS: SwatchOption[] = [
  { id: "cranberry-gold", label: "Cranberry & Gold", colors: ["#b4233c", "#c8962e"] },
  { id: "navy-sky", label: "Navy & Sky", colors: ["#1f3a5f", "#7fb2e5"] },
  { id: "pine-sage", label: "Pine & Sage", colors: ["#2f6b4f", "#a8c9a0"] },
  { id: "plum-blush", label: "Plum & Blush", colors: ["#5b2a52", "#e9a5b8"] },
  { id: "charcoal-silver", label: "Charcoal & Silver", colors: ["#33383f", "#b9c0c8"] },
  { id: "teal-coral", label: "Teal & Coral", colors: ["#1d7a7a", "#f08a6c"] },
];

const THREAD_COLORS: SwatchOption[] = [
  { id: "white", label: "White", colors: ["#ffffff", "#e5e5e5"] },
  { id: "gold", label: "Gold", colors: ["#c8962e", "#e8c46a"] },
  { id: "red", label: "Red", colors: ["#b4233c", "#d9475d"] },
  { id: "navy", label: "Navy", colors: ["#1f3a5f", "#3c5f8c"] },
  { id: "green", label: "Green", colors: ["#2f6b4f", "#4f9470"] },
];

const colorField = (label = "Name color", options = COLOR_PAIRS): SwatchField => ({ id: "color", type: "swatch", label, required: true, options });
const photoField = (required = true): PhotoField => ({ id: "photo", type: "photo", label: "Photo", required });

// ---------- option group presets ----------

const og = (id: string, label: string, values: OptionValue[]): OptionGroup => ({ id, label, values });
const sets = og("set", "Set size", [
  { id: "1", label: "Single" },
  { id: "2", label: "Set of 2", multiplier: 2 },
  { id: "4", label: "Set of 4", multiplier: 4 },
]);

// ---------- builder ----------

interface Def {
  id: string;
  slug: string;
  name: string;
  description: string;
  reviews: number;
  rating: number;
  isNew?: boolean;
  categories: string[];
  recipients: Recipient[];
  occasions: Occasion[];
  type: ProductType;
  art: Art;
  /** Sale price of the cheapest combination before deltas/multipliers. */
  price: number;
  compValue: number;
  leadDays?: number;
  options?: OptionGroup[];
  /** Variant keys that are out of stock. */
  soldOut?: string[];
  fields: PersonalizationField[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function cartesian(groups: OptionGroup[]): OptionValue[][] {
  return groups.reduce<OptionValue[][]>((acc, g) => acc.flatMap((combo) => g.values.map((v) => [...combo, v])), [[]]);
}

export const variantKey = (selection: Record<string, string>, groups: OptionGroup[]) =>
  groups.length ? groups.map((g) => `${g.id}:${selection[g.id]}`).join("|") : "default";

function build(d: Def): Product {
  const options = d.options ?? [];
  const ratio = d.compValue / d.price;
  const variants: Variant[] = cartesian(options).map((combo) => {
    const selection = Object.fromEntries(combo.map((v, i) => [options[i].id, v.id]));
    const key = variantKey(selection, options);
    const add = combo.reduce((s, v) => s + (v.priceDelta ?? 0), 0);
    const mult = combo.reduce((m, v) => m * (v.multiplier ?? 1), 1);
    const price = r2((d.price + add) * mult);
    return {
      key,
      sku: `HG-${d.id.toUpperCase()}${combo.length ? "-" + combo.map((v) => v.id.toUpperCase()).join("-") : ""}`,
      label: combo.length ? combo.map((v) => v.label).join(" · ") : "Standard",
      price,
      compValue: r2(price * ratio),
      inStock: !(d.soldOut ?? []).includes(key),
      selection,
    };
  });
  const cheapest = variants.filter((v) => v.inStock).sort((a, b) => a.price - b.price)[0] ?? variants[0];
  const { soldOut: _s, options: _o, price: _p, compValue: _c, leadDays, ...rest } = d;
  return {
    ...rest,
    leadDays: leadDays ?? 2,
    options,
    variants,
    price: cheapest.price,
    compValue: cheapest.compValue,
    hasVariants: new Set(variants.map((v) => v.price)).size > 1,
  };
}

// ---------- data ----------

export const categories: Category[] = [
  { slug: "for-him", name: "Gifts for Him", blurb: "Customized by the people who know him best.", art: { emoji: "🧔", from: "#dbe7f3", to: "#a9c4e0" } },
  { slug: "for-her", name: "Gifts for Her", blurb: "Thoughtful keepsakes she'll treasure.", art: { emoji: "💐", from: "#fbe3ea", to: "#f2b6c6" } },
  { slug: "baby", name: "Gifts for Babies", blurb: "Soft, sweet and made with their name.", art: { emoji: "🍼", from: "#fdf3d7", to: "#f6d98b" } },
  { slug: "kids", name: "Gifts for Kids", blurb: "Playful gifts that are all theirs.", art: { emoji: "🧸", from: "#e3f4ea", to: "#a8dcbc" } },
  { slug: "home", name: "Home Décor", blurb: "Make the house feel like family.", art: { emoji: "🏡", from: "#efe7dc", to: "#d5c0a2" } },
  { slug: "photo", name: "Photo Gifts", blurb: "Your favorite moments, made to keep.", art: { emoji: "📸", from: "#e6e3f6", to: "#bdb4e8" } },
  { slug: "drinkware", name: "Mugs & Drinkware", blurb: "Every sip, personalized.", art: { emoji: "☕", from: "#f3e6dc", to: "#dcb79a" } },
  { slug: "christmas", name: "Christmas", blurb: "Ornaments, stockings and holiday cheer.", art: { emoji: "🎄", from: "#dcefe2", to: "#8fc7a2" } },
  { slug: "wedding", name: "Wedding & Anniversary", blurb: "Celebrate the two of you.", art: { emoji: "💍", from: "#f4eef7", to: "#d6c3e3" } },
  { slug: "under-25", name: "Under $25", blurb: "Big feelings, small price.", art: { emoji: "🎁", from: "#fde8e1", to: "#f5b9a4" } },
];

export const products: Product[] = [
  build({
    id: "p1", slug: "family-name-stocking", name: "Family Name Knit Stocking", price: 14.99, compValue: 29.99, reviews: 650, rating: 4.8,
    categories: ["christmas", "kids", "under-25"], recipients: ["kids", "family"], occasions: ["christmas"], type: "Ornaments & Stockings",
    description: "A chunky knit stocking with an embroidered name cuff. Hang one for everyone.",
    art: { emoji: "🧦", from: "#f9dcdc", to: "#e88f8f" },
    options: [og("color", "Stocking color", [{ id: "red", label: "Red", swatch: "#b4233c" }, { id: "green", label: "Green", swatch: "#2f6b4f" }, { id: "gray", label: "Gray", swatch: "#9aa1aa" }])],
    soldOut: ["color:gray"],
    fields: [nameField("Name", 12), colorField("Thread color", THREAD_COLORS)],
  }),
  build({
    id: "p2", slug: "photo-color-mug", name: "Photo Memory Color Mug", price: 10.49, compValue: 14.99, reviews: 2491, rating: 4.9,
    categories: ["drinkware", "photo", "under-25", "for-her", "for-him"], recipients: ["her", "him", "family"], occasions: ["everyday", "birthday"], type: "Drinkware",
    description: "Ceramic mug printed edge-to-edge with your photo and a short message. Microwave and dishwasher safe.",
    art: { emoji: "☕", from: "#f3e6dc", to: "#d9a77f" },
    options: [
      og("size", "Size", [{ id: "11oz", label: "11 oz" }, { id: "15oz", label: "15 oz", priceDelta: 4 }]),
      og("handle", "Handle color", [{ id: "white", label: "White", swatch: "#ffffff" }, { id: "black", label: "Black", swatch: "#1f2a37", priceDelta: 2 }, { id: "red", label: "Red", swatch: "#b4233c", priceDelta: 2 }, { id: "navy", label: "Navy", swatch: "#1f3a5f", priceDelta: 2 }]),
      sets,
    ],
    fields: [photoField(true), messageField(30)],
  }),
  build({
    id: "p3", slug: "home-sweet-home-pillow", name: "Home for the Holidays Pillow", price: 27.99, compValue: 39.99, reviews: 312, rating: 4.7,
    categories: ["home", "christmas"], recipients: ["family"], occasions: ["christmas"], type: "Home Décor",
    description: "Cross-stitch style throw pillow finished with your family name.",
    art: { emoji: "🛋️", from: "#dbeee3", to: "#7fb894" },
    options: [og("size", "Size", [{ id: "14", label: '14" square' }, { id: "18", label: '18" square', priceDelta: 8 }])],
    fields: [nameField("Family name", 18, 2, "name", FAMILY_SUGGESTIONS)],
  }),
  build({
    id: "p4", slug: "crystal-photo-block", name: "Crystal Photo Keepsake Block", price: 34.99, compValue: 49.99, reviews: 190, rating: 4.8,
    categories: ["photo", "home", "wedding"], recipients: ["couple", "family", "her"], occasions: ["wedding", "anniversary", "everyday"], type: "Home Décor",
    description: "Your photo laser-etched into a beveled glass block that glows in sunlight.",
    art: { emoji: "🖼️", from: "#e6eef8", to: "#a7bfe0" },
    leadDays: 4,
    options: [og("size", "Size", [{ id: "s", label: "Small 4×6" }, { id: "m", label: "Medium 6×8", priceDelta: 10 }, { id: "l", label: "Large 8×10", priceDelta: 25 }])],
    fields: [photoField(true), messageField(40)],
  }),
  build({
    id: "p5", slug: "initial-gift-sack", name: "Oversized Initial Gift Sack", price: 19.99, compValue: 29.99, reviews: 88, rating: 4.6,
    categories: ["christmas", "kids", "under-25"], recipients: ["kids", "family"], occasions: ["christmas"], type: "Ornaments & Stockings",
    description: "A drawstring sack big enough for the biggest present, with a festive initial and name.",
    art: { emoji: "🎅", from: "#fbe2e2", to: "#e7a0a0" },
    fields: [initialField(), nameField("Name", 12)],
  }),
  build({
    id: "p6", slug: "family-wreath-ornament", name: "Family Wreath Ornament 2026", price: 11.99, compValue: 23.99, reviews: 41, rating: 4.9, isNew: true,
    categories: ["christmas", "under-25"], recipients: ["family"], occasions: ["christmas"], type: "Ornaments & Stockings",
    description: "An acrylic wreath ornament with up to six family names and the year.",
    art: { emoji: "🎄", from: "#dcefe2", to: "#6fb187" },
    fields: [nameField("Family name", 16, 2, "name", FAMILY_SUGGESTIONS), namesListField(60), yearField()],
  }),
  build({
    id: "p7", slug: "stoneware-collection", name: "Made With Love Stoneware Set", price: 24.99, compValue: 39.99, reviews: 79, rating: 4.7,
    categories: ["home", "for-her", "drinkware"], recipients: ["her", "family"], occasions: ["everyday", "wedding"], type: "Home Décor",
    description: "Hand-glazed stoneware stamped with your family name and a recipe-card message.",
    art: { emoji: "🥣", from: "#f1ebe3", to: "#cdb69a" },
    options: [og("piece", "Piece", [{ id: "bowl", label: "Serving bowl" }, { id: "plate", label: "Platter", priceDelta: 10 }, { id: "set", label: "Bowl + platter", priceDelta: 30 }])],
    fields: [nameField("Family name", 16, 2, "name", FAMILY_SUGGESTIONS), messageField(30)],
  }),
  build({
    id: "p8", slug: "embroidered-initial-cap", name: "Embroidered Initial Cap", price: 14.99, compValue: 29.99, reviews: 23, rating: 4.5, isNew: true,
    categories: ["for-him", "under-25"], recipients: ["him"], occasions: ["everyday", "birthday"], type: "Apparel & Accessories",
    description: "A washed-cotton cap with a single embroidered initial on the front.",
    art: { emoji: "🧢", from: "#dfe6ee", to: "#8ea4bd" },
    options: [og("color", "Cap color", [{ id: "navy", label: "Navy", swatch: "#1f3a5f" }, { id: "khaki", label: "Khaki", swatch: "#c9b48a" }, { id: "black", label: "Black", swatch: "#1f2a37" }])],
    soldOut: ["color:khaki"],
    fields: [initialField(), colorField("Thread color", THREAD_COLORS)],
  }),
  build({
    id: "p9", slug: "photo-teddy-tee", name: "Photo Message Teddy Bear", price: 20.99, compValue: 29.99, reviews: 7, rating: 4.6, isNew: true,
    categories: ["kids", "baby", "photo"], recipients: ["kids", "baby", "her"], occasions: ["birthday", "everyday"], type: "Toys & Plush",
    description: "A soft plush bear wearing a t-shirt printed with your photo and note.",
    art: { emoji: "🧸", from: "#f4e7d6", to: "#d8ae7c" },
    options: [og("size", "Size", [{ id: "10", label: '10" bear' }, { id: "16", label: '16" bear', priceDelta: 12 }])],
    fields: [photoField(true), messageField(24)],
  }),
  build({
    id: "p10", slug: "hooray-wine-glass", name: "Hooray for Today Wine Glass", price: 10.49, compValue: 14.99, reviews: 12, rating: 4.4, isNew: true,
    categories: ["drinkware", "for-her", "under-25"], recipients: ["her"], occasions: ["birthday"], type: "Barware & Entertaining",
    description: "A stemless wine glass etched with a name and a little celebration.",
    art: { emoji: "🥂", from: "#f6efe0", to: "#e3cf9b" },
    options: [sets],
    fields: [nameField("Name", 12)],
  }),
  build({
    id: "p11", slug: "photo-slate-plaque", name: "Natural Slate Photo Plaque", price: 27.99, compValue: 39.99, reviews: 259, rating: 4.8,
    categories: ["photo", "home"], recipients: ["family", "couple"], occasions: ["everyday", "anniversary"], type: "Home Décor",
    description: "A rough-edged slate tile printed with your photo. Includes a display stand.",
    art: { emoji: "🪨", from: "#e2e4e7", to: "#9aa1aa" },
    leadDays: 3,
    options: [og("shape", "Shape", [{ id: "rect", label: "Rectangle" }, { id: "heart", label: "Heart", priceDelta: 5 }])],
    fields: [photoField(true), messageField(40)],
  }),
  build({
    id: "p12", slug: "name-beverage-tub", name: "Name & Initial Beverage Tub", price: 41.99, compValue: 59.99, reviews: 1334, rating: 4.9,
    categories: ["for-him", "home"], recipients: ["him", "family"], occasions: ["everyday", "birthday"], type: "Barware & Entertaining",
    description: "A galvanized party tub for drinks on ice, stamped with your family name and initial.",
    art: { emoji: "🧊", from: "#e1eef2", to: "#93c1cf" },
    options: [og("size", "Size", [{ id: "std", label: "Standard" }, { id: "xl", label: "Extra large", priceDelta: 15 }])],
    fields: [initialField(), nameField("Family name", 16, 2, "name", FAMILY_SUGGESTIONS)],
  }),
  build({
    id: "p13", slug: "snuggle-rag-doll", name: "Holiday Snuggle Rag Doll", price: 29.99, compValue: 42.99, reviews: 156, rating: 4.8,
    categories: ["kids", "baby", "christmas"], recipients: ["kids", "baby"], occasions: ["christmas"], type: "Toys & Plush",
    description: "A cuddly rag doll in holiday pajamas, with the name stitched on the chest.",
    art: { emoji: "🪆", from: "#fbe4e4", to: "#e9a3a3" },
    fields: [nameField("Name", 10), colorField("Thread color", THREAD_COLORS)],
  }),
  build({
    id: "p14", slug: "name-night-light", name: "My Own Name Night Light", price: 32.99, compValue: 46.99, reviews: 402, rating: 4.9,
    categories: ["baby", "kids"], recipients: ["baby", "kids"], occasions: ["new-baby", "birthday"], type: "Home Décor",
    description: "A soft-glow LED night light with the little one's name cut in acrylic.",
    art: { emoji: "🌙", from: "#e7e5f6", to: "#a9a2dc" },
    fields: [nameField("Name", 10)],
  }),
  build({
    id: "p15", slug: "scripted-baby-blanket", name: "Scripted With Love Baby Blanket", price: 44.99, compValue: 64.99, reviews: 811, rating: 4.9,
    categories: ["baby"], recipients: ["baby"], occasions: ["new-baby"], type: "Blankets & Throws",
    description: "A plush minky blanket with the baby's name in flowing script.",
    art: { emoji: "👶", from: "#fdf3d7", to: "#f1d07a" },
    options: [
      og("size", "Size", [{ id: "baby", label: "Baby 30×40" }, { id: "toddler", label: "Toddler 50×60", priceDelta: 20 }]),
      og("color", "Blanket color", [{ id: "pink", label: "Pink", swatch: "#f2b6c6" }, { id: "blue", label: "Blue", swatch: "#a9c4e0" }, { id: "cream", label: "Cream", swatch: "#f3ead8" }, { id: "gray", label: "Gray", swatch: "#c3c8ce" }]),
    ],
    soldOut: ["size:toddler|color:cream"],
    fields: [nameField("Baby's name", 12), messageField(30)],
  }),
  build({
    id: "p16", slug: "wine-barrel-tray", name: "Wine Barrel Serving Tray", price: 62.99, compValue: 89.99, reviews: 97, rating: 4.7,
    categories: ["wedding", "home", "for-him"], recipients: ["couple", "him"], occasions: ["wedding", "anniversary"], type: "Barware & Entertaining",
    description: "Reclaimed-look oak tray engraved with your names and wedding year.",
    art: { emoji: "🍷", from: "#f1e4e4", to: "#b97b7b" },
    leadDays: 4,
    fields: [nameField("Names", 24, 3, "name", ["Amara & Kofi", "Sofia & Liam"]), yearField()],
  }),
  build({
    id: "p17", slug: "toasting-flutes", name: "Timeless Love Toasting Flutes", price: 49.99, compValue: 69.99, reviews: 64, rating: 4.8,
    categories: ["wedding"], recipients: ["couple"], occasions: ["wedding", "anniversary"], type: "Barware & Entertaining",
    description: "A pair of crystal flutes, one etched with each name, plus the big day.",
    art: { emoji: "🥂", from: "#f4eef7", to: "#c9b2db" },
    fields: [nameField("First name", 12, 2, "name1"), nameField("Second name", 12, 2, "name2", ["Kofi", "Liam", "Noah"]), yearField()],
  }),
  build({
    id: "p18", slug: "wedding-photo-blanket", name: "United in Love Photo Blanket", price: 69.99, compValue: 99.99, reviews: 133, rating: 4.8,
    categories: ["wedding", "photo"], recipients: ["couple"], occasions: ["wedding", "anniversary"], type: "Blankets & Throws",
    description: "A plush fleece throw printed with your wedding photo and names.",
    art: { emoji: "💞", from: "#fbe3ea", to: "#e894ad" },
    leadDays: 4,
    options: [og("size", "Size", [{ id: "50x60", label: "50×60" }, { id: "60x80", label: "60×80", priceDelta: 25 }])],
    fields: [photoField(true), nameField("Names", 24, 3, "name", ["Amara & Kofi", "Sofia & Liam"])],
  }),
  build({
    id: "p19", slug: "cherished-wood-block", name: "Cherished Memories Wood Block", price: 29.99, compValue: 44.99, reviews: 214, rating: 4.7,
    categories: ["home", "photo"], recipients: ["family", "her"], occasions: ["everyday"], type: "Home Décor",
    description: "A thick maple block printed with a photo and a line you'll want to keep.",
    art: { emoji: "🪵", from: "#efe4d4", to: "#c9a77a" },
    fields: [photoField(true), messageField(40, true)],
  }),
  build({
    id: "p20", slug: "slate-coaster-set", name: "Initially Yours Slate Coasters", price: 24.99, compValue: 34.99, reviews: 178, rating: 4.6,
    categories: ["home", "for-him", "under-25"], recipients: ["him", "couple"], occasions: ["everyday", "wedding"], type: "Barware & Entertaining",
    description: "A set of four slate coasters engraved with a monogram initial.",
    art: { emoji: "🔲", from: "#e3e5e8", to: "#8f969f" },
    fields: [initialField()],
  }),
  build({
    id: "p21", slug: "birthstone-necklace", name: "Milestone Birthstone Necklace", price: 104.99, compValue: 149.99, reviews: 49, rating: 4.9,
    categories: ["for-her"], recipients: ["her"], occasions: ["birthday", "anniversary"], type: "Jewelry",
    description: "Necklace with up to five birthstones and an engraved name.",
    art: { emoji: "💎", from: "#e6eef8", to: "#94b3dc" },
    leadDays: 5,
    options: [
      og("stones", "Birthstones", [{ id: "1", label: "1 stone" }, { id: "2", label: "2 stones", priceDelta: 15 }, { id: "3", label: "3 stones", priceDelta: 30 }, { id: "5", label: "5 stones", priceDelta: 60 }]),
      og("metal", "Metal", [{ id: "silver", label: "Sterling silver", swatch: "#c9ced4" }, { id: "gold", label: "Gold-plated", swatch: "#d4af37", priceDelta: 20 }]),
    ],
    fields: [nameField("Engraved name", 10)],
  }),
  build({
    id: "p22", slug: "custom-golf-balls", name: "Custom Monogram Golf Balls", price: 20.99, compValue: 29.99, reviews: 288, rating: 4.8,
    categories: ["for-him", "under-25"], recipients: ["him"], occasions: ["birthday", "everyday"], type: "Apparel & Accessories",
    description: "Tour-grade golf balls printed with his monogram.",
    art: { emoji: "⛳", from: "#e3f2e6", to: "#93c99f" },
    options: [og("pack", "Pack", [{ id: "6", label: "6 balls" }, { id: "12", label: "12 balls", priceDelta: 14 }])],
    fields: [initialField(), messageField(16)],
  }),
  build({
    id: "p23", slug: "cozy-name-throw", name: "Cozy Name Sherpa Throw", price: 54.99, compValue: 79.99, reviews: 366, rating: 4.8,
    categories: ["home", "for-her"], recipients: ["her", "family"], occasions: ["christmas", "everyday"], type: "Blankets & Throws",
    description: "Sherpa-backed throw with an oversized embroidered name.",
    art: { emoji: "🧣", from: "#f3e3ea", to: "#d69bb2" },
    options: [og("color", "Throw color", [{ id: "blush", label: "Blush", swatch: "#e9a5b8" }, { id: "sage", label: "Sage", swatch: "#a8c9a0" }, { id: "oat", label: "Oatmeal", swatch: "#e3d6bf" }])],
    fields: [nameField("Name", 12), colorField("Thread color", THREAD_COLORS)],
  }),
  build({
    id: "p24", slug: "plush-robe", name: "Monogram Plush Robe", price: 49.99, compValue: 74.99, reviews: 520, rating: 4.7,
    categories: ["for-her", "for-him"], recipients: ["her", "him", "couple"], occasions: ["wedding", "birthday", "christmas"], type: "Apparel & Accessories",
    description: "A spa-soft robe with an embroidered monogram on the chest.",
    art: { emoji: "🛁", from: "#e7eef3", to: "#a6bfd0" },
    options: [
      og("size", "Size", [{ id: "sm", label: "S/M" }, { id: "lxl", label: "L/XL" }, { id: "2x", label: "2XL", priceDelta: 5 }]),
      og("color", "Robe color", [{ id: "white", label: "White", swatch: "#ffffff" }, { id: "gray", label: "Gray", swatch: "#9aa1aa" }]),
    ],
    soldOut: ["size:2x|color:white"],
    fields: [initialField(), colorField("Thread color", THREAD_COLORS)],
  }),
];

export interface MenuGroup {
  label: string;
  columns: { title: string; links: { label: string; to: string }[] }[];
}

export const menu: MenuGroup[] = [
  { label: "New & Bestsellers", columns: [
    { title: "Shop", links: [{ label: "Bestsellers", to: "/c/bestsellers" }, { label: "New Arrivals", to: "/c/new" }, { label: "Under $25", to: "/c/under-25" }] },
    { title: "Popular", links: [{ label: "Mugs & Drinkware", to: "/c/drinkware" }, { label: "Home Décor", to: "/c/home" }, { label: "Photo Gifts", to: "/c/photo" }] },
  ] },
  { label: "Christmas", columns: [
    { title: "Holiday", links: [{ label: "All Christmas", to: "/c/christmas" }, { label: "Ornaments", to: "/search?q=ornament" }, { label: "Stockings", to: "/search?q=stocking" }] },
  ] },
  { label: "Gift Ideas", columns: [
    { title: "Shop by budget", links: [{ label: "Under $25", to: "/c/under-25" }, { label: "Bestsellers", to: "/c/bestsellers" }, { label: "Photo Gifts", to: "/c/photo" }] },
    { title: "Shop by occasion", links: [{ label: "Wedding & Anniversary", to: "/c/wedding" }, { label: "New Baby", to: "/c/baby" }, { label: "Home Gifts", to: "/c/home" }] },
  ] },
  { label: "Women", columns: [
    { title: "Shop", links: [{ label: "All Gifts for Her", to: "/c/for-her" }, { label: "Jewelry", to: "/search?q=necklace" }, { label: "Cozy Gifts", to: "/search?q=throw" }] },
  ] },
  { label: "Men", columns: [
    { title: "Shop", links: [{ label: "All Gifts for Him", to: "/c/for-him" }, { label: "Bar & Grill", to: "/search?q=tub" }, { label: "Golf", to: "/search?q=golf" }] },
  ] },
  { label: "Baby & Kids", columns: [
    { title: "Shop", links: [{ label: "Baby Gifts", to: "/c/baby" }, { label: "Kids Gifts", to: "/c/kids" }, { label: "Nursery", to: "/search?q=night light" }] },
  ] },
  { label: "Occasions & Holidays", columns: [
    { title: "Celebrate", links: [{ label: "Wedding & Anniversary", to: "/c/wedding" }, { label: "Christmas", to: "/c/christmas" }, { label: "New Baby", to: "/c/baby" }] },
  ] },
  { label: "By Category", columns: [
    { title: "Shop by type", links: [{ label: "Home Décor", to: "/c/home" }, { label: "Drinkware", to: "/c/drinkware" }, { label: "Jewelry", to: "/search?q=necklace" }] },
  ] },
  { label: "Photo", columns: [
    { title: "Shop", links: [{ label: "All Photo Gifts", to: "/c/photo" }, { label: "Photo Mugs", to: "/search?q=photo mug" }, { label: "Photo Blankets", to: "/search?q=blanket" }] },
  ] },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const getProductById = (id: string) => products.find((p) => p.id === id);
export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
export const findVariant = (product: Product, key: string) => product.variants.find((v) => v.key === key);

export function productsIn(slug: string): Product[] {
  if (slug === "bestsellers") return [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 12);
  if (slug === "new") return products.filter((p) => p.isNew);
  if (slug === "all") return products;
  return products.filter((p) => p.categories.includes(slug));
}

export function searchProducts(q: string): Product[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return products.filter((p) => {
    const hay = `${p.name} ${p.description} ${p.categories.join(" ")} ${p.type} ${p.recipients.join(" ")} ${p.occasions.join(" ")}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}
