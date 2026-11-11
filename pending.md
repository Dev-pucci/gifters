# Pending before launch

## Must do

- [ ] **Product photos.** Products and categories still use placeholder illustrations. You can:
  - generate them with AI: add an image API key to `.env`, then run `npm run images -- --provider openai` (see the README, "AI images");
  - or upload your own photos in **Admin → Images**.
- [ ] **Hero photo.** Replace the current holiday photo (`public/images/hero/holiday-gifts-hd.webp`) with one that suits the sage design, unless you've confirmed you have the rights to it. You can upload a new one in Admin → Images, or regenerate it with `npm run images -- --only hero --force`.
- [ ] **Email service.** Connect a provider (for example Resend, Postmark or SendGrid) so emails actually reach people:
  - **Password resets.** These currently go only to the server log, in `server/auth.mjs` where the `console.log` is.
  - **Contact-form messages.** These are currently saved to `server/data/messages.json`.
  - **Order confirmations.** None are sent yet.
- [ ] **Business details.** Fill in the real email, phone, WhatsApp number, address and legal name in `src/data/business.ts`.
- [ ] **Legal review.** Have a lawyer review the Privacy Policy and Terms of Use (`src/pages/CompanyPages.tsx`).
- [ ] **Policy promises.** Confirm these are what you want to commit to, or change them in `src/data/business.ts` and `src/pages/CompanyPages.tsx`:
  - a 30-day remake-or-refund guarantee
  - changes or cancellations within 12 hours of paying
  - no change-of-mind returns
  - M-Pesa refunds in about 3 business days
- [ ] **Star ratings and review counts.** The ones on products (for example "2,491 reviews") are made up. Replace them with real ones or remove them in `src/data/catalog.ts`.
- [ ] **Testimonials.** Add real customer reviews, with their permission, to `src/data/testimonials.ts`. The homepage section stays hidden until you do.

## Payments

- [ ] **M-Pesa:**
  1. Create a Daraja app at developer.safaricom.co.ke and add `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET` to `.env`. This turns on sandbox mode.
  2. Test with Safaricom's test number 254708374149.
  3. To go live, get a Paybill or Till, have Safaricom approve the app, and set `MPESA_ENV=production`, `MPESA_SHORTCODE` and `MPESA_PASSKEY`.
  4. Set `MPESA_CALLBACK_BASE` to your public https address.
- [ ] **Exchange rate.** Set your own `KES_PER_USD` in `.env` (it currently uses 129), or switch store prices to shillings.
- [ ] **Cards (optional).** Add `STRIPE_SECRET_KEY` (a test key first), and `STRIPE_WEBHOOK_SECRET` for production.
- [ ] **Sales tax / VAT.** It isn't calculated yet.

## Hosting & data

- [ ] **Database.** Move orders, accounts and site settings from the JSON files in `server/data/` to a real database.
- [ ] **Uploaded images.** Admin uploads (`server/data/site-images/`) and customer photos (`server/data/uploads/`) need persistent storage on your host, or a move to cloud storage.
- [ ] **Public address.** Set `PUBLIC_URL` to your real https address and serve the site over https, so sign-in cookies are marked secure.
- [ ] **Backups.** Back up `server/data/` regularly.

## Nice to have

- [ ] **Email verification** when people create an account.
- [ ] **Shared carts.** Carts are saved in each browser; move them to the server so they follow a customer across devices.
- [ ] **Admin management screen.** Admins are currently set with `ADMIN_EMAILS` in `.env`, which needs a server restart to change.
- [ ] **Order management in the admin area.** There's no view of incoming orders yet (they're in `server/data/orders.json`).
- [ ] **Turn on automatic seasons** in Admin → Seasons when you're ready. The site is currently pinned to Everyday Sage.
