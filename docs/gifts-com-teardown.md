# gifts.com teardown

Captured 2026-11-10 with REA (`capture-browser-scenario`, network bodies on). Raw evidence is in `C:\Users\Pucci\Desktop\REA\rea-web\runs\` and in the session scratchpad.

**What this covers:** what the site sends to the browser and what the browser sends back.

**What it doesn't cover:** server code. That can't be seen from outside, so the server-side parts below are inferred from requests and responses.

## Platform

- gifts.com is one store brand on **PlanetArt's** shared e-commerce platform. The page defines about 150 `SITE_*` constants for sister brands (FreePrints, PhotoBarn, Personal Creations, …), and gifts.com is `SITE_ID` 161.
- **Pages are built on the server, most likely in PHP** (`create_item.php`, `geo.php`, `ajax_session.php`).
- **The browser side uses jQuery**, the Swiper slider and typeahead search suggestions.
- **Product images** come from CloudFront and `static.personalcreations.com`.
- **Personalized previews** are drawn by PlanetArt's image server, `ips02.planetart.com/composite`.
- **Other services:** reviews come from TurnTo (`turnToConfig`), and chat is a PlanetArt chatbot or CXone.

## URL scheme

| Page | Pattern |
| --- | --- |
| Product | `/<slug>-design-<designId>-pid-<pcProductId>`, plus `?attr4=16598&attr2=17339&attr49=17199&selected_pid=…` once options are picked |
| Category | `/personalized-mugs-drinkware` |
| Search | `/search?from_search=1&q=mug` |
| Cart / checkout | `/cart` → `/secure/checkout/payment` |

## Product data model

The product page includes `var product_options = {...}` and `var PC_UCD_OPTIONS = {...}` in its HTML.

- **`product_selections`:** the option groups (size, color, set) and their values, with keys such as `attr4_16598`.
- **`product_designs`:** every option combination, keyed like `"attr2_17327-attr4_16598-attr49_17201"`. Each one is a separate variant with its own `design_id`, `sku_id`, `sku`, price (`startAtPrice`), `is_out_of_stock` flag and preview image. The example mug has **36** variants, priced from $14.99 to $95.96 before discount.
- **`PC_UCD_OPTIONS.perzByDesign[designId].Personalization`:** the personalization fields for each variant.

| Field | Type | Rules |
| --- | --- | --- |
| First Name | Text | required, 3–12 characters, regex `^[a-zA-Z\-',.&\s]*$`, mixed case, 14 suggested names |
| Last Name | Text | required, 2–12 characters, same regex |
| Color | Icon | required, option group 975 (Blue_and_Orange, Gray_and_Black, …), each with a swatch image |

Other variant-level fields: `IsPreviewEnabled` and `PreviewUseIps` (whether a preview is drawn, and whether PlanetArt's image server draws it). Sitewide settings: `discount: 30`, `min_qty`, `price_tier_list` (volume pricing) and add-ons such as a gift bag.

## Product page flow (as captured)

1. **Page load:** `POST /common/getB2cPriceList` returns the server-calculated price for each SKU and personalization: retail 14.99, sale 10.49, discount 30. `GET /common/getB2BSLADate?product_id&sku_id&option_id&quantity` returns the earliest arrival date.
2. **Picking an option:** the URL updates, and the price and date are fetched again.
3. **Clicking PERSONALIZE before picking every option:** the page refuses and shows "Please Make A Selection" on each missing group.
4. **Clicking PERSONALIZE with all options picked:** the field form expands on the page. The button turns into ADD TO CART.
5. **Changing a field:** `POST /webservices/ucd/get_pc_ucd_preview_payload.php` sends `design_id`, `sku_rel_id` and `perz_data[]`. It returns a layered layout for the preview image: a 1500×1500 canvas, the product photo, and text layers with font, color, x/y position, size and blend mode. The image server renders it, and the result is cached at `/files/pc_ucd_preview_cache/...`.
6. **ADD TO CART:** `POST /products/create_item.php` sends `action=create_item`, `quantity`, `option_id`, `design_id`, `sku`, `sku_id`, `attr_value_string`, `sku_rel_id` and `pc_ucd_perz_data[]`. It returns `{item_id, hash_id, redirect_url:"/cart"}`.
7. **Confirmation panel:** `POST /new_cart/getContinueShoppingPanelData` (`id=<item_id>`) returns the item's prices, its personalization values with swatch thumbnails, and signed preview URLs (`/rest/pub/cart-items/<id>/preview?file=front_preview.jpg&v=…&sig=<hmac>`).

## Visitor-specific data (all pages)

- `POST /rest/web/sections` returns the `cart`, `favorite` and `customer` sections, each with a `version`. A second call returns `{"sections":[]}` when nothing has changed. The browser keeps a copy of each in localStorage (`pa_section_*`).
- `GET /rest/web/mine/mini-cart` returns `{html, subtotal, count, currency}`. The server sends the cart drawer as ready-made HTML.
- Other endpoints:
  - `GET /rest/web/mine/cart?mini=1`
  - `/rest/web/mine/favorites`
  - `/new_favorites/add` and `/new_favorites/delete`
  - `/cart/removeItem`
  - `/rest/web/mine/profile-menu`
- Tracking pings: `/rest/web/events/visit`, `/rest/web/search_tracking`, `ajax_session.php`.

## Search and categories

- **Suggestions:** `POST /common/search/suggest` returns a list of phrases (`["mug set","mug for mom",…]`). `/common/search/suggestProducts` returns matching products.
- **Results and category pages are server-rendered**, 36 per page by default (options: 36/48/72/96/All), with numbered pages ("532 results", 15 pages).
- **Filters** show a count next to each choice: a price range slider ($0–$100+), product type, occasion, subcategory, recipient ("gift for": Her 147, Him 92, Dad 25…), licensed brand and color.

## Cart page

- **Each line shows:** the rendered preview, the chosen options, Details, Edit, Save for Later, a quantity stepper and an "Include a Gift Bag – $2.99" add-on.
- **Also on the page:** a special-offer upsell, a promo code box (30% is already applied), and Checkout, Apple Pay or PayPal.
- **Totals:** tax and shipping are added at checkout.

## Not captured, by choice or because it's impossible

- **Checkout, payment and account pages.** Going further would mean entering personal or payment details or creating an account on their site.
- **Server-side logic:** how prices are calculated, how orders are fulfilled, the database. Only the request and response shapes above are known.
