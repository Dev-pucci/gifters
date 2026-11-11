// Heartfelt Gifts store server (no dependencies; Node 22.18+ / 24+ for TypeScript type stripping).
//
//   GET  /api/config               which payment provider is active
//   POST /api/uploads              store a personalization photo (raw image body) → { id }
//   GET  /api/uploads/:id          serve an uploaded photo
//   POST /api/orders               validate + price the cart on the server, create the order,
//                                  then either start Stripe Checkout or record a test order
//   GET  /api/orders/:id           order status (verifies a Stripe session when ?session_id= is given,
//                                  polls M-Pesa STK Query while an M-Pesa payment is pending)
//   POST /api/orders/:id/mpesa/retry   send a new M-Pesa prompt after a failed/canceled one
//   POST /api/orders/lookup        order tracking: order number + checkout email → order
//   POST /api/contact              contact form → server/data/messages.json
//   POST /api/stripe/webhook       Stripe webhook (checkout.session.* events), signature-verified
//   POST /api/mpesa/callback/:token    Daraja STK callback (confirmed via STK Query before use)
//
// Payments:
//   Card   — set STRIPE_SECRET_KEY (and optionally STRIPE_WEBHOOK_SECRET) to take payments through
//            Stripe-hosted Checkout. Card data never touches this server.
//   M-Pesa — set MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET (Daraja) for real STK Push payments;
//            without them M-Pesa runs as a local simulator and orders are recorded as test orders.
//   Test   — with no Stripe key, a "test order" option records orders without charging anyone.
//
// In production (`npm start`) it also serves the built site from dist/.

import { createServer } from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { readFile, writeFile, stat, unlink } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { getProductById } from "../src/data/catalog.ts";
import { personalizationSummary, validatePersonalization } from "../src/lib/personalization.ts";
import { CURRENCY, PricingError, quote, SHIPPING_METHODS, toKes } from "../src/lib/pricing.ts";
import { createMpesa, maskPhone, MpesaError, normalizePhone, resultMessage } from "./mpesa.mjs";
import { createAuth } from "./auth.mjs";
import { createSite, headInjection, PRESETS } from "./site.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(join(ROOT, ".env"));

const PORT = Number(process.env.PORT || 8787);
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
const DATA_DIR = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(ROOT, "server", "data");
const UPLOAD_DIR = join(DATA_DIR, "uploads");
const ORDERS_FILE = join(DATA_DIR, "orders.json");
const DIST = join(ROOT, "dist");
const PROVIDER = STRIPE_KEY ? "stripe" : "placeholder";

mkdirSync(UPLOAD_DIR, { recursive: true });
const SITE_IMG_DIR = join(DATA_DIR, "site-images");
mkdirSync(SITE_IMG_DIR, { recursive: true });
const site = createSite({ dataDir: DATA_DIR });

// ---------------------------------------------------------------- M-Pesa setup

const mpesa = createMpesa(process.env);
const KES_PER_USD = Number(process.env.KES_PER_USD || 129);
if (!(KES_PER_USD > 0)) throw new Error("KES_PER_USD must be a positive number.");
if (!process.env.KES_PER_USD) console.warn("KES_PER_USD not set — using 129. Set your own rate in .env.");

// Secret path segment for the Daraja callback (Daraja can't sign requests, so the URL is the secret).
const MPESA_TOKEN_FILE = join(DATA_DIR, "mpesa-callback-token");
const MPESA_CALLBACK_TOKEN =
  process.env.MPESA_CALLBACK_TOKEN ||
  (existsSync(MPESA_TOKEN_FILE)
    ? readFileSync(MPESA_TOKEN_FILE, "utf8").trim()
    : (() => {
        const t = randomBytes(24).toString("hex");
        writeFileSync(MPESA_TOKEN_FILE, t);
        return t;
      })());
const CALLBACK_BASE = (process.env.MPESA_CALLBACK_BASE || PUBLIC_URL || "").replace(/\/$/, "");
// Daraja requires an https callback URL. Without a public one we pass a never-resolving .invalid
// host (so no order data is sent anywhere) and rely on STK Query polling instead.
const MPESA_CALLBACK_URL = /^https:\/\//.test(CALLBACK_BASE) ? `${CALLBACK_BASE}/api/mpesa/callback/${MPESA_CALLBACK_TOKEN}` : "https://callback.invalid/mpesa";
if (mpesa.mode !== "simulated" && MPESA_CALLBACK_URL.includes(".invalid")) console.warn("No public https MPESA_CALLBACK_BASE/PUBLIC_URL — M-Pesa results will be fetched by polling only.");

// ---------------------------------------------------------------- utilities

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const id = (prefix, n = 16) => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(n);
  return prefix + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
};

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function readBody(req, limit) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, "That file is too large."));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolveBody(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req, 1_000_000);
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}

const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// ---------------------------------------------------------------- order store (JSON file)

let orders = existsSync(ORDERS_FILE) ? JSON.parse(readFileSync(ORDERS_FILE, "utf8")) : {};
let writing = Promise.resolve();
function persistOrders() {
  writing = writing.then(async () => {
    const tmp = ORDERS_FILE + ".tmp";
    await writeFile(tmp, JSON.stringify(orders, null, 1));
    renameSync(tmp, ORDERS_FILE);
  });
  return writing;
}

const publicOrder = (o) => {
  const { stripeSessionId: _s, userId: _u, ...rest } = o;
  if (rest.payment?.method === "mpesa") {
    const { phone, attempts, lastQueryAt: _q, ...pay } = rest.payment;
    rest.payment = { ...pay, phoneMasked: maskPhone(phone), attempts: attempts.length, pending: attempts.at(-1)?.state === "pending" };
  }
  return rest;
};

// ---------------------------------------------------------------- M-Pesa order handling

const MAX_MPESA_ATTEMPTS = 5;
const ATTEMPT_TIMEOUT_MS = 3 * 60_000;

function findAttempt(checkoutRequestId) {
  for (const order of Object.values(orders)) {
    const attempt = order.payment?.method === "mpesa" && order.payment.attempts.find((a) => a.checkoutRequestId === checkoutRequestId);
    if (attempt) return { order, attempt };
  }
  return null;
}

function applyMpesaResult(order, attempt, r) {
  const p = order.payment;
  if (r.state === "paid") {
    if (order.status === "paid" || order.status === "test_order") {
      // A replaced prompt was approved after another attempt already paid: flag for refund.
      attempt.state = "paid";
      p.duplicateReceipts = [...(p.duplicateReceipts ?? []), attempt.callbackReceipt ?? r.receipt ?? attempt.checkoutRequestId];
      console.warn(`Duplicate M-Pesa payment on order ${order.id} — refund needed.`);
      return;
    }
    attempt.state = "paid";
    p.receipt = attempt.callbackReceipt ?? r.receipt ?? p.receipt ?? null;
    p.paidAt = new Date().toISOString();
    p.failureReason = null;
    // Simulated payments move no money, so they're recorded as test orders, never as paid.
    order.status = mpesa.mode === "simulated" ? "test_order" : "paid";
  } else if (r.state === "failed") {
    attempt.state = "failed";
    attempt.code = r.code;
    if (order.status === "awaiting_payment" && attempt === p.attempts.at(-1)) {
      order.status = "payment_failed";
      p.failureReason = r.message;
    }
  }
}

/** Asks Safaricom about one attempt (throttled unless forced) and applies the outcome. */
async function checkAttempt(order, attempt, { force = false } = {}) {
  // "superseded" = replaced by a retry; it can still be approved on the phone, so it stays checkable.
  if (attempt.state !== "pending" && !(attempt.state === "superseded" && force)) return;
  const now = Date.now();
  if (!force && (now - attempt.startedAt < 4000 || now - (attempt.lastQueryAt || 0) < 3500)) return;
  attempt.lastQueryAt = now;
  let r;
  try {
    r = await mpesa.query(attempt.checkoutRequestId);
  } catch (e) {
    console.error("M-Pesa query failed:", e.message);
    return;
  }
  if (r.state === "pending" && now - attempt.startedAt > ATTEMPT_TIMEOUT_MS) r = { state: "failed", code: 1037, message: resultMessage(1037) };
  applyMpesaResult(order, attempt, r);
  await persistOrders();
}

async function startMpesaAttempt(order, phone) {
  const p = order.payment;
  const r = await mpesa.initiate({ phone, amountKes: p.amountKes, accountReference: order.id, description: "Heartfelt", callbackUrl: MPESA_CALLBACK_URL });
  p.phone = phone;
  p.attempts.push({ checkoutRequestId: r.checkoutRequestId, merchantRequestId: r.merchantRequestId, startedAt: Date.now(), state: "pending" });
  p.failureReason = null;
  order.status = "awaiting_payment";
}

// ---------------------------------------------------------------- rate limiting (per IP, in memory)

const hits = new Map();
function rateLimit(req, bucket, max, windowMs) {
  const ip = req.socket.remoteAddress || "?";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new HttpError(429, "Too many requests — please wait a few minutes and try again.");
  list.push(now);
  hits.set(key, list);
}

// ---------------------------------------------------------------- customer accounts

const auth = createAuth({
  dataDir: DATA_DIR,
  readJson,
  send,
  HttpError,
  rateLimit,
  str,
  isSecure: (req) => /^https:/.test(PUBLIC_URL) || req.headers["x-forwarded-proto"] === "https",
  publicBaseUrl: (req) => originOf(req),
  adminEmails: (process.env.ADMIN_EMAILS || "").split(","),
});

// ---------------------------------------------------------------- contact messages

const MESSAGES_FILE = join(DATA_DIR, "messages.json");
let messages = existsSync(MESSAGES_FILE) ? JSON.parse(readFileSync(MESSAGES_FILE, "utf8")) : [];

async function handleContact(req, res) {
  const b = await readJson(req);
  // Honeypot: real visitors never see this field. Pretend success so bots don't retry.
  if (str(b.website, 200)) return send(res, 201, { ticket: "MSG" + id("", 6).toUpperCase() });
  const msg = {
    ticket: "MSG" + id("", 8).toUpperCase(),
    createdAt: new Date().toISOString(),
    name: str(b.name, 120),
    email: str(b.email, 200),
    topic: str(b.topic, 80),
    orderId: str(b.orderId, 20).toUpperCase(),
    message: str(b.message, 2000),
  };
  if (!msg.name) throw new HttpError(400, "Please tell us your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.email)) throw new HttpError(400, "Please enter a valid email address so we can reply.");
  if (msg.message.length < 10) throw new HttpError(400, "Please write a little more so we can help (at least 10 characters).");
  if (msg.orderId && !/^HG[A-Z0-9]{10}$/.test(msg.orderId)) throw new HttpError(400, "That order number doesn't look right — it starts with HG and has 12 characters.");
  // Only accepted messages count toward the limit, so fixing a typo never locks anyone out.
  rateLimit(req, "contact", 5, 10 * 60_000);
  messages.push(msg);
  await writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 1));
  console.log(`New contact message ${msg.ticket} (${msg.topic}) from ${msg.email}`);
  send(res, 201, { ticket: msg.ticket });
}

// ---------------------------------------------------------------- uploads

const IMAGE_TYPES = {
  "image/jpeg": { ext: ".jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  "image/png": { ext: ".png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { ext: ".webp", magic: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
};
const uploadPath = (uid) => {
  for (const t of Object.values(IMAGE_TYPES)) {
    const p = join(UPLOAD_DIR, uid + t.ext);
    if (existsSync(p)) return p;
  }
  return null;
};

async function handleUpload(req, res) {
  const type = (req.headers["content-type"] || "").split(";")[0].trim();
  const spec = IMAGE_TYPES[type];
  if (!spec) throw new HttpError(415, "Please upload a JPG, PNG or WebP image.");
  const body = await readBody(req, 10 * 1024 * 1024);
  if (body.length < 12 || !spec.magic(body)) throw new HttpError(415, "That file doesn't look like a valid image.");
  const uid = id("up_");
  await writeFile(join(UPLOAD_DIR, uid + spec.ext), body);
  send(res, 201, { id: uid });
}

// ---------------------------------------------------------------- Stripe (REST, form-encoded)

function formEncode(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") formEncode(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out.join("&");
}

async function stripe(method, path, params) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2024-06-20" },
    body: params ? formEncode(params) : undefined,
  });
  const body = await res.json();
  if (!res.ok) {
    console.error("Stripe error:", body.error?.message);
    throw new HttpError(502, "The payment provider rejected the request. Please try again.");
  }
  return body;
}

const toCents = (n) => Math.round(n * 100);

async function startStripeCheckout(order, origin) {
  const items = order.lines.map((l) => ({
    quantity: l.qty,
    price_data: {
      currency: CURRENCY,
      unit_amount: toCents(l.unitPrice),
      product_data: { name: l.name, description: `${l.variantLabel} — ${l.summary}`.slice(0, 300) },
    },
  }));
  const bags = order.lines.reduce((n, l) => n + (l.giftBag ? l.qty : 0), 0);
  if (bags) items.push({ quantity: bags, price_data: { currency: CURRENCY, unit_amount: toCents(order.totals.giftBags / bags), product_data: { name: "Gift bag" } } });

  const params = {
    mode: "payment",
    customer_email: order.email,
    client_reference_id: order.id,
    success_url: `${origin}/order/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?canceled=1`,
    line_items: Object.fromEntries(items.map((it, i) => [i, it])),
    metadata: { order_id: order.id },
    payment_intent_data: { metadata: { order_id: order.id } },
    shipping_options: {
      0: {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: `${SHIPPING_METHODS[order.totals.shippingMethod].label} shipping`,
          fixed_amount: { amount: toCents(order.totals.shipping), currency: CURRENCY },
        },
      },
    },
  };
  if (order.totals.discount > 0) {
    const coupon = await stripe("POST", "/coupons", { amount_off: toCents(order.totals.discount), currency: CURRENCY, duration: "once", name: order.totals.promoCode || "Discount" });
    params.discounts = { 0: { coupon: coupon.id } };
  }
  const session = await stripe("POST", "/checkout/sessions", params);
  order.stripeSessionId = session.id;
  return session.url;
}

function verifyStripeSignature(raw, header) {
  if (!STRIPE_WEBHOOK_SECRET || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", STRIPE_WEBHOOK_SECRET).update(`${t}.${raw}`).digest();
  return header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .some((p) => {
      const sig = Buffer.from(p.slice(3), "hex");
      return sig.length === expected.length && timingSafeEqual(sig, expected);
    });
}

// ---------------------------------------------------------------- orders

function buildOrder(body) {
  const email = str(body.email, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Please enter a valid email address.");
  const a = body.address || {};
  const address = {
    name: str(a.name, 120),
    line1: str(a.line1, 160),
    line2: str(a.line2, 160),
    city: str(a.city, 80),
    region: str(a.region, 80),
    postalCode: str(a.postalCode, 20),
    country: str(a.country, 60),
    phone: str(a.phone, 30),
  };
  for (const k of ["name", "line1", "city", "postalCode", "country"]) if (!address[k]) throw new HttpError(400, "Please complete your shipping address.");
  const shippingMethod = body.shippingMethod in SHIPPING_METHODS ? body.shippingMethod : "standard";

  const rawLines = Array.isArray(body.lines) ? body.lines.slice(0, 50) : [];
  if (!rawLines.length) throw new HttpError(400, "Your cart is empty.");
  const lines = rawLines.map((l) => {
    const product = getProductById(str(l.productId, 20));
    if (!product) throw new HttpError(400, "An item in your cart is no longer available.");
    const variant = product.variants.find((v) => v.key === l.variantKey);
    if (!variant) throw new HttpError(400, `Please choose all options for ${product.name}.`);
    if (!variant.inStock) throw new HttpError(409, `${product.name} (${variant.label}) is out of stock.`);
    const values = Object.fromEntries(Object.entries(l.personalization || {}).map(([k, v]) => [k, str(v, 120)]));
    const check = validatePersonalization(product, values);
    if (!check.ok) throw new HttpError(400, `${product.name}: ${Object.values(check.errors)[0]}`);
    for (const f of product.fields) if (f.type === "photo" && check.clean[f.id] && !uploadPath(check.clean[f.id])) throw new HttpError(400, `${product.name}: please upload the photo again.`);
    return { productId: product.id, variantKey: variant.key, qty: Number(l.qty), giftBag: !!l.giftBag, personalization: check.clean, summary: personalizationSummary(product, check.clean) };
  });

  let q;
  try {
    q = quote(lines, { shippingMethod, promoCode: str(body.promoCode, 30) });
  } catch (e) {
    if (e instanceof PricingError) throw new HttpError(400, e.message);
    throw e;
  }
  if (q.promoError) throw new HttpError(400, q.promoError);

  return {
    id: id("HG", 10).toUpperCase(),
    createdAt: new Date().toISOString(),
    status: "awaiting_payment",
    paymentProvider: PROVIDER,
    email,
    address,
    lines: lines.map((l, i) => ({ ...l, name: q.lines[i].name, variantLabel: q.lines[i].variantLabel, sku: q.lines[i].sku, unitPrice: q.lines[i].unitPrice, lineTotal: q.lines[i].lineTotal })),
    totals: { subtotal: q.subtotal, giftBags: q.giftBags, discount: q.discount, shipping: q.shipping, total: q.total, promoCode: q.promo?.code ?? null, shippingMethod },
  };
}

function originOf(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const o = req.headers.origin;
  if (o && /^https?:\/\/[\w.-]+(:\d+)?$/.test(o)) return o;
  return `http://localhost:${PORT}`;
}

// ---------------------------------------------------------------- static files (production)

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".json": "application/json", ".webp": "image/webp", ".woff2": "font/woff2" };

async function serveStatic(req, res, pathname) {
  if (!existsSync(DIST)) return send(res, 404, { error: "Not found. Run `npm run build` first, or use `npm run dev`." });
  let file = resolve(DIST, "." + decodeURIComponent(pathname));
  if (!file.startsWith(DIST + sep) && file !== DIST) return send(res, 403, { error: "Forbidden" });
  const isFile = await stat(file).then((s) => s.isFile()).catch(() => false);
  if (!isFile) file = join(DIST, "index.html"); // SPA fallback
  const ext = extname(file);
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": file.includes(`${sep}assets${sep}`) ? "public, max-age=31536000, immutable" : "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  if (file.endsWith("index.html")) {
    // Bake the current season theme into the page so it renders in the right colors immediately.
    const html = (await readFile(file, "utf8")).replace("</head>", `${headInjection(site.publicConfig())}</head>`);
    return res.end(html);
  }
  res.end(await readFile(file));
}

// ---------------------------------------------------------------- site appearance (admin)

const adminView = () => ({ site: site.get(), currentThemeId: site.currentTheme().id, presets: PRESETS.map((p) => p.id) });

async function deleteSiteImageIfUnused(url) {
  if (!url || site.isReferenced(url)) return;
  const name = url.split("/").pop();
  if (/^si_[a-z0-9]{16}\.(jpg|png|webp)$/.test(name)) await unlink(join(SITE_IMG_DIR, name)).catch(() => undefined);
}

async function handleSiteRoutes(req, res, path, url) {
  if (path === "/api/site" && req.method === "GET") return send(res, 200, site.publicConfig());

  const img = path.match(/^\/api\/site-images\/(si_[a-z0-9]{16}\.(jpg|png|webp))$/);
  if (img && req.method === "GET") {
    const p = join(SITE_IMG_DIR, img[1]);
    if (!existsSync(p)) return send(res, 404, { error: "Not found" });
    // File names are unique per upload, so they can be cached forever.
    res.writeHead(200, { "Content-Type": MIME["." + img[2]] || "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" });
    return res.end(await readFile(p));
  }

  if (path === "/api/admin/site" && req.method === "GET") {
    auth.requireAdmin(req);
    return send(res, 200, adminView());
  }

  if (path === "/api/admin/site" && req.method === "PUT") {
    auth.guard(req);
    const admin = auth.requireAdmin(req);
    try {
      site.updateThemes(await readJson(req));
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(400, e.message);
    }
    const s = site.get();
    console.log(`[admin] ${admin.email} saved seasons (${s.mode === "manual" ? "pinned" : "automatic"}) — live now: ${site.currentTheme().name}`);
    return send(res, 200, adminView());
  }

  if (path === "/api/admin/site/restore" && req.method === "POST") {
    auth.guard(req);
    auth.requireAdmin(req);
    const b = await readJson(req);
    try {
      site.restorePreset(str(b.id, 30));
    } catch (e) {
      throw new HttpError(400, e.message);
    }
    return send(res, 200, adminView());
  }

  if (path === "/api/admin/images" && (req.method === "POST" || req.method === "DELETE")) {
    auth.guardOrigin(req);
    auth.requireAdmin(req);
    const key = str(url.searchParams.get("key"), 80);
    const themeId = str(url.searchParams.get("theme"), 30) || null;
    let newUrl = null;
    if (req.method === "POST") {
      rateLimit(req, "admin-image", 60, 10 * 60_000);
      const type = (req.headers["content-type"] || "").split(";")[0].trim();
      const spec = IMAGE_TYPES[type];
      if (!spec) throw new HttpError(415, "Please upload a JPG, PNG or WebP image.");
      const body = await readBody(req, 10 * 1024 * 1024);
      if (body.length < 12 || !spec.magic(body)) throw new HttpError(415, "That file doesn't look like a valid image.");
      const name = id("si_") + spec.ext;
      await writeFile(join(SITE_IMG_DIR, name), body);
      newUrl = `/api/site-images/${name}`;
    }
    let old;
    try {
      old = site.setImage(key, themeId, newUrl);
    } catch (e) {
      if (newUrl) await unlink(join(SITE_IMG_DIR, newUrl.split("/").pop())).catch(() => undefined);
      throw new HttpError(400, e.message);
    }
    await deleteSiteImageIfUnused(old);
    console.log(`[admin] ${auth.currentUser(req)?.email} ${newUrl ? "uploaded" : "reset"} image ${key}${themeId ? ` for season ${themeId}` : " (all seasons)"}`);
    return send(res, 200, adminView());
  }

  return false;
}

// ---------------------------------------------------------------- router

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  try {
    if ((path.startsWith("/api/auth/") || path.startsWith("/api/account/")) && (await auth.handle(req, res, path))) return;

    if (path === "/api/account/orders" && req.method === "GET") {
      const user = auth.requireUser(req);
      const mine = Object.values(orders)
        .filter((o) => o.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(publicOrder);
      return send(res, 200, { orders: mine });
    }

    if (path.startsWith("/api/site") || path.startsWith("/api/admin/")) {
      const handled = await handleSiteRoutes(req, res, path, url);
      if (handled !== false) return;
    }

    if (path === "/api/config" && req.method === "GET") {
      return send(res, 200, {
        provider: PROVIDER,
        mpesa: { mode: mpesa.mode, kesPerUsd: KES_PER_USD },
        methods: [
          { id: "mpesa", label: "M-Pesa", available: true, note: mpesa.mode === "simulated" ? "Simulated — no money moves" : mpesa.mode === "sandbox" ? "Daraja sandbox" : undefined },
          { id: "card", label: "Card, Apple Pay & Google Pay (Stripe)", available: PROVIDER === "stripe", note: PROVIDER === "stripe" ? undefined : "Add STRIPE_SECRET_KEY to enable" },
          { id: "test", label: "Test order — no charge", available: PROVIDER === "placeholder" },
        ],
      });
    }

    if (path === "/api/uploads" && req.method === "POST") return await handleUpload(req, res);

    const up = path.match(/^\/api\/uploads\/(up_[a-z0-9]{16})$/);
    if (up && req.method === "GET") {
      const p = uploadPath(up[1]);
      if (!p) return send(res, 404, { error: "Not found" });
      res.writeHead(200, { "Content-Type": MIME[extname(p)], "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" });
      return res.end(await readFile(p));
    }

    if (path === "/api/orders" && req.method === "POST") {
      const body = await readJson(req);
      const method = body.paymentMethod ?? (PROVIDER === "stripe" ? "card" : "test");
      if (method === "card" && PROVIDER !== "stripe") throw new HttpError(400, "Card payments aren't enabled on this store yet.");
      if (method === "test" && PROVIDER === "stripe") throw new HttpError(400, "Test orders are disabled because real payments are enabled.");
      if (!["card", "mpesa", "test"].includes(method)) throw new HttpError(400, "Please choose a payment method.");
      const phone = method === "mpesa" ? normalizePhone(body.mpesaPhone) : null;
      if (method === "mpesa" && !phone) throw new HttpError(400, "Enter a Safaricom M-Pesa number, e.g. 0712 345 678.");

      const order = buildOrder(body);
      const signedIn = auth.currentUser(req);
      if (signedIn) order.userId = signedIn.id;
      let redirectUrl = `/order/${order.id}`;
      if (method === "mpesa") {
        order.paymentProvider = "mpesa";
        order.payment = { method: "mpesa", mode: mpesa.mode, amountKes: toKes(order.totals.total, KES_PER_USD), kesPerUsd: KES_PER_USD, attempts: [], receipt: null, failureReason: null };
        try {
          await startMpesaAttempt(order, phone);
        } catch (e) {
          if (e instanceof MpesaError) throw new HttpError(400, e.message);
          throw e;
        }
      } else if (method === "card") {
        order.payment = { method: "card" };
        redirectUrl = await startStripeCheckout(order, originOf(req));
      } else {
        order.payment = { method: "test" };
        order.status = "test_order";
      }
      orders[order.id] = order;
      await persistOrders();
      return send(res, 201, { orderId: order.id, redirectUrl });
    }

    if (path === "/api/contact" && req.method === "POST") return await handleContact(req, res);

    if (path === "/api/orders/lookup" && req.method === "POST") {
      rateLimit(req, "lookup", 10, 10 * 60_000);
      const b = await readJson(req);
      const order = orders[str(b.orderId, 20).toUpperCase()];
      // Same message whether the order or the email is wrong, so order numbers can't be probed.
      if (!order || order.email.toLowerCase() !== str(b.email, 200).toLowerCase()) throw new HttpError(404, "We couldn't find an order with that number and email. Check both and try again.");
      if (order.payment?.method === "mpesa" && order.status === "awaiting_payment") {
        const last = order.payment.attempts.at(-1);
        if (last) await checkAttempt(order, last);
      }
      return send(res, 200, publicOrder(order));
    }

    const retry = path.match(/^\/api\/orders\/(HG[A-Z0-9]{10})\/mpesa\/retry$/);
    if (retry && req.method === "POST") {
      const order = orders[retry[1]];
      if (!order || order.payment?.method !== "mpesa") return send(res, 404, { error: "Order not found." });
      const p = order.payment;
      const last = p.attempts.at(-1);
      // Never send a second prompt while the first might still succeed — that could charge twice.
      if (last?.state === "pending") await checkAttempt(order, last, { force: true });
      if (order.status === "paid" || order.status === "test_order") return send(res, 200, publicOrder(order));
      if (last?.state === "pending" && Date.now() - last.startedAt < 60_000) throw new HttpError(409, "The last M-Pesa prompt is still open on your phone. Please answer it or wait a minute.");
      if (p.attempts.length >= MAX_MPESA_ATTEMPTS) throw new HttpError(429, "Too many attempts for this order. Please contact us to complete payment.");
      const body = await readJson(req).catch(() => ({}));
      const phone = body.phone ? normalizePhone(body.phone) : p.phone;
      if (!phone) throw new HttpError(400, "Enter a Safaricom M-Pesa number, e.g. 0712 345 678.");
      if (last?.state === "pending") last.state = "superseded";
      try {
        await startMpesaAttempt(order, phone);
      } catch (e) {
        if (e instanceof MpesaError) throw new HttpError(400, e.message);
        throw e;
      }
      await persistOrders();
      return send(res, 200, publicOrder(order));
    }

    const cbm = path.match(/^\/api\/mpesa\/callback\/([a-f0-9]{48})$/);
    if (cbm && req.method === "POST") {
      const okToken = cbm[1].length === MPESA_CALLBACK_TOKEN.length && timingSafeEqual(Buffer.from(cbm[1]), Buffer.from(MPESA_CALLBACK_TOKEN));
      if (!okToken) return send(res, 404, { error: "Not found" });
      const cb = mpesa.parseCallback(await readJson(req).catch(() => null));
      const hit = cb && findAttempt(cb.checkoutRequestId);
      if (hit) {
        if (cb.amountKes !== undefined && cb.code === 0 && cb.amountKes < hit.order.payment.amountKes) {
          console.warn(`M-Pesa amount mismatch on ${hit.order.id}: got ${cb.amountKes}, expected ${hit.order.payment.amountKes}`);
        } else {
          if (cb.code === 0 && cb.receipt) hit.attempt.callbackReceipt = cb.receipt;
          await checkAttempt(hit.order, hit.attempt, { force: true }); // confirm with Safaricom before trusting it
        }
      }
      return send(res, 200, { ResultCode: 0, ResultDesc: "Accepted" });
    }

    const om = path.match(/^\/api\/orders\/(HG[A-Z0-9]{10})$/);
    if (om && req.method === "GET") {
      const order = orders[om[1]];
      if (!order) return send(res, 404, { error: "Order not found." });
      if (order.payment?.method === "mpesa" && order.status === "awaiting_payment") {
        const last = order.payment.attempts.at(-1);
        if (last) await checkAttempt(order, last);
      }
      const sessionId = url.searchParams.get("session_id");
      if (PROVIDER === "stripe" && order.status === "awaiting_payment" && sessionId && sessionId === order.stripeSessionId) {
        const session = await stripe("GET", `/checkout/sessions/${encodeURIComponent(sessionId)}`);
        if (session.payment_status === "paid") {
          order.status = "paid";
          await persistOrders();
        }
      }
      return send(res, 200, publicOrder(order));
    }

    if (path === "/api/stripe/webhook" && req.method === "POST") {
      const raw = (await readBody(req, 1_000_000)).toString("utf8");
      if (!verifyStripeSignature(raw, req.headers["stripe-signature"])) return send(res, 400, { error: "Invalid signature" });
      const event = JSON.parse(raw);
      const orderId = event.data?.object?.metadata?.order_id;
      const order = orderId && orders[orderId];
      if (order) {
        if (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") order.status = "paid";
        if (event.type === "checkout.session.async_payment_succeeded") order.status = "paid";
        if (event.type === "checkout.session.async_payment_failed") order.status = "payment_failed";
        await persistOrders();
      }
      return send(res, 200, { received: true });
    }

    if (path.startsWith("/api/")) return send(res, 404, { error: "Not found" });
    if (req.method === "GET" || req.method === "HEAD") return await serveStatic(req, res, path);
    send(res, 405, { error: "Method not allowed" });
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message });
    console.error(e);
    send(res, 500, { error: "Something went wrong. Please try again." });
  }
});

server.listen(PORT, () => {
  console.log(`Heartfelt Gifts server on http://localhost:${PORT} — payments: ${PROVIDER === "stripe" ? "Stripe" : "placeholder (test orders, no charge)"}`);
});
