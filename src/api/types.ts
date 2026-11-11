// Wire types shared by the cart backend (mock) and the client.
// Mirrors the "sections" pattern: one endpoint returns the visitor-specific parts of the
// page (cart, favorites, customer), each with its own version, so pages can be cached and
// the client only refreshes what changed.

export type Personalization = Record<string, string>;

export interface CartLine {
  lineId: string;
  productId: string;
  variantKey: string;
  qty: number;
  /** Price snapshot shown in the cart; checkout always re-prices on the server. */
  unitPrice: number;
  giftBag: boolean;
  personalization: Personalization;
}

export interface CartSection {
  count: number;
  subtotal: number;
  currency: "USD";
  items: CartLine[];
  saved: CartLine[];
}

export interface FavoriteSection {
  count: number;
  productIds: string[];
}

export interface CustomerSection {
  loggedIn: boolean;
  firstName: string | null;
  subscribed: boolean;
}

export interface Sections {
  cart: CartSection;
  favorite: FavoriteSection;
  customer: CustomerSection;
}

export type SectionName = keyof Sections;

export interface Versioned<T> {
  version: number;
  data: T;
}

export type SectionsResponse = { sections: Partial<{ [K in SectionName]: Versioned<Sections[K]> }> };
export type KnownVersions = Partial<Record<SectionName, number>>;

export type LinePatch = Partial<Pick<CartLine, "qty" | "giftBag" | "variantKey" | "personalization">>;
