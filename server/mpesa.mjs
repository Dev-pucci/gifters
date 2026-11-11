// M-Pesa via Safaricom Daraja — Lipa na M-Pesa Online (STK Push).
//
// Flow: initiate() sends an STK push → the shopper gets a PIN prompt on their phone →
// Safaricom POSTs the result to our callback URL, and we also poll the STK Query API
// (needed locally, where Safaricom can't reach the callback). A callback alone never
// marks an order paid: it is confirmed with an STK Query first, so a spoofed callback
// can't fake a payment.
//
// Modes:
//   sandbox     MPESA_CONSUMER_KEY + MPESA_CONSUMER_SECRET set, MPESA_ENV unset or "sandbox"
//   production  same, with MPESA_ENV=production (and your own shortcode + passkey)
//   simulated   no credentials: a local stand-in so the UI can be tested; no money moves.
//               Test numbers: 0700000001 → shopper cancels, 0700000002 → insufficient
//               balance, 0700000003 → wrong PIN; any other number succeeds after ~6 s.

import { randomBytes } from "node:crypto";

const SANDBOX_SHORTCODE = "174379";
// Safaricom's public sandbox passkey for shortcode 174379 (from the Daraja docs; not a secret).
const SANDBOX_PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

export const MPESA_MAX_KES = 250_000;

const RESULT_MESSAGES = {
  0: "Payment received.",
  1: "Your M-Pesa balance is too low for this payment.",
  1001: "Another M-Pesa transaction is in progress on this phone. Wait a moment and try again.",
  1019: "The payment request expired before it was completed.",
  1025: "We couldn't send the M-Pesa prompt. Please try again.",
  1032: "You canceled the M-Pesa prompt.",
  1037: "We couldn't reach your phone. Make sure it's on and has signal, then try again.",
  2001: "The M-Pesa PIN entered was incorrect.",
  9999: "We couldn't send the M-Pesa prompt. Please try again.",
};
export const resultMessage = (code, fallback) => RESULT_MESSAGES[Number(code)] ?? fallback ?? "The M-Pesa payment didn't go through.";

/** Normalizes Kenyan mobile numbers to 2547XXXXXXXX / 2541XXXXXXXX, or returns null. */
export function normalizePhone(raw) {
  const digits = String(raw ?? "").replace(/[^\d+]/g, "").replace(/^\+/, "");
  let n = digits;
  if (/^0[17]\d{8}$/.test(n)) n = "254" + n.slice(1);
  else if (/^[17]\d{8}$/.test(n)) n = "254" + n;
  return /^254[17]\d{8}$/.test(n) ? n : null;
}

export const maskPhone = (p) => (p ? `${p.slice(0, 6)}***${p.slice(-3)}` : "");

/** Daraja timestamp, yyyyMMddHHmmss in Kenyan time (EAT, UTC+3, no DST). */
function timestamp(now = Date.now()) {
  return new Date(now + 3 * 3600_000).toISOString().replace(/\D/g, "").slice(0, 14);
}

export function createMpesa(env) {
  const hasKeys = !!(env.MPESA_CONSUMER_KEY && env.MPESA_CONSUMER_SECRET);
  const mode = !hasKeys ? "simulated" : env.MPESA_ENV === "production" ? "production" : "sandbox";
  // MPESA_BASE_URL only exists for automated tests against a fake Daraja server.
  const base = env.MPESA_BASE_URL || (mode === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke");
  const shortcode = env.MPESA_SHORTCODE || (mode === "sandbox" ? SANDBOX_SHORTCODE : "");
  const passkey = env.MPESA_PASSKEY || (mode === "sandbox" ? SANDBOX_PASSKEY : "");
  const txType = env.MPESA_TRANSACTION_TYPE === "CustomerBuyGoodsOnline" ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline";
  // For Buy Goods (till) PartyB is the till number; for Paybill it's the shortcode.
  const partyB = env.MPESA_PARTY_B || shortcode;

  if (mode === "production" && (!shortcode || !passkey)) throw new Error("MPESA_ENV=production needs MPESA_SHORTCODE and MPESA_PASSKEY.");

  let token = null;
  async function accessToken() {
    if (token && token.expiresAt > Date.now() + 30_000) return token.value;
    const basic = Buffer.from(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`).toString("base64");
    const res = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${basic}` } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) {
      console.error("M-Pesa auth failed:", res.status, body.errorMessage ?? body);
      throw new MpesaError("M-Pesa is unavailable right now. Please try again shortly.");
    }
    token = { value: body.access_token, expiresAt: Date.now() + Number(body.expires_in || 3599) * 1000 };
    return token.value;
  }

  async function daraja(path, payload) {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  }

  const password = (ts) => Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");

  // ---------- simulator state
  const sim = new Map();

  return {
    mode,
    shortcode: mode === "simulated" ? null : shortcode,

    /**
     * Sends the STK push. Returns { checkoutRequestId, merchantRequestId, customerMessage }.
     * Throws MpesaError with a shopper-friendly message when Safaricom rejects the request.
     */
    async initiate({ phone, amountKes, accountReference, description, callbackUrl }) {
      if (!Number.isInteger(amountKes) || amountKes < 1 || amountKes > MPESA_MAX_KES) throw new MpesaError(`M-Pesa payments must be between KSh 1 and KSh ${MPESA_MAX_KES.toLocaleString()}.`);
      if (mode === "simulated") {
        const checkoutRequestId = `ws_CO_SIM_${randomBytes(8).toString("hex")}`;
        sim.set(checkoutRequestId, { phone, amountKes, startedAt: Date.now() });
        return { checkoutRequestId, merchantRequestId: `SIM-${randomBytes(4).toString("hex")}`, customerMessage: "Simulated: no real prompt is sent." };
      }
      const ts = timestamp();
      const { ok, body } = await daraja("/mpesa/stkpush/v1/processrequest", {
        BusinessShortCode: shortcode,
        Password: password(ts),
        Timestamp: ts,
        TransactionType: txType,
        Amount: amountKes,
        PartyA: phone,
        PartyB: partyB,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: accountReference.slice(0, 12),
        TransactionDesc: description.slice(0, 13),
      });
      if (!ok || body.ResponseCode !== "0") {
        console.error("M-Pesa STK push rejected:", body.errorCode ?? body.ResponseCode, body.errorMessage ?? body.ResponseDescription);
        throw new MpesaError(/invalid.*(phone|msisdn|partya)/i.test(body.errorMessage ?? "") ? "That phone number isn't registered for M-Pesa." : "We couldn't start the M-Pesa payment. Please check the number and try again.");
      }
      return { checkoutRequestId: body.CheckoutRequestID, merchantRequestId: body.MerchantRequestID, customerMessage: body.CustomerMessage };
    },

    /**
     * Asks Safaricom for the outcome. Returns { state: "pending" } or
     * { state: "paid" | "failed", code, message, receipt?, amountKes? }.
     */
    async query(checkoutRequestId) {
      if (mode === "simulated") {
        const s = sim.get(checkoutRequestId);
        if (!s) return { state: "failed", code: 1019, message: resultMessage(1019) };
        if (Date.now() - s.startedAt < 6000) return { state: "pending" };
        const outcome = { "254700000001": 1032, "254700000002": 1, "254700000003": 2001 }[s.phone] ?? 0;
        if (outcome) return { state: "failed", code: outcome, message: resultMessage(outcome) };
        s.receipt ??= `SIM${randomBytes(4).toString("hex").toUpperCase()}`;
        return { state: "paid", code: 0, message: resultMessage(0), receipt: s.receipt, amountKes: s.amountKes };
      }
      const ts = timestamp();
      const { body } = await daraja("/mpesa/stkpushquery/v1/query", { BusinessShortCode: shortcode, Password: password(ts), Timestamp: ts, CheckoutRequestID: checkoutRequestId });
      // While the shopper hasn't answered, Daraja returns errorCode 500.001.1001 ("being processed").
      if (body.errorCode) return { state: "pending" };
      if (body.ResultCode === undefined) return { state: "pending" };
      const code = Number(body.ResultCode);
      if (code === 0) return { state: "paid", code, message: resultMessage(0) };
      return { state: "failed", code, message: resultMessage(code, body.ResultDesc) };
    },

    /** Parses a Daraja STK callback body. Returns null if it isn't one. */
    parseCallback(body) {
      const cb = body?.Body?.stkCallback;
      if (!cb?.CheckoutRequestID) return null;
      const items = Object.fromEntries((cb.CallbackMetadata?.Item ?? []).map((i) => [i.Name, i.Value]));
      const code = Number(cb.ResultCode);
      return {
        checkoutRequestId: String(cb.CheckoutRequestID),
        code,
        message: resultMessage(code, cb.ResultDesc),
        receipt: items.MpesaReceiptNumber ? String(items.MpesaReceiptNumber) : undefined,
        amountKes: items.Amount !== undefined ? Number(items.Amount) : undefined,
        phone: items.PhoneNumber ? String(items.PhoneNumber) : undefined,
      };
    },
  };
}

export class MpesaError extends Error {}
