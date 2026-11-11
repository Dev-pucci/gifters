// Remembers the promo code a shopper applied in the cart so checkout can reuse it.
const KEY = "hg_promo_code";

export function getPromo(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setPromo(code: string) {
  try {
    if (code) localStorage.setItem(KEY, code);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
