# Heartfelt Gifts

A personalized-gifts store built with React 19, Vite, Tailwind CSS v4, and a small Node server for orders, photo uploads and payments. The structure is based on a teardown of gifts.com ([docs/gifts-com-teardown.md](docs/gifts-com-teardown.md)).

## Run it

Requires Node 22.18+ (the server loads the shared `.ts` files directly).

```sh
npm install
npm run dev     # site on http://localhost:5173 (live reload) + store server on :8787
npm run build   # type-check and build to dist/
npm start       # production: one server on http://localhost:8787 serving the site and /api
```

## Payments

All payment settings go in `.env` (copy [.env.example](.env.example)). With nothing set, the store works end to end with an M-Pesa simulator and a test-order option. No money moves.

### M-Pesa (Safaricom Daraja, STK Push)

1. **Choose M-Pesa at checkout** (it's the default) and enter a Safaricom number. The amount is shown in KES: the USD total × `KES_PER_USD`, rounded up to the shilling.
2. **The server sends an STK push.** The shopper gets a PIN prompt on their phone and sees a "Check your phone" screen that updates by itself.
3. **The result arrives two ways:**
   - Safaricom's callback to `/api/mpesa/callback/<secret-token>`
   - the server asking Safaricom for the status (STK Query). This is how it works locally, where Safaricom can't reach your machine.

   A callback is **always confirmed with Safaricom before it's trusted**, so a faked callback can't mark an order paid. It also has to come in at the secret URL.
4. **If it fails:** a cancel, wrong PIN, low balance or timeout shows the reason, and the shopper can send a new prompt to the same or another number (up to 5 tries). The order is kept. The store never sends a second prompt while the first one can still be paid, which prevents double charges.
5. **On success:** the confirmation page shows the M-Pesa receipt number.

| Mode | When | |
| --- | --- | --- |
| **Simulator** | no Daraja keys | No prompt is sent and no money moves. Orders are recorded as **test orders**. Test numbers: `0700000001` cancels, `0700000002` has low balance, `0700000003` enters a wrong PIN, and any other number succeeds after about 6 seconds. |
| **Sandbox** | `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET` set | Real Daraja sandbox (shortcode 174379). Pay with Safaricom's test number `254708374149`. |
| **Production** | the above plus `MPESA_ENV=production`, `MPESA_SHORTCODE` and `MPESA_PASSKEY` | Real money, to your Paybill. For a Till, set `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline` and `MPESA_PARTY_B=<till number>`. |

To go live you need a Safaricom Paybill or Till, and Safaricom's approval of your Daraja app for production. Set `MPESA_CALLBACK_BASE` (or `PUBLIC_URL`) to your public https address so callbacks arrive instantly.

### Cards (Stripe)

| Mode | When | What happens |
| --- | --- | --- |
| **Test order** | `STRIPE_SECRET_KEY` is not set | A "Test order, no charge" option records the order. Nobody is charged. |
| **Stripe** | `STRIPE_SECRET_KEY` is set | Checkout sends the shopper to Stripe's own hosted checkout page (card, Apple Pay, Google Pay). The order is marked paid when they return, or when Stripe's webhook arrives. |

To turn on Stripe:

1. Copy `.env.example` to `.env`.
2. Paste a **test** secret key (`sk_test_…`) from the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys) and restart.
3. Pay with test card `4242 4242 4242 4242` (any future expiry date, any CVC).
4. Optional but recommended for production: set `STRIPE_WEBHOOK_SECRET` and point a Stripe webhook at `/api/stripe/webhook` (event `checkout.session.completed`). Locally, use `stripe listen --forward-to localhost:8787/api/stripe/webhook`.

Card details never pass through this server. For every payment method, the server re-prices the order from the catalog and checks it before taking payment, so prices sent by the browser are ignored.

## Store artwork

The homepage uses the supplied holiday-gifts hero photo. The 24 product slots and 10 category slots have original local SVG illustrations. Run `node scripts/draw-site-art.mjs` to recreate the illustrations and update `src/data/images.json`; it preserves the supplied hero photo when present. No image service or API key is needed.

For optional photorealistic replacements, all 35 slots also have prompts in [scripts/image-prompts.mjs](scripts/image-prompts.mjs). Any slot without a photo uses the local SVG artwork.

```sh
npm run images -- --dry-run                       # list every prompt; no API calls, no cost
npm run images -- --provider openai               # generate whatever's missing (or gemini / replicate)
npm run images -- --only products/plush-robe --force   # redo one image
npm run build                                     # include the new images in the site
```

Add the key for the provider you pick to `.env` (`OPENAI_API_KEY`, `GEMINI_API_KEY` or `REPLICATE_API_TOKEN`). Images are saved under `public/images/` and listed in `src/data/images.json`. To change how something looks, edit its line in `image-prompts.mjs` and regenerate it with `--only … --force`.

## Features

- **Product options:** every option combination is its own variant with its own SKU, price and stock status. Options that are out of stock are greyed out. The chosen options are kept in the URL (`/p/photo-color-mug?size=15oz&handle=black&set=2`).
- **Two steps on the product page:** **Personalize** won't go on until every option is chosen ("Please make a selection"). The personalization form then opens and the button becomes **Add to cart**.
- **Personalization rules:** each text field has minimum and maximum length, allowed characters, a characters-left counter and suggested names. Some fields use an A–Z letter picker. **Color** fields use swatches, and the preview shows the chosen color. **Photo** fields upload the image to the server (JPG/PNG/WebP up to 10 MB, file contents checked). The browser and the server check the same rules (`src/lib/personalization.ts`).
- **Cart:**
  - a gift bag add-on ($2.99 each)
  - **Edit**, which reopens the product with its options and personalization filled in
  - **Save for later** and **Move to cart**
  - promo codes (`WELCOME15`)
  - a free-shipping progress bar
- **Checkout:** contact, shipping address, Standard or Express delivery with arrival dates, and payment. The order confirmation page shows each line with its SKU and personalization.
- **Filters:** gift for, occasion, product type, "personalize with" and price ranges, each showing how many products it would leave. Plus sorting, items per page and pagination, all kept in the URL.

## Customer accounts

Shoppers can create an account at `/sign-in`, or keep checking out as guests.

**What an account gives them:**
- order history in `/account`
- a pre-filled checkout
- profile editing and password changes
- account deletion

**How it's secured:**
- **Passwords** are hashed with scrypt and never stored or returned as typed.
- **Sessions** are a random token in an `HttpOnly`, `SameSite=Lax` cookie (also `Secure` when the site runs over https). The server keeps only a hash of each token in `server/data/sessions.json`.
- **Requests from other websites are blocked:** account requests must be JSON and come from this site.
- **Guessing is slowed down:** sign-in, sign-up and reset requests are rate-limited per address, and sign-in also per email.
- **No hints about who has an account:** a wrong password and an unknown email give the same message, and "forgot password" always answers the same way.

**Password reset:**
- Reset links work once, expire after 30 minutes, and sign the customer out of every other device.
- **No email service is connected yet.** The reset link is printed in the server log as `[password reset] email: link`. Connect an email provider (for example Resend, Postmark or SendGrid) in `server/auth.mjs` before launch, where the `console.log` is.

**Other details:**
- Only orders placed while signed in are linked to an account, so nobody can see someone else's orders by registering with their email.
- Deleting an account removes the person's sign-in and profile. Their past orders are kept as accounting records but are no longer linked to them.

## Store admin: seasons, colors and images

Go to **`/admin`**. Your login must be listed as an admin:
1. Add your email to `.env`, for example `ADMIN_EMAILS=you@yourshop.com`. Separate several emails with commas.
2. Restart the server.
3. Create an account at `/sign-in` with that email, or sign in if it already exists. An **Admin** button appears in the header and on your account page.

Only those accounts can open the admin area. The server checks this on every admin request, so other people are blocked even if they find the URL.

**Seasons & colors:**
- **Six built-in seasons**, each with its own colors, yearly dates and an optional announcement-bar message: Everyday Sage, Valentine's, Spring Blossom, Summer Breeze, Autumn Harvest and Christmas. You can add your own (for example Eid or Black Friday), edit any of them, restore a built-in one to its original, or delete your own.
- **Choose how seasons switch:**
  - **Automatic, by date:** each season turns on during its dates, and outside every range the site shows the season you pick. Date ranges can cross New Year (for example Dec 20 → Jan 5).
  - **Always show one season:** the site ignores dates and shows the season you pin.
- **Six colors per season:** primary (buttons, links), primary dark (announcement bar), accent, soft background, section background and page background.
- **Live preview:** a mini storefront shows your colors as you change them. You can also preview them on the whole admin page before saving. A readability check warns you if text would be hard to read.
- **Starting state:** a new install is pinned to Everyday Sage, so nothing changes until you choose.

**Images:**
- **Every slot can be replaced:** the homepage hero, the two banners, all 10 categories and all 24 products.
- **For all seasons, or one season only:** an upload for one season replaces the all-seasons image only while that season is live.
- **Reset** goes back to the previous image: from a season-specific one to the all-seasons one, and from that to the original.
- **Allowed files:** JPG, PNG or WebP up to 10 MB. The server checks the file contents. SVG isn't accepted, because SVG files can contain scripts.
- **Storage:** uploads are saved in `server/data/site-images/`. Replaced files are deleted automatically.

Changes go live as soon as you save. The server builds the current season's colors into the page, so visitors never see the old colors flash first.

## Where things live

| Path | What |
| --- | --- |
| `src/data/catalog.ts` | Products, option groups → generated variants, personalization fields |
| `src/lib/pricing.ts` | Totals, gift bags, shipping, promo codes. Shared by the browser and the server. |
| `src/lib/personalization.ts` | Field validation and summaries. Shared by the browser and the server. |
| `src/api/mockServer.ts` | Cart, favorites and newsletter, kept in this browser's localStorage, using versioned "sections" |
| `src/api/client.ts` | The only module the UI uses to reach a backend |
| `server/index.mjs` | Orders, uploads, Stripe Checkout and webhook, the M-Pesa order flow, static hosting. Data is stored in `server/data/`. |
| `server/mpesa.mjs` | Daraja client (sign-in, STK Push, STK Query, reading callbacks), phone number formatting, the simulator |
| `server/site.mjs` | Seasonal themes (presets, date logic, input checks), image replacements, building the theme into the page |
| `src/pages/admin/AdminPage.tsx`, `src/lib/site.ts`, `src/state/site.tsx` | The admin screens, applying a theme's colors, the readability check, loading the theme at startup |
| `server/auth.mjs` | Customer accounts: password hashing, sessions, password reset, profile, deleting an account |
| `src/state/auth.tsx`, `src/pages/AuthPages.tsx`, `src/pages/Account.tsx` | Sign-in state, the sign-in/sign-up/reset pages and the account page |

## Not handled yet

- Sales tax.
- Emails: order confirmations, password-reset emails and email verification. Reset links currently go to the server log.
- Sharing the cart across devices: the cart lives in the browser. Moving it to the server means replacing the `mockServer` calls in `src/api/client.ts`.
- A database: orders are stored in a JSON file. Use one before running this for real.
- Real product photos: product images are still emoji illustrations.
