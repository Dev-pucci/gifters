/** Kenyan mobile number → 2547XXXXXXXX / 2541XXXXXXXX, or null. Mirrors server/mpesa.mjs. */
export function normalizeKenyanPhone(raw: string): string | null {
  let n = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (/^0[17]\d{8}$/.test(n)) n = "254" + n.slice(1);
  else if (/^[17]\d{8}$/.test(n)) n = "254" + n;
  return /^254[17]\d{8}$/.test(n) ? n : null;
}
