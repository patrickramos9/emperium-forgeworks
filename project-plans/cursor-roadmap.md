# cursor-roadmap.md — Emperium Forgeworks

**Version:** 2  
**Last updated:** 2026-11-23  
**Previous version:** [`archive/cursor-roadmap-v1.md`](./archive/cursor-roadmap-v1.md) — frozen 2026-11-22 (status last updated 2026-11-09). Shipped milestones live there. This file does not repeat them.

Author: Patrick + Copilot  
Mode: **Balanced** (improve but don’t rewrite)  
Primary goal: **Ship features fast, then refactor incrementally.**

This document is the **authoritative spec for AI-driven development (Cursor)** on the Emperium Forgeworks storefront, admin portal, and AWS backend.

Cursor should treat this file as the **source of truth** for:
- What to build next
- Where to put code
- How to wire it into the existing architecture
- What is in scope vs out of scope for each open milestone

**Reference docs (how the system works today):** `project-plans/reference/` — not directives.

**Historical plans:** `project-plans/archive/` — including **cursor-roadmap v1**. Cursor should ignore that folder (see `.cursorignore`).

When a milestone ships, move its spec out of this file (note the ship date in **Current status**) and leave the full write-up in the archive version that was current when it shipped. Do not grow v2 back into a history log.

---

## Current status

**Last updated:** 2026-11-23

Open work is numbered **M26+** in priority order. Shipped milestones keep their v1 numbers. Each heading notes the old id.

| New | Was | Milestone |
|-----|-----|-----------|
| **M26** | M9 | SEO and performance remainder — **in test** (2026-11-23). Verify after deploy, then submit the sitemap in Search Console. |
| **M27** | M24 | Variation set bundles |
| **M28** | M23d / M23f | FAQ, contact hours, review seed, payment logos. Social links already live. |
| **M29** | M18 | Cart price-change notifications |
| **M30** | M13b (incl. M6d) | Marketing remainder |
| **M31** | M19 | Catalog sales and multi-product bundles |
| **M32** | — | Custom sculpts: artist accounts (separate login) |
| **M33** | — | Custom sculpts: listings, instance vs rights |
| **M34** | — | Custom sculpts: incoming requests |
| **M35** | — | Artist payouts: bank (Stripe) and PayPal. Admin upcharge is added on top of the artist’s price. |
| **M36** | — | Digital STL shop: personal and commercial licenses for other printers |
| **M37** | M8a.3 | Inbox messages vs notification campaigns |
| **M38** | M12 | Notification preferences |
| **M39** | M6f | Idle cart TTL cleanup — **in test** |
| **M40** | M11a | Fabrication stage detail — deferred |
| **M41** | M11b | Raspberry Pi printer bridge — deferred |
| **M42** | M14 | ForgeLink™ — deferred |
| **M43** | M20b–d | Cloud portability remainder — post-v1 |

| Item | State |
|------|--------|
| **Phase** | **M27** variation set bundles |
| **Next** | **M27** → **M28** → **M29** → **M30** → **M31** → **M32** → **M33** → **M34** → **M35** → **M36** → then M37–M43 |
| **In progress** | _(none)_ |
| **In test** | **M26** — SEO and performance (titles, canonicals, sitemap, robots, JSON-LD). Verify on the live site after deploy. **M39** — Idle cart TTL cleanup (Admin → Settings; daily job + Run now). Repo + Settings UI shipped; verify after backend deploy. |
| **Deferred (feature)** | **Newsletter subscribe** — home form removed; implement under **M30**, then restore UI |
| **Deferred (hardware)** | **M40** → **M41** → **M42** |
| **Post-v1** | **M43** cloud portability (**M20a** Resend email shipped — see v1) |
| **Ops** | Set `RESEND_API_KEY` and verify the sending domain. Merchant Center identity is done; keep business info matched to the live site. |
| **Payments today** | **Production:** Stripe live when `VITE_APP_ENV=deployment` (Amplify `main`). Mock only for local `npm run dev`. |
| **QA** | [docs/qa-test-plan.md](../docs/qa-test-plan.md) |

**M26** can be signed off after a production deploy: public titles, product pages, `/sitemap.xml`, and `/robots.txt`. Then submit the sitemap in Search Console. **M39** can be signed off whenever a backend deploy and a cleanup run are verified. Neither blocks **M27**.

---

## 0. Cursor operating rules

Carried forward from v1. Still in force.

### 0.1 Overall behavior

- **Respect the existing architecture.**
- **Do not introduce new platforms** (no Next.js, no new backend stack, no new DB).
- **Do not remove Amplify, Cognito, DynamoDB, S3, or the existing design system.**
- **Do not change auth logic** unless explicitly instructed.
- **Do not change data models** in `amplify/data/resource.ts` unless the milestone explicitly calls for it.
- **Do not touch GA4 integration** except where a milestone explicitly mentions it.

### 0.2 Refactor policy (Balanced mode)

Cursor **may**:
- Refactor small areas for clarity and reuse.
- Extract helpers into `lib/` or `services/` where appropriate.
- Improve naming and remove duplication.
- Add tests or type refinements where helpful.

Cursor **must not**:
- Perform large-scale rewrites.
- Move major directories (`src/pages`, `src/components`, `amplify/`, `project-plans/`).
- Replace the design system or Tailwind token usage.
- Replace the payment abstraction pattern (`PaymentProvider`).

### 0.3 File placement rules

- **Frontend pages:** `src/pages/**`
- **Frontend shared components:** `src/components/**`
- **Admin components:** `src/components/admin/**`
- **Service layer (data orchestration):** `src/services/**`
- **Amplify clients, auth helpers, utilities:** `src/lib/**`
- **Design system tokens:** `tailwind.config.ts`, `project-plans/reference/design-system.md` (reference only)
- **Backend models:** `amplify/data/resource.ts`
- **Backend custom logic (Lambdas):** `amplify/functions/**`

When adding new functionality, **prefer extending existing patterns**:
- New domain logic → new `service` module.
- New page → `src/pages/...Page.tsx`.
- New admin page → `src/pages/admin/...`.
- New model → `amplify/data/resource.ts` + generated types.

### 0.4 Data access

Use the existing helpers in `src/lib/amplifyDataClient.ts`:

- `getGuestDataClient()` — public reads and guest operations.
- `getCustomerDataClient()` — authenticated customer operations.
- `getAdminDataClient()` — admin-only operations.

When adding new data flows, **always** use the appropriate client helper and follow the existing pattern in `services/`.

Current models are described in [`reference/data-models.md`](./reference/data-models.md). New models called for below (`NotificationCampaign`, `InboxMessage`, sale fields, and so on) are added only when that milestone is in progress.

---

## 1. Open milestones

### M26 — SEO and performance remainder

**Was:** M9.

**Status:** **In test** (2026-11-23). Repo work is in place; verify on the live site after deploy, then submit `https://emperiumforgeworks.com/sitemap.xml` in Search Console. Not a new build unless verification fails. Customer **Gallery** and **Product JSON-LD** were already shipped. Newsletter stays **M30**. Amplify still serves one `index.html` for every route, so titles and product tags are written as soon as the page loads (before the Meta PageView), not baked into a separate HTML file per product.

**Scope still open:**

- Per-route `<title>` and meta description.
- OG tags for key pages (home, PDP).
- **`sitemap.xml`** — public routes + `/shop/:slug` PDP URLs (exclude vault unless public); include `/gallery`.
- **Canonical URLs** on PDP and key landing pages.
- **Schema.org JSON-LD** still to finish:
  - Optional **`WebSite`** on home.
  - Optional **`ItemList`** on `/shop` (product URLs only).
  - **Later — ProductGroup:** parent `ProductGroup` + child `Product`s per variant, with per-variant SKU / image / stock. Not part of this slice.
  - When **M31** ships, `offers.price` must match the live sale price.
  - Public shop catalog only — do not emit Product JSON-LD for vault-gated PDPs.
  - Validate with Google Rich Results Test and Search Console after deploy.
- **Performance:** appropriate image sizes and lazy loading. Confirm Amplify CDN URLs are the ones the pages emit.

**Already done (do not rebuild):** `ProductJsonLd` / `buildProductJsonLd` for public PDPs; Gallery page; Organization JSON-LD.

**Cursor rules:**
- Keep the SPA. No SSR.
- Use the existing head-manager pattern if one is present; otherwise add a minimal one.
- JSON-LD reuses existing product fields. Do not ask admins to paste microdata into specs.

---

### M27 — Variation set bundles

**Was:** M24.

**Status:** Planned — after **M26**. Not the same as **M31** (storewide sales and multi-product bundles). Piece prices stay base + add-on. **M25** (complete, see v1) only changes how those prices are typed.

**Goal:** On a listing with many variation options (for example Legacy of Blood: Monsters, 12 pieces), admin can offer optional fixed-price sets. A shopper may buy a set of 3, 4, or 6 at one price, or ignore bundles and pick any figures at the normal per-piece price.

**v1 rule:** Offer bundles only when the product has **one** variation group. Piece count is the number of checked options in that group. Products with Size and Type (or any second group) do not show bundles.

#### Admin (Add / Edit Product)

- Section under Variations.
- Several bundles per product. Each bundle is a piece count (integer ≥ 2) and a fixed set price. Name is optional and displays as “Set of {n}” when blank.
- A bundle cannot be larger than the number of labeled options. Two bundles cannot share the same piece count.
- Store on the existing `Product.variants` JSON (`StoredVariantsV2.bundles`). No new Amplify model.

#### Shopper (product page)

- If the listing has bundles, show a choice above the variation list. **Choose any** is the default and keeps today’s multi-select: any number of figures, each with its own quantity and price.
- Choosing a set limits checks to that piece count. Quantities stay at 1 so the set cannot be padded. Add to cart stays disabled until the count matches. The price shown is the bundle price, not the sum of the pieces.
- Switching to a smaller set keeps the earliest picks and drops the rest. Switching back to Choose any removes the limit.
- A **Sets** stepper buys more than one copy of the same selection.

#### Cart and checkout

- A completed set is **one cart line** at the fixed price. The line label lists the chosen figures (`Set of 3: Ghoul, Wraith, Vampire`). The same selection increases that line’s quantity.
- Pieces bought without a bundle stay separate lines at their normal prices.
- Checkout checks a bundle line’s unit price against the bundle saved on the product. Individual (non-bundle) lines keep today’s client price.

#### Touch points

- `src/lib/productVariants.ts` — `ProductBundle`, parse/serialize on `StoredVariantsV2`, selection cap, cart variant id
- `src/lib/productPayload.ts`, `src/lib/mapAmplifyProduct.ts`, `Product` in `src/data/seedProducts.ts`
- `src/components/admin/AdminProductBundlesEditor.tsx`, `src/pages/admin/AdminProductEditPage.tsx`
- `src/components/BundlePicker.tsx`, `src/components/VariantPicker.tsx` (selection limit, hide quantity while a set is active)
- `src/pages/ProductDetailPage.tsx` (also the vault PDP, which reuses it)
- `amplify/functions/create-stripe-checkout/handler.ts` plus a small parser beside `order-shared/resolveVariantLabel.ts`

#### Out of scope (v1)

- Bundles on listings with more than one variation group
- Making a bundle mandatory
- **M31** compare-at sales, sale windows, or a bundle made of several different products
- Stacking a set price with a second automatic discount beyond the existing **M6** grant (the set price is the line price; one grant per order still applies after that)

#### Acceptance

- Admin saves sets of 3, 4, and 6 at fixed prices on a one-group listing.
- Shopper can add any figures with no bundle, at the sum of piece prices.
- Shopper who picks a set of 3 cannot check a fourth figure, pays the set price once, and sees one cart line naming the three figures.
- Checkout rejects a bundle line whose price does not match the saved set.

---

### M28 — Storefront trust remainder

**Was:** M23d and M23f. **M23e** social links are already live.

**Status:** Planned — after **M27**, before **M29**. **M23a–c** shipped (trust strip, cart copy, Gallery, mobile nav, newsletter hidden). Full audit and shipped slices are in v1.

**Already done:** Brand social links (Instagram, Threads, Facebook, Etsy) render from `SOCIAL_LINKS` in `src/lib/config.ts` via `SocialLinks` on the footer, contact page, and about page. No Admin → Settings editor in this milestone.

**Goal of the remainder:** Close the unfinished chrome that still reads as a half-built shop.

| Slice | Deliver |
|-------|---------|
| FAQ | **FAQ** page (`/faq`) — resin, scale, supports, shipping, returns, licensed art, made-to-order variance; footer + PDP links |
| Hours | Contact **business hours** (ET); optional simple contact form (mailto or existing email — no new model unless persistence is explicitly chosen) |
| Proof | Seed/import enough approved reviews (incl. Etsy) so home + PDP social proof is never empty; optional payment-method logos on PDP/cart (Visa/MC/Amex/Apple Pay/Google Pay) |

#### Touch points

- New `FaqPage.tsx` + route in `App.tsx`; footer link in `Footer.tsx`; PDP links
- `ContactPage.tsx` — concrete hours; optional form
- Home + PDP reviews: do not hide the whole block when the catalog has approved reviews to show; seed content is an ops task plus whatever import UI is needed
- Optional payment logos near the existing checkout trust strip

#### Out of scope

- Rebuilding M23a–c (trust strip, Gallery, mobile nav)
- A Settings editor for social links
- Trustpilot or a new review network
- Newsletter provider — **M30** (do not put a disabled form back on the home page)
- Catalog sales (**M31**)

#### Cursor rules

- Prefer surfacing existing services over new backends.
- No new Amplify model unless contact-form persistence is explicitly chosen (default: no new model).
- FAQ answers must match `/shipping-returns` and Forge Terms. Do not invent shipping windows.
- Keep the dark forge design system.

#### Acceptance

- `/faq` loads and is linked from the footer; key answers match `/shipping-returns` and Forge Terms.
- Contact page lists concrete business hours.
- Home and PDP social proof is not an empty hole when approved reviews exist.
- No disabled Newsletter or Gallery controls.

---

### M29 — Cart price-change notifications

**Was:** M18.

**Status:** Planned — after **M28**, before **M30**. **M6c** `CartSnapshot` sync is already shipped (v1). Does not wait on **M31** or **M37**.

**Goal:** Notify signed-in customers when an item **in their server cart snapshot** has a **price decrease** or **price increase**. Compare the price the shop charges today (base + add-on). Once **M31** exists, compare the live sale price too.

**Depends on:** **M6c** (`CartSnapshot`, shipped). Until **M37**, write today’s `Notification` row. **M37** migrates those rows to immutable `InboxMessage`. Respect **M38** preferences once they exist; until then, send marketing notifications.

**Design notes:**

- Compare **last notified price** (or price at last `CartSnapshot` sync) vs current catalog `priceCents` (+ variant delta).
- Throttle: one notification per product per user per change window (avoid spam on every cart page load).
- Respect **M38** preferences when implemented; until then, send marketing notifications.
- **Not** the same as **M6** promo grants (account offers); this is **catalog price** transparency.

**Backend:**

- Extend `syncCartSnapshot` (or a dedicated Lambda) to diff prices and create targeted notifications.
- Optional: store `lastNotifiedPriceCents` on snapshot line json.

**Acceptance:**

- Admin lowers a product price → customer with that item in the cart receives an in-system alert with a link to cart/PDP.
- Price increase → optional notification (config or always inform — decide at implementation).

---

### M30 — Marketing remainder

**Was:** M13b. Abandoned-cart email was M6d and stays inside this milestone.

**Status:** Planned — after **M29**. Fifth in the priority sequence. **M13a** (public image URLs + Merchant Center CSV) is production verified — see v1. Meta Pixel catalog events and **Purchase** are production verified (2026-08-28); do not add a second Purchase snippet.

**Goal:** Finish growth plumbing that M13a and the pixel work left open.

1. **Google Merchant Center — product sync (preferred: API)**
   - Push catalog updates via the **Google Merchant Center Product API** (successor to Content API for Shopping) — insert/update/delete products when admin publishes or changes a `Product` (price, availability, image, title, link).
   - **Why API over a file feed:** stays in sync when you edit in admin; no stale XML; fits an Amplify Lambda on product save or a scheduled reconcile job.
   - **Bootstrap option:** a one-time or nightly **XML/JSON feed** from `Product` data if API credentials lag — same field mapping as API payloads. CSV export from M13a can remain the manual fallback.
   - **Required fields (typical):** `id`, `title`, `description`, `link`, `image_link`, `price`, `availability`, `condition`; `identifier_exists: no` for custom prints without GTIN when allowed.
   - **Exclude** vault-gated SKUs unless they are intentionally listed in a separate feed.
   - **Ops:** keep Merchant Center business info aligned with `/contact`, footer address/phone, and Organization JSON-LD.
   - On-page JSON-LD (**M26**) is for organic search. Merchant API is for Shopping / free listings. Both use the same product fields. Send the price the shop charges today. Once **M31** exists, send the live sale price.

2. **Tracking pixels (remainder)**
   - Confirm GA4 events: view item, add to cart, begin checkout, purchase (after Stripe).
   - Meta pixel **already live** (ID `1772000520810676`): PageView, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Search`, and **Purchase** from the paid `Order`. Leave that path alone.
   - Optional: TikTok pixel, behind an env flag.
   - **Follow-on (optional):** Meta Conversions API (server-side) if the thank-you page is closed before the browser pixel fires.
   - Do not hardcode new pixel IDs; use env vars.

3. **Email capture / newsletter** _(required — home form is currently hidden)_
   - **M23c** removed the disabled “Join the Forge” block. Do **not** ship a disabled form again.
   - Implement subscribe against a provider (Mailchimp or similar) **or** a simple `NewsletterSubscriber` model (email only).
   - Add a basic welcome flow (manual is acceptable at first).
   - **Then restore** the home newsletter UI (and an optional footer CTA) wired to that backend.
   - Acceptance: a valid email submits; invalid and duplicate addresses are handled; the home page has no disabled placeholder.

4. **Abandoned-cart email** (was **M6d**)
   - In-app abandoned-cart grants and notifications already ship (**M6c**, v1). Email is the missing off-site channel.
   - Send through **M20a** `EmailProvider` (`sendEmail()`), not SES.
   - One email per idle cart grant cycle; do not mail a cart that was emptied or whose grant was revoked.
   - Respect **M38** `marketing` once preferences exist. Until then, treat it as marketing mail and keep a clear opt-out path once newsletter/preferences exist.

5. **Retargeting readiness**
   - Preserve UTM parameters through checkout.
   - Store `utmSource`, `utmMedium`, `utmCampaign` on `Order` when present.

**Cursor rules:**
- Keep tracking scripts minimal and configurable.
- Do not hardcode IDs; use env vars.
- Customer email goes through `EmailProvider` only.

---

### M31 — Catalog sales & product bundles

**Was:** M19.

**Status:** Planned — after **M30**. Not in the first five.

**Goal:** Admin-defined **storefront sales** on individual products and **bundles of separate products** (multi-SKU single purchase). Distinct from **M6** (per-account promo grants) and from **M27** (fixed-price sets of options on one listing).

**Scope (v1):**

1. **Single-product sale**
   - Fields on `Product` (or `ProductSale` overlay): e.g. `salePriceCents`, `compareAtCents`, `saleStartsAt`, `saleEndsAt`.
   - PDP + shop card show struck-through compare + sale price.
   - Cart uses **sale price** for subtotal; checkout Lambda reads live catalog (same as today, with sale fields).

2. **Bundles (v1 minimal)**
   - `ProductBundle` or `bundleItems` json on a sellable “bundle” product: component `productId`s + qty.
   - One add-to-cart for the bundle; line items expand for shipping/inventory or stay a single bundle line (decide at spec — prefer expanded lines for M15 shipping).

3. **Admin**
   - Product edit: sale window + compare-at.
   - Bundle editor (which products, bundle price).

**Out of scope (v1):**

- Stack bundle sale with an M6 account promo beyond the existing rule (still **one grant per order**; sale price is the line price before the grant).
- BOGO / complex rules.
- **M27** variation sets (already a different mechanism).

**Relationship to M6:**

| | **M6 promos** | **M31 catalog sales** |
|--|----------------|------------------------|
| Who | Per-user grants | Everyone sees the sale on the PDP |
| Set in | Promo templates / grants | Product (or bundle) admin |
| Checkout | Auto-pick best grant | Line `priceCents` from catalog |

**Also:** When sales ship, JSON-LD `offers.price` must match the **live sale price** on PDP/checkout (see **M26**).

**Acceptance:**

- Admin sets 20% off a SKU for two weeks; storefront shows the sale; cart/checkout totals match.
- Admin creates a bundle at a fixed price; customer adds once; order line items and shipping resolve correctly.

---

### M32 — Custom sculpts: artist accounts

**Status:** Planned — after **M31**, before **M33**.

**Goal:** Artists who sell custom sculpts sign in on their own portal. This is not a customer account, and it is not the shipped sculptor profile editor (bio, gallery, and social links on `/sculptors/:slug`).

**Auth**

- Same Cognito user pool. New group `artist`. No second identity provider.
- `/artist/login` and `/artist` require the `artist` group.
- Admin approves who is an artist (invite, or approve an application). Open self-serve seller signup is out of scope.
- One person may be both a customer and an artist.

**Data**

- `Artist`: `userId` (Cognito sub), display name, `active`, optional `sculptorSlug` when this person already has a public sculptor profile.
- Admin: `/admin/artists` — list, approve, deactivate.

**Acceptance**

- An approved artist signs in at `/artist` and cannot open `/admin`.
- A customer who is not in the group cannot open `/artist`.
- Deactivating an artist blocks the portal.

---

### M33 — Custom sculpts: listings

**Status:** Planned — after **M32**, before **M34**.

**Goal:** A new storefront section where a customer buys a sculpt an artist has posted. The artist uploads an STL and sets two prices. The customer picks one.

**Artist**

- In the portal, create a listing: title, description, preview images, a private STL, an **instance** price, and a **rights** price. Either price may be left off when that option is not offered.
- The STL uses private storage, the same idea as print-service files. It is not a public product image and it is not in the Merchant feed.

**Customer (`/sculpts`)**

- Browse active listings. On a listing, choose:
  - **Instance** — buy a copy. The shop may later sell that sculpt in the store. The buyer does not own the file and does not keep it out of the shop.
  - **Rights** — own the sculpt. The shop issues a license. This sculpt is not added to the shop catalog.
- Checkout stays on the existing Stripe path with a new line type. The customer pays the artist’s saved price plus the **M35** upcharge. The artist is still owed their saved price.

**After purchase**

- **Instance:** admin can promote the listing into a draft `Product` for the shop to print and sell. The STL stays the shop’s print file. Promotion is a deliberate admin action, not automatic.
- **Rights:** the account shows the license. The license body is an admin-edited template filled with the buyer name, sculpt title, and date. Email a copy through `EmailProvider`. Deliver the STL to that buyer only.

**Out of scope**

- Artist payouts and the admin upcharge — **M35**. **M33** stores the artist’s price only.
- The print-service flow, where a customer uploads their own file for the shop to print.
- Putting a rights purchase into the public catalog.

**Acceptance**

- An artist saves an STL with both prices. The public page shows both choices.
- Instance checkout charges the instance price. Admin can create a draft shop product from it. Rights checkout cannot.
- Rights checkout charges the rights price, shows the license on the account, and does not create a shop product.

---

### M34 — Custom sculpt requests

**Status:** Planned — after **M33**.

**Goal:** A customer can ask for a sculpt that is not already listed. Artists see those requests and set prices. The customer then buys an instance or the rights, same as a listing.

**Customer**

- Signed in only. The form takes a description and optional reference images. The request lands in a shared queue.

**Artist**

- Every active artist can see open requests.
- Submitting prices claims the request. Admin can reassign it.
- The artist sets an instance price, a rights price, or both.

**Customer decision**

- The requester accepts one option and pays through the same checkout as **M33**.
- An instance can later become a shop draft. A rights purchase gets the license and the file, and does not enter the catalog.

**Out of scope**

- Several artists bidding on one request.
- Guest requests.

**Acceptance**

- A customer submits a request and sees it as open.
- An artist claims it by setting prices. A second artist cannot claim it.
- The customer pays the chosen price. An instance can later become a shop draft. A rights purchase shows the license and does not enter the catalog.

---

### M35 — Artist payouts

**Status:** Planned — after **M34**. Applies to **M33**, **M34**, and **M36**. Shop catalog checkout stays a normal charge on the existing Stripe account.

**Goal:** The customer pays the artist’s price plus an upcharge. The upcharge is set in the admin portal and added automatically. The artist receives the full price they set, in a bank account or PayPal. The upcharge stays on the shop’s Stripe account.

**Admin**

- Settings field: hosting upcharge percent.
- `upchargeCents = round(artistPriceCents × percent / 100)`.
- `chargeCents = artistPriceCents + upchargeCents`.
- Show the artist’s price and the upcharge before checkout. The artist’s price does not change when the percent changes.

**Artist payout method** (chosen in `/artist`)

- **Bank.** Stripe Connect onboarding. The artist finishes onboarding in Stripe’s hosted flow or the embedded Connect onboarding component. Bank account, routing number, and identity documents are collected by Stripe. The shop never shows those fields and never stores them. The shop stores only the connected account id and whether payouts are enabled. Use an Express dashboard, fee collection by the platform, and negative-balance liability on the platform. Checkout uses destination charges: the charge is `chargeCents`, `application_fee_amount` is `upchargeCents`, and `artistPriceCents` is transferred to the connected account. Stripe pays that balance out to the artist’s bank. Create new accounts with Accounts v2. An artist cannot publish a paid listing until Stripe reports payouts enabled.
- **PayPal.** Stripe cannot deposit into PayPal. The customer still pays `chargeCents` on the shop’s Stripe checkout, so the upcharge lands on the existing Stripe account. After the payment succeeds, send `artistPriceCents` to the artist’s PayPal email with PayPal Payouts. The shop funds that PayPal balance (a transfer from the Stripe payout account into PayPal, or a standing PayPal balance). Store the PayPal email on `Artist`.

**Refunds**

- Bank: refund the full charge and reverse the transfer of the artist’s price.
- PayPal: refund on Stripe. If the PayPal payout cannot be reversed, deduct the artist’s price from that artist’s next payout and record the debt.

**Card fees**

- On destination charges, Stripe’s processing fee comes out of the shop’s upcharge, not the artist’s price. The upcharge percent has to cover that fee on the full charge or the shop’s share can go negative. Check [stripe.com/pricing](https://stripe.com/pricing) when setting the percent.

**Out of scope**

- Taking the upcharge out of the artist’s price.
- A bank-account form on the shop or artist portal.
- Splitting one charge across two artists.
- Paying the artist before the Stripe payment has succeeded.
- Changing shop-catalog checkout, print checkout, or tax.

**Acceptance**

- Admin sets 15%. A $20 sculpt charges the customer $23. The artist receives $20. The shop retains $3 before card fees.
- A bank artist receives $20 in their connected account, paid out to their bank. The shop’s Stripe balance keeps the $3 upcharge. The artist entered the bank account inside Stripe, not on this site.
- A PayPal artist receives $20 at the PayPal email on file. The $3 stays on the shop’s Stripe account.
- A refund of a bank payout returns the artist’s $20. A refund of a PayPal payout either reverses it or subtracts it from the next payout.

---

### M36 — Digital STL shop

**Status:** Planned — after **M35**. Same artist login as **M32**. Payouts use **M35**.

**Goal:** Artists upload STL files and sell those files to other printers. This is not a custom sculpt. The buyer downloads the file. The shop does not print it, and the sale is not exclusive.

**How it differs from M33**

| | **M33 custom sculpt** | **M36 digital STL** |
|--|----------------------|---------------------|
| What the buyer gets | A physical copy the shop may later sell, or exclusive rights to that sculpt | The STL file, under a license |
| Who else can buy it | Rights: nobody else. Instance: the shop may list the physical product | Anyone can buy the same file |
| License | One rights license for the owner | **Personal** and/or **commercial**, priced separately |

**Artist**

- Create a file listing: title, description, preview images, private STL.
- Set a **personal-use** price, a **commercial** price, or both. Leave a price off to hide that license.
- Cannot publish until **M35** says payouts are enabled (Stripe onboarding complete, or a PayPal email on file).

**Customer (`/stls`)**

- Browse active files. Choose personal or commercial. The price shown is the artist’s price plus the **M35** upcharge.
- After payment, the account offers a download of that STL. The download is only for the buyer who paid. Link expires and can be regenerated from the account while the order stays paid.
- The account shows the license: personal or commercial. The wording is an admin-edited template for each type, filled with buyer name, file title, and date. Email a copy through `EmailProvider`.

**Storage**

- STL stays in private storage, same idea as print-service files. It is not a public product image and it is not in the Merchant feed.

**Out of scope**

- Exclusive ownership of a sculpt (**M33** rights).
- The shop printing the file for the buyer (print service, or an **M33** instance).
- Collecting bank details on this site (**M35**).
- Editing the STL after someone has bought it. A new version is a new listing.

**Acceptance**

- An artist publishes a file at $10 personal and $40 commercial.
- With a 15% upcharge, personal checkout is $11.50 and commercial checkout is $46. The artist receives $10 or $40. The shop keeps the upcharge.
- The buyer can download the STL and read the matching license. A second buyer can buy the same file.
- A buyer who paid for personal use does not receive the commercial license.

---

### M37 — Inbox messages vs notification campaigns

**Was:** M8a.3.

**Status:** Planned — after **M36**, before **M38**. **M29** may already have written `Notification` rows for price alerts; migrate those here. **M38** needs this split.

**Depends on (shipped, v1):** **M8a.2** (single `Notification` table + inbox UI), **M6** (promo grant notifications), **M11** (order fulfillment notifications).

**Goal:** Fix the conflation in **M8a.2** where one `Notification` model serves two different purposes:

1. **Admin broadcast campaigns** — editable, schedulable, shown to all signed-in customers (or filtered later by **M38**).
2. **Issued inbox deliveries** — immutable snapshots of what a **specific customer** was told when an event fired (promo grant, order status, vault access, admin-issued grant).

Today, system-issued rows appear in **Admin → Notifications** as editable entries. Editing retroactively changes what customers see in **Account → Notifications**, which is wrong for event-driven messages. There is also no way to tell admin-created broadcasts from auto-generated inbox lines (`kind: marketing` is used for both).

#### Design principles

| Concern | Campaign (broadcast) | Inbox message (issued) |
|---------|----------------------|-------------------------|
| **Mutability** | Admin may edit title/body, schedule, deactivate | **Immutable** after create — historical record |
| **Audience** | All signed-in users (no `userId`) | One `userId` per row |
| **Created by** | Admin UI | System on event (promo, order, vault, …) |
| **Admin UI** | CRUD on **Campaigns** page | **Read-only** list (optional); manage the underlying grant/order instead |
| **Customer UI** | Appears in inbox while active + in schedule | Always in inbox until the user dismisses/reads (no retroactive edit) |

**Promo grants** remain authoritative for discount state (`PromoGrant`); the inbox row is a **delivery receipt**, optionally linked via `promoGrantId`.

#### Data models (Amplify)

**`NotificationCampaign`** _(admin broadcasts — replace broadcast use of `Notification`)_:

- `title`, `body` (required)
- `kind` — `system` \| `marketing` (order campaigns unlikely; order copy is per-user)
- `active`, `startsAt?`, `endsAt?`, `sortOrder`
- No `userId` — broadcast only

**`InboxMessage`** _(immutable per-customer delivery)_:

- `userId` (required, owner read)
- `title`, `body` (required) — **snapshot at issuance**; no admin update after create
- `kind` — `system` \| `order` \| `marketing`
- `source` — `promo_grant` \| `order_fulfillment` \| `vault` \| `admin_grant` \| `cart_price` \| `campaign` (if fan-out from a campaign is added later)
- `promoGrantId?`, `orderId?`, `campaignId?` — optional links for admin drill-down
- `createdAt` (implicit)

**`InboxMessageRead`** _(migrate from `NotificationRead`)_:

- `inboxMessageId`, `userId`, `readAt` — composite PK

**Deprecation:** Stop writing legacy `Notification` / `NotificationRead` after migration. One-time script or dual-read during deploy.

#### Issuance paths (write `InboxMessage`, not `Notification`)

| Event | `source` | `kind` | Link |
|-------|----------|--------|------|
| Favorite / thank-you / abandon-cart grant | `promo_grant` | `marketing` | `promoGrantId` |
| Admin issue grant (notify on) | `admin_grant` | `marketing` | `promoGrantId` |
| Order fulfillment transition (**M11**, shipped) | `order_fulfillment` | `order` | `orderId` |
| Vault access granted | `vault` | `system` | — |
| Cart price change (**M29**) | `cart_price` | `marketing` or `order` | `productId?` |

Lambdas / services to update: `promo-shared/grantIssuance.ts`, `order-shared/fulfillment.ts`, `notificationService.ts` (`createPromoGrantNotification`, `createVaultAccessGrantedNotification`), `promoGrantService.issuePromoGrant`.

#### Customer inbox

- **`listCustomerNotifications`** → query active **campaigns** (schedule + `active`) **plus** the user's **`InboxMessage`** rows; merge and sort by date.
- Campaigns: live reference to the `NotificationCampaign` row (edits affect viewers who have not yet read it — acceptable for broadcasts).
- Issued messages: read from the `InboxMessage` snapshot only.

#### Admin UI

- **`/admin/notifications`** → rename or subtitle **“Campaigns”** — CRUD **only** `NotificationCampaign`; remove edit links for issued inbox rows.
- **Issued inbox (read-only):** optional `/admin/inbox` or a section on the promo template / customer lookup — list `InboxMessage` with `source`, recipient, timestamp; **no** edit/delete of body (revoke the grant / advance the order instead).
- **Issued grants** table (**M6**) remains the control plane for promo offers.

#### Migration

- Rows with `userId` set → `InboxMessage` (infer `source` from `kind` + title heuristics, or default `promo_grant` for `marketing`).
- Rows without `userId` → `NotificationCampaign`.
- `NotificationRead` → `InboxMessageRead` (map notification id → inbox message id).
- Update `scripts/reset-promo-data.ts` for the new table names.

#### Relationship to other milestones

- **M38** — preferences apply to **campaign** categories and optional **marketing** inbox; **order** / transactional inbox may stay mandatory.
- **M29** — cart price alerts that shipped before this milestone are migrated onto `InboxMessage`. New alerts write `InboxMessage`, not `Notification`.
- **M30** — abandoned-cart **email** is a separate channel; the in-app line remains `InboxMessage`.

#### Cursor rules

- **Never** update `title`/`body` on an existing `InboxMessage` after create.
- Do not list issued inbox rows on the campaigns edit screen.
- Keep promo grant + order notification **copy composition** at write time (snapshot), same strings as today.
- Campaign fan-out to per-user snapshots is **out of scope** for v1 of this milestone — campaigns stay a live reference for all viewers.

#### Acceptance

- Admin creates a **campaign** → all signed-in customers see it in the inbox; admin can edit campaign copy; customers see the updated text.
- Promo grant issued → **one** `InboxMessage` for that user; admin **cannot** edit it from the campaigns UI; text stays put if the admin edits the promo template.
- Order **shipped** → immutable `InboxMessage` with tracking copy; links to order detail.
- Account inbox badge + read/unread works with `InboxMessageRead`.
- No issued system messages appear as editable rows in **Admin → Campaigns**.

---

### M38 — Notification preferences

**Was:** M12.

**Status:** Planned — after **M37**.

**Goal:** Let customers control which notifications they receive.

**Depends on:** **M37** (campaign vs inbox split — preferences target **campaign** categories and optional **marketing** inbox; transactional `order` inbox may remain mandatory).

**Data model:**
- `NotificationPreference`:
  - `userId` (PK)
  - `system: boolean`
  - `order: boolean`
  - `marketing: boolean`
  - `printProgress: boolean`
  - `chat: boolean`

**Auth:**
- Owner read/write.
- Admin read.

**Backend logic:**
- When creating notifications:
  - For targeted notifications, check preferences for that `userId`.
  - For broadcasts, skip users who have disabled that category.
- Transactional notifications (order/print) may be mandatory; this can be a config flag.

**Frontend:**
- Account settings page:
  - `/account/settings` or a section on `/account`.
  - Toggles for each category.

**Cursor rules:**
- Do not retroactively delete existing notifications.
- Only prevent new ones from being created for disabled categories.

---

### M39 — Idle cart TTL cleanup

**Was:** M6f.

**Status:** **In test** (2026-08-09) — repo + Settings UI shipped; verify after backend deploy. Not a new build unless verification fails. Does not block **M27**.

**Goal:** Keep `GuestCartSnapshot` / `CartSnapshot` (and product `activeCartCount`) from growing forever by deleting idle server carts past an admin-configured threshold.

**Admin → Settings (`/admin/settings`)**
- Idle threshold in **days** (default **90** when unset).
- Scope: **guest** · **signed-in** · **both**.
- **Enable daily automatic cleanup** (off by default) — scheduled Lambda reads saved `CatalogSettings`.
- **Run cleanup now** — admin mutation uses current form values (works even when the daily job is disabled).

**Backend**
- `CatalogSettings`: `cartCleanupEnabled`, `cartCleanupIdleDays`, `cartCleanupScope`.
- `cleanup-idle-carts` Lambda (`schedule: every day`) + `runIdleCartCleanup` mutation (admin).
- Deletes by snapshot `updatedAt`; adjusts `activeCartCount`; signed-in deletes also revoke open `abandoned_cart` grants.

**Out of scope**
- Guest favorites / notifications / print-request TTL (cart snapshots only).
- A Dynamo TTL attribute (the job deletes so counts stay consistent).

**Acceptance**
- Save settings → reload Settings shows the same days / scope / enabled flag.
- Run now with a short threshold deletes matching idle rows; admin cart counts and product `activeCartCount` update.
- With enabled off, the daily job no-ops; with enabled on, the job uses saved settings.

**Deploy:** Backend (schema + Lambda) + frontend Settings page, if not already on `main`.

---

### M40 — Fabrication stage detail (deferred)

**Was:** M11a.

**Status:** Deferred — optional, after the customer-facing order timeline (shipped in v1 as **M11**).

**Goal:** Internal print pipeline tracking (`PrintJob`: queued → printing → wash → supports → cure) without changing the customer-facing four stages.

**Customer rule:** The storefront keeps showing **processing** until admin sets **shipped** on the parent `Order`.

**Acceptance:** Admin sees a micro-stage stepper on order detail; customer UI stays the same except for an optional admin note.

---

### M41 — Raspberry Pi printer bridge (deferred)

**Was:** M11b.

**Status:** Deferred with **M40**.

**Depends on:** **M40** (`PrintJob` model and stage API).

**Goal:** Automate stage transitions for the **3D printing** step using a Pi on the LAN.

**Backend:**
- Secure endpoint (mutation) the Pi calls:
  - `updatePrintJobStage(printJobId, stage, metadata?)`
  - Auth via API key or service token (not Cognito).
- Idempotent: repeated calls with the same stage are safe.

**Pi side (out of this repo; the API must support it):**
- Pi connects to the printer via SDCP.
- On print start, calls `updatePrintJobStage(..., "printing")`.
- On print complete, optionally calls `updatePrintJobStage(..., "wash")` or leaves the stage for admin.

**Cursor rules:**
- Implement only the backend endpoint and wiring to `PrintJob`.
- Do not implement Pi code in this repo.

---

### M42 — ForgeLink™ hardware MVP (deferred)

**Was:** M14.

**Status:** Deferred with **M41**.

**Depends on:** **M41** (reuse `updatePrintJobStage`; do not invent a second device auth scheme).

**Goal:** Prepare the platform for a sellable Pi-based print bridge.

**Scope (in this repo):**

1. **Device model** — `ForgeDevice`: `id`, `name`, `apiKey` (hashed or token), `status: "active" | "inactive"`, `lastSeenAt`, `notes?`.
2. **Admin UI** — `/admin/devices`: list, create (generate token), deactivate/reactivate.
3. **API** — `updatePrintJobStage` from **M41**, scoped to a device. Device token, separate from Cognito. `registerDevice` is optional or admin-only.
4. **Pairing** — manual for now: admin creates the device and copies the token into the Pi config.

**Cursor rules:**
- No billing, multi-tenant, or external customer onboarding.
- Keep ForgeLink™ logic separate from core storefront flows.

---

### M43 — Cloud portability remainder (post-v1)

**Was:** M20b–d. **M20a** stays the shipped email phase.

**Status:** **M20a** (`EmailProvider` / Resend) shipped — see v1. **M43** starts after M26–M42 are shipped or explicitly deferred. Not a big-bang rewrite.

**Goal:** Ports + adapters so storage, auth, and data access are not hard-wired to AWS, matching `PaymentProvider` and `EmailProvider`. Storefront and admin keep stable domain APIs.

**Non-goals:** Multi-cloud active/active. Replacing React, Stripe, or GA4. Rewriting every Amplify model in one release.

| Phase | Port | Today | Adapters (examples) | Lift |
|-------|------|-------|---------------------|------|
| **M20a** (shipped) | `EmailProvider` | **Resend** (live) | — | **Done** (v1) |
| **M43** storage | `BlobStorageProvider` | `storefrontStorage`, image upload helpers → S3 | S3, Azure Blob | Medium |
| **M43** auth | `AuthProvider` / session | `customerAuth`, `adminAuth`, Cognito groups | Cognito (default), Entra External ID, Auth0 | Large — user migration risk |
| **M43** data | `DataRepository` / domain stores | `src/services/*` → AppSync `generateClient` | Amplify Data (default), REST over Functions | **Largest** — strangler per domain |

**Rule:** App code calls `sendOrderEmail()`, `uploadProductImage()`, `getOrderById()` — not `S3Client` or `client.models.Order.get`.

**Package layout (target):** extend `packages/shared/` (or `packages/platform/`) with `contracts/storage.ts` and adapters beside the existing `contracts/email.ts` and `contracts/payments.ts`.

**Migration:** one port at a time; default adapter is the current implementation (no behavior change on merge). Contract-test each adapter. No dual-write except when migrating auth or data.

**Cursor rules:**
- New cloud integrations go behind a port.
- Do not delete the Amplify backend until data-port coverage is explicit per domain.
- “Do not replace Amplify” (§3 below) holds until **M43** is the active milestone for that concern.

**Acceptance (M43 complete):**
- Domain services in `src/services/` have no direct Amplify model imports for migrated domains.
- Documented adapter matrix: which ports exist and which cloud backs production.
- Abandoned-cart email (**M30**) and any new customer mail use `EmailProvider` only.

---

## 2. Frontend and backend guidelines

**Frontend**
- Use existing layout components (`Layout`, `AdminLayout`) and Tailwind tokens.
- New pages: route in `App.tsx`, file in `src/pages/...`.
- New admin pages: admin nav + `requireAdminSession`.
- Errors: local `error` state and a visible message. Log to the console where helpful. Do not add a new logging stack.
- Loading: spinners or skeletons consistent with existing pages.

**Backend**
- New models go in `amplify/data/resource.ts`.
- Custom logic: Lambda under `amplify/functions/`, wired with Amplify Data custom resolvers when needed (see [`reference/api-reference.md`](./reference/api-reference.md)).
- Auth: `allow.guest()` for public read; `ownerDefinedIn("userId")` for customer-owned data; `ownerDefinedIn("editorUserId")` for sculptor partner self-service; `group("artist")` for the custom-sculpt portal (**M32**); `group("admin")` for admin-only operations.

---

## 3. What Cursor must not do

- Do not replace Amplify with a custom backend **except where a milestone explicitly scopes it (M43 ports/adapters).**
- Do not introduce a second auth system.
- Do not change the design system or Tailwind token names.
- Do not remove or rename existing models without explicit instruction.
- Do not introduce SSR or a different routing framework.
- Do not move or delete documentation in `project-plans/` or `docs/`.
- Do not re-implement milestones recorded as shipped in **cursor-roadmap v1**.

---

## 4. How to use this roadmap

When Patrick asks Cursor to implement a feature:

1. Identify the milestone in this file. If it is not here, it is either shipped (v1) or out of scope.
2. Follow that milestone’s data model, API, frontend, and backend spec.
3. Respect the operating rules and file placement rules.
4. Keep the change scoped to the milestone.
5. If something is ambiguous, prefer a minimal implementation, consistency with existing patterns, and backwards compatibility.

Ship first. Refactor in slices. Grow the forge.
