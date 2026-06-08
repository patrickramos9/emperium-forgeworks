# QA test plan — Emperium Forgeworks Store

Feature-by-feature manual QA checklist for production (and optionally local/sandbox). Use this after deploys, before marking a milestone verified, or for periodic regression.

**Related:** [cursor-roadmap.md](../project-plans/cursor-roadmap.md) (what’s shipped vs planned) · [stripe-setup.md](./stripe-setup.md) (payments & promo checkout behavior)

**Roadmap last synced:** 2026-06-03

---

## Testing now (not production-verified)

Use this list after a deploy that includes **M6b/c** and **M17** backend + frontend (`amplify_outputs.json` fresh). Skip sections marked **verified** unless regressing.

| Priority | Milestone | Section | What to verify |
|----------|-----------|---------|----------------|
| **P0** | **M6b** | §17 (M6b), §2 PDP | Favorites UI, favorite promo template, line-scoped discount, webhook re-issue |
| **P0** | **M6c** | §17 (M6c), §4 | Cart snapshot sync, abandoned-cart template + idle hours, grant + notification |
| **P1** | **M17** | §17b, §4 | Removed/delisted product in cart + stale favorite on deleted PDP |
| **P2** | **M6 polish** | §4, §5, §17 | Cart line thumbnails; Stripe “Was $X each” / submit summary with promo |
| **Smoke** | Shipped | Quick smoke, §5 (no promo), §8 | Core paths still work after deploy |

**Already production-verified (regression optional):** M6 core promos (§17 minus M6b/c), M15 shipping, M3b Stripe, M8b/c/d reviews & sculptors, M7b vault.

**Do not test yet (not in repo / deferred):** M19 sales/bundles, M18 price-change notifications, M9a UX polish, M6d abandoned-cart email, M11 print tracking, M10/M12/M13/M16.

### Deploy prerequisites (M6b/c + M17)

- [ ] Amplify backend deployed: `Favorite`, `CartSnapshot`, `toggleProductFavorite`, `syncCartSnapshot`, `PromoTemplate` flags (`useForFavorite`, `useForAbandonedCart`, `abandonAfterHours`), optional `Favorite.productSlug`
- [ ] Frontend deployed against current `amplify_outputs.json`
- [ ] At least one **active** promo template per source you test (thank-you / favorite / abandoned) — exclusive flags clear other templates when enabled
- [ ] For **M6c** QA: set **abandon after hours** low (e.g. **1**) on the abandoned-cart template for faster idle trigger

---

## How to use this doc

1. Pick an **environment** (see below).
2. Work through sections **top to bottom** for full regression, or jump to a **feature section** after a targeted change.
3. Mark each step: **Pass** · **Fail** · **Skip** (N/A) · **Blocked**.
4. Note browser/device, date, and tester initials in the **Run log** at the bottom.
5. File bugs with: steps, expected vs actual, URL, order ID / screenshot if relevant.

### Environments

| Environment | URL / setup | Checkout |
|-------------|-------------|----------|
| **Production** | https://emperiumforgeworks.com | Stripe live (`VITE_APP_ENV=deployment`) |
| **Amplify preview** | `main.*.amplifyapp.com` branch URL | Same as prod if env vars set |
| **Local** | `npm run dev` | Mock checkout (`VITE_APP_ENV=local`) |
| **Sandbox** | `npm run sandbox` + local dev | Mock or Stripe test keys |

### Test accounts (prepare before QA)

| Role | How to get | Used for |
|------|------------|----------|
| **Admin** | Cognito user in `admin` group | `/admin/*` |
| **Customer A** | Register at `/account/register` | Orders, reviews, notifications, **promo grants** |
| **Customer B** | Second account (different email) | Promo non-transferable checks |
| **Vault customer** | Admin grants `VaultAccess` on `/admin/vault` | `/vault` catalog |
| **Sculptor partner** | Admin sets `editorUserId` on sculptor | `/partner/sculptor` |

### Stripe test card (test mode only)

- Card: `4242 4242 4242 4242` · any future expiry · any CVC · any ZIP

---

## Quick smoke (15–20 min)

Run after every production deploy.

- [ ] Home (`/`) loads; no console errors
- [ ] Shop (`/shop`) lists products with images and prices
- [ ] Open a product PDP; add to cart
- [ ] Cart shows line + subtotal; checkout completes (or mock locally)
- [ ] Success page loads; cart clears
- [ ] Admin login (`/admin/login`); dashboard loads
- [ ] Admin **Orders** shows the new order as **Paid** (Stripe) or expected mock status
- [ ] **Promo (if configured):** signed-in customer with admin-issued grant sees discount on `/cart` (optional smoke)
- [ ] **Cart thumbnails** load on `/cart` (not broken icon) for at least one line
- [ ] Mobile width (~390px): nav + cart usable

---

## 1. Storefront — layout & navigation

**Routes:** `/`, `/shop`, `/about`, `/shipping-returns`, `/reviews`

- [ ] Header: logo, shop link, cart icon with count, account menu
- [ ] Footer links work (about, shipping, etc.)
- [ ] **Site system banner** (`Announcement` kind=`system`) shows when active; dismiss/hide behavior OK
- [ ] **Announcement** cards (kind=`promo`) appear on home/shop when pinned/active — not the same as **promo grants** (M6 §17)
- [ ] `/process` redirects to `/about`
- [ ] Deep links and browser back/forward behave correctly
- [ ] 404 / unknown paths: sensible fallback (no blank screen)

---

## 2. Catalog & product detail (M2, M7a)

**Routes:** `/shop`, `/shop/:slug`

### Shop list

- [ ] Products load from API (not seed-only banner in production)
- [ ] Category filter works (`?category=…`)
- [ ] Featured / sort order reasonable
- [ ] Product cards: image, title, price
- [ ] Vault-only products **do not** appear on public shop

### Product detail (PDP)

- [ ] Gallery: main image, thumbnails, variant image swap (if variants)
- [ ] Price updates with variant selection (multi-select variants if configured)
- [ ] **Add to cart** disabled when out of stock or variants required but none selected
- [ ] Specs block (material, sculptor, status) when present
- [ ] Description and lore sections render
- [ ] “You might also like” links work
- [ ] Breadcrumb: Shop → category → product

### Favorites (M6b) — PDP

- [ ] **Signed out:** “Save to favorites” prompts sign-in (no API error)
- [ ] **Signed in:** **Save to favorites** / heart toggles; state persists after refresh
- [ ] First favorite on a product (with favorite template active): in-system **notification** + open **favorite** grant (if not already open for that product)
- [ ] Second favorite on same product: no duplicate grant spam (behavior per template rules)

---

## 3. Shipping display (M15)

**Depends on:** Admin → Shipping profiles + product assignment (or store default)

### Admin setup (prerequisite)

- [ ] At least one **active** shipping profile; one marked **default**
- [ ] Profile has rate + optional **ready to ship** min/max days
- [ ] Products assigned a profile (or rely on default)

### Product page

- [ ] Shipping block under price shows profile name
- [ ] Rate text matches profile (flat + additional, free-over-threshold, or weight tier)
- [ ] Ready-to-ship text matches profile (e.g. “Ships in 3–5 business days”)
- [ ] After assigning a profile in admin, **re-save the product** once (writes `shippingDisplay` snapshot for PDP)
- [ ] Product with no resolvable profile: visible message + link to **Shipping & returns** (no crash)

### Checkout & orders (see §5, §8)

- [ ] Stripe Checkout shows **one shipping line** with computed total
- [ ] Admin order detail: **subtotal**, **shipping**, **total**, **shipping label**
- [ ] Ship-to address populated on paid Stripe orders

### Shipping edge cases (full M15 QA)

- [ ] **Single item**, flat profile: shipping = first-item rate
- [ ] **Two of same product**: first + additional-item rate (Option B within same profile)
- [ ] **Mixed cart**, two flat profiles: highest first-item + additional on second group
- [ ] **Free over threshold**: subtotal below threshold → charged; at/above → $0 shipping
- [ ] **Weight tier**: product has **weight (oz)**; tier amount matches checkout
- [ ] **Weight tier**, missing weight: checkout fails with clear error (not $0)
- [ ] **Large-order profile**: extended ready-to-ship on assigned products
- [ ] Inactive profile / no default: checkout fails with admin-actionable error

---

## 4. Cart (M3a, M6)

**Route:** `/cart`

- [ ] Empty cart message + link to shop
- [ ] Line items: title, variant label, qty, line total
- [ ] Quantity +/- respects max; remove line works
- [ ] Subtotal correct
- [ ] **Signed out:** “Sign in for promotional offers” (or similar); no promo line applied
- [ ] **Signed in, no grants:** subtotal only; no promo deduction line
- [ ] **Signed in, active grant:** promo line shows label, **expiration date**, and −discount; **total before shipping** = subtotal − discount
- [ ] **Line thumbnails** resolve from catalog/S3 (not raw `localStorage` paths); refresh `/cart` still shows images
- [ ] **Mock checkout banner** visible when `VITE_APP_ENV=local`
- [ ] **Out of stock** line flagged; checkout blocked until fixed or removed
- [ ] **Removed from catalog** line flagged (§17b); subtotal/promo exclude non-purchasable lines
- [ ] **Price changed** since add-to-cart: flagged; checkout blocked until user refreshes from PDP (re-add)
- [ ] Clear cart works
- [ ] **M6c:** signed in with items → idle on `/cart` (debounced sync ~600ms) updates server snapshot; see §17 (M6c)

See **§17** for grant setup and checkout verification. See **§17b** for removed-product UX (M17).

---

## 5. Checkout & payments (M3a, M3b)

**Routes:** `/cart` → Stripe or mock → `/checkout/success` | `/checkout/cancel`

### Mock (local)

- [ ] Checkout creates order in DynamoDB (if Amplify connected)
- [ ] Redirect to success; cart cleared
- [ ] Cancel returns to cancel page; cart state acceptable

### Stripe (production / deployment)

- [ ] Redirect to Stripe Checkout hosted page
- [ ] Line items and quantities correct
- [ ] **With promo grant:** Stripe line-item totals reflect **discounted** merchandise (subtotal on Stripe ≤ cart subtotal − promo); shipping added separately
- [ ] **With promo grant:** line descriptions or summary mention prior unit price (e.g. **“Was $X each”**) where implemented; submit area shows promo summary when applicable ([stripe-setup.md](./stripe-setup.md))
- [ ] Shipping address collection works (US + configured countries)
- [ ] Phone collection if enabled
- [ ] Pay with test/live card; success redirect to `/checkout/success?session_id=…`
- [ ] **Webhook:** order moves to **Paid** without manual admin edit (allow ~30s; refresh admin)
- [ ] Cancel at Stripe → `/checkout/cancel`; order remains pending/failed as designed
- [ ] Stripe Dashboard: session, payment, shipping amount match admin order

---

## 6. Customer accounts (M4)

**Routes:** `/account/register`, `/account/login`, `/account/forgot-password`, `/account`, `/account/orders`, `/account/notifications`

### Auth

- [ ] Register new customer; confirm email if Cognito requires verification
- [ ] Login / logout
- [ ] Forgot password flow
- [ ] Protected routes redirect to login with `returnTo`

### Account home

- [ ] Profile info displays
- [ ] Links to orders and notifications work

### Orders (customer)

- [ ] Paid orders appear for signed-in customer (owner scope)
- [ ] Order summary readable (date, total, status)
- [ ] Guest checkout orders: behavior documented (may not appear unless linked — verify current behavior)

### Notifications (M8a.2)

- [ ] Inbox lists active notifications for user
- [ ] Unread badge in account menu decrements when marked read
- [ ] Vault-grant notification received when admin adds vault access
- [ ] **Thank-you promo (M6):** after paid order, in-system notification about next-order offer (if thank-you template configured)

---

## 7. Reviews (M8b)

**Routes:** `/reviews`, `/account/orders/:orderId/review`, admin `/admin/reviews`

### Customer

- [ ] Eligible paid order shows review link
- [ ] Submit review (rating + text); cannot submit twice for same order
- [ ] Review **not** public until admin approves

### Public

- [ ] `/reviews` shows only **approved** reviews
- [ ] Home page review snippet (if configured) shows approved content

### Admin

- [ ] Pending reviews listed
- [ ] Approve / reject (or delete) updates storefront visibility

---

## 8. Admin — orders (M2, M3b, M15, M6)

**Routes:** `/admin/orders`, `/admin/orders/:id`

- [ ] Order list loads; sorted by date
- [ ] Order detail: customer email, name, phone, session ref
- [ ] Line items JSON parsed and displayed
- [ ] Subtotal / shipping / total / shipping label (M15)
- [ ] **Promo (M6):** orders that used a grant show **promo label**, **discount** (−), and **promo source** (e.g. `admin`, `thank_you`)
- [ ] Paid order **without** promo: promo fields empty or absent (not required)
- [ ] Ship-to address formatted
- [ ] Manual status dropdown saves (fallback if webhook missed)
- [ ] List does **not** auto-refresh — manual refresh shows new paid orders

---

## 9. Admin — products (M2)

**Routes:** `/admin/products`, `/admin/products/:slug`, `/admin/products/new`

- [ ] List all products; edit link works
- [ ] Create product: slug, title, price, category, images upload to S3
- [ ] Gallery order / detail image
- [ ] Variants / option groups save and reflect on PDP
- [ ] In stock / featured / vault-only flags
- [ ] **Shipping profile** dropdown + **weight (oz)** save (M15)
- [ ] Delete product (confirm)
- [ ] Public PDP updates after save (may need hard refresh)

---

## 10. Admin — shipping profiles (M15)

**Routes:** `/admin/shipping`, `/admin/shipping/new`, `/admin/shipping/:id`

- [ ] List profiles: kind, rate summary, ready-to-ship, default/active badges
- [ ] Create **flat** profile: first item + additional item cents
- [ ] Create **free over threshold** profile
- [ ] Create **weight tier** profile with tier table
- [ ] **Ready to ship** min/max days save and show on list + PDP
- [ ] **Default** profile: only one default at a time
- [ ] **Allowed countries** (e.g. `US, CA`) save
- [ ] Deactivate profile: checkout should not use it
- [ ] Delete profile (confirm; not assigned to products)

---

## 11. Admin — announcements (M8a.1)

**Routes:** `/admin/announcements`, `/admin/announcements/:id`

- [ ] Create promo + system announcements
- [ ] Active date range / pinned / sort order
- [ ] Promo visible on storefront when active
- [ ] System banner visible site-wide when active
- [ ] Inactive announcement hidden on storefront

---

## 12. Admin — notifications (M8a.2)

**Routes:** `/admin/notifications`, `/admin/notifications/:id`

- [ ] Create broadcast notification
- [ ] Target specific user by ID (if supported in UI)
- [ ] Kind `order` / `marketing` / `system` saves
- [ ] Active window respected on customer inbox

---

## 13. Hidden Vault (M7b)

**Routes:** `/vault`, `/vault/:slug`, `/admin/vault`

### Without access

- [ ] `/vault` does not show catalog (gate / redirect / sealed state)

### With access

- [ ] Customer with `VaultAccess` sees vault catalog
- [ ] Vault PDP and add-to-cart work (`/vault/:slug`)
- [ ] Vault products still hidden from `/shop`

### Admin

- [ ] Grant access by email / access key
- [ ] Revoke access removes vault catalog for customer
- [ ] Customer receives notification on grant (if M8a.2 wired)

---

## 14. Sculptors (M8c, M8d)

**Routes:** `/sculptors/:slug`, `/admin/sculptors`, `/partner/sculptor`

### Public

- [ ] Sculptor page: logo, gallery carousel, rich text bio
- [ ] External links (MyMiniFactory, Patreon, social) open correctly
- [ ] Home page sculptor cards link to live profiles
- [ ] Inactive sculptor hidden from public

### Admin

- [ ] CRUD sculptor; slug immutable rules as implemented
- [ ] Logo + gallery upload to S3
- [ ] Rich text description renders on public page
- [ ] Partner access: assign `editorUserId` to customer

### Partner portal

- [ ] Partner login → `/partner/sculptor`
- [ ] Can edit **only** assigned sculptor
- [ ] Non-partner denied
- [ ] Changes appear on public sculptor page

---

## 15. Admin dashboard & GA4 (M5)

**Route:** `/admin` (dashboard)

- [ ] Dashboard loads for admin
- [ ] GA4 metrics widget loads (or graceful error if API/credentials missing)
- [ ] Date range / chart reasonable vs GA4 property
- [ ] Non-admin cannot access dashboard

---

## 16. Static & policy pages

**Routes:** `/about`, `/shipping-returns`

- [ ] About page content and layout
- [ ] Shipping & returns policy readable; contact email link works
- [ ] Policy text aligns with actual behavior (return window, buyer pays return shipping, etc.)

---

## 17. Admin — promo templates & grants (M6 core)

**Routes:** `/admin/promos`, `/admin/promos/new`, `/admin/promos/:id`  
**Requires:** Backend + frontend deploy with `PromoTemplate` / `PromoGrant` models.  
**Ops reference:** [stripe-setup.md — Promo grants](./stripe-setup.md#promo-grants-m6)

**Prerequisites**

- [ ] Two promo templates for comparison tests (e.g. **10% off** and **$5 off**), both **active**
- [ ] One template marked **Use for thank-you grants after paid orders** (only one should win)
- [ ] Optional expiry: e.g. **30 days** on one template; one with **blank expiry** (indefinite)
- [ ] **Customer A** registered; email known to admin (Cognito `listCustomers` / vault customer list pattern)

### Admin — templates

- [ ] **Promo templates** list loads (not “coming soon”)
- [ ] Create **percent** template: name, %, active, expiry days
- [ ] Create **fixed** template: name, dollar amount, active
- [ ] Edit template; save persists
- [ ] **Thank-you** checkbox: enabling on template B clears it on template A (only one thank-you template)
- [ ] **Use for favorite-item grants** checkbox: only one active template; enabling clears flag on others
- [ ] **Use for abandoned-cart** checkbox: only one active template; **abandon after hours** required when enabled (e.g. 1 for QA)
- [ ] **Deactivate** template: still listed; marked inactive
- [ ] Delete template (confirm)

### Admin — issue & revoke grants

- [ ] On template edit → **Issue grant** with **Customer A** email → success
- [ ] Issued grant appears in grant list on template (status **open**)
- [ ] **Revoke** open grant → status **revoked**; customer no longer sees it on cart
- [ ] Issue to unknown email → clear error (no customer found)
- [ ] **Non-transferable:** issue grant to Customer A; sign in as **Customer B** → Customer B does **not** see Customer A’s offer on cart

### Customer — auto-apply at cart

- [ ] Customer A signed in; add item(s) to cart
- [ ] **One grant:** promo line visible with **expiration**; discount amount reasonable (10% or $5 of **merchandise subtotal**)
- [ ] **Two eligible grants** (issue both to same user): **higher savings** wins (e.g. $5 off beats 10% on a $30 cart)
- [ ] **Tie-break (optional):** two grants with same $ savings → **soonest expiry** wins (hard to eyeball; skip if not set up)
- [ ] Promo applies to **subtotal only** — shipping still calculated at checkout (not free shipping unless M15 profile says so)
- [ ] Change cart qty → discount recalculates (percent grants change; fixed cap at line subtotal)

### Checkout & order (with promo)

- [ ] Complete Stripe checkout as Customer A with promo applied
- [ ] Admin order: **Paid**; **discountCents** matches cart; **promoLabel** / **promoSource** populated
- [ ] Stripe Dashboard total ≈ admin **total charged**
- [ ] Grant on template edit shows **redeemed** (no longer open)

### Thank-you grant (post-purchase)

- [ ] Thank-you template **active**
- [ ] After paid order, Customer A gets **in-system notification** (Account → Notifications) describing next-order offer
- [ ] New **open** grant on thank-you template for Customer A (source `thank_you`)
- [ ] Second purchase with items in cart can auto-apply thank-you grant (if not expired/revoked)

### Template deactivate vs issued grants

- [ ] Issue grant while template **active**
- [ ] **Deactivate** template before customer checks out
- [ ] Customer with **already-issued** unused grant: promo **still** appears on cart (deactivate stops **new** issuances only)
- [ ] **Thank-you:** with template deactivated, **new** paid order does **not** issue another thank-you grant

### Guest checkout

- [ ] Guest (signed out) checkout: **no** promo; no server error
- [ ] Signed out cart may show sign-in prompt for offers

### Local / mock limitations

- [ ] **Local mock checkout** (`VITE_APP_ENV=local`): promo UI may show on cart, but Stripe + webhook thank-you path **not** exercised — use deployment or sandbox for full M6

### M6b — Favorite grants

- [ ] Template with **Use for favorite-item grants** (only one active)
- [ ] Signed-in customer on PDP → **Save to favorites** → grant + notification (if no open favorite grant for that product)
- [ ] Favoriting again while grant still open: no duplicate grant (or clear UX if skipped)
- [ ] Cart with that product in cart → favorite grant applies to **that line’s subtotal** only (other lines full price)
- [ ] Cart **without** favorited product: favorite grant does **not** discount unrelated lines
- [ ] Unfavorite → unused grant **still** valid until used/expired (v1: no auto-revoke)
- [ ] Paid order including favorited product → new favorite grant if product still favorited (webhook); notification optional
- [ ] Admin order with favorite promo: `promoSource` = `favorite` when applicable

### M6c — Abandoned cart (in-system)

- [ ] Template with **Use for abandoned-cart** + idle hours (e.g. **1** hour for test)
- [ ] Signed in; add items to cart; visit `/cart` once so snapshot sync runs (starts idle timer)
- [ ] Do **not** change cart contents; waiting ≥ configured hours counts from **last cart change**, not each `/cart` page view
- [ ] Return to `/cart` → sync runs → **open** `abandoned_cart` grant + notification (if no open grant for same snapshot rules)
- [ ] Grant auto-applies on cart when eligible
- [ ] Clear cart or checkout → snapshot cleared or updated; no abandon grant on empty cart
- [ ] **Favorite + abandoned** both eligible: checkout applies **best savings** (same M6 tie-break as §17)
- [ ] **M6d** email — skip (M13)

---

## 17b. Removed-from-catalog — cart & favorites (M17 / B1)

**Status:** In repo — test after **M6b** deploy (needs `Favorite.productSlug` for full stale-favorite path).  
**Prep:** Admin deletes or delists a product that Customer A already has in **cart** and/or **favorites**.

### Cart

- [ ] `/cart` shows removed line with **“removed from the store”** (or equivalent) styling; line is not treated as purchasable
- [ ] Banner or inline copy when checkout blocked; **Checkout** disabled until blocking issues cleared
- [ ] Subtotal / promo discount use **purchasable lines only** (removed line excluded)
- [ ] **Abandoned-cart sync** sends only purchasable lines (removed lines not in snapshot)
- [ ] Remove ghost line → checkout works for remaining items
- [ ] **Out of stock** (product still in catalog): flagged separately from removed; checkout blocked
- [ ] **Server guard:** tamper `productId` in devtools / retry checkout API → Stripe session rejected with clear error

### Favorites / PDP

- [ ] Favorited product still in catalog: heart works as before (§2)
- [ ] After admin **deletes** product: visiting old `/shop/:slug` shows **stale favorite** notice (if user had favorited **after** deploy with slug stored) with option to clear favorite
- [ ] No new **favorite** promo issued for removed product
- [ ] Favorites without stored `productSlug` (pre-deploy rows): stale notice may not appear — acceptable; re-favorite after deploy for full path

### Regression

- [ ] `npm run validate:cart-catalog` passes in CI/local

---

## 18. Cross-cutting / non-functional

### Responsive & browsers

- [ ] Chrome desktop
- [ ] Safari or Firefox
- [ ] Mobile Safari or Chrome (~390px width)
- [ ] Tablet width (~768px)

### Performance & errors

- [ ] No uncaught console errors on main flows
- [ ] Images load (S3 / signed URL); broken image fallback acceptable
- [ ] Hard refresh on PDP/admin edit does not break auth

### SEO / sharing (light)

- [ ] Page `<title>` reasonable on home, shop, PDP
- [ ] Open Graph / meta (if implemented — mark N/A if not)

### Security (smoke)

- [ ] `/admin/*` requires admin login (except `/admin/login`)
- [ ] Customer cannot hit admin API mutations via browser devtools (403/Unauthorized)
- [ ] Guest can read public catalog; cannot read admin-only data

---

## Not yet built — skip until milestone ships

| Milestone | Feature | Notes |
|-----------|---------|--------|
| **M19** | Catalog sales & bundles (list/compare pricing) | Separate from M6 account promos |
| **M18** | Cart price-change in-system notifications | After M19 + M6c |
| **M9a** | Initial UX polish (e.g. add-to-cart toast/feedback) | — |
| **M6d** | Abandoned-cart **email** | In-system M6c only today |
| **M10** | Admin–customer chat | — |
| **M11** / **M11b** / **M14** | Print tracker, Pi bridge, ForgeLink | Deferred |
| **M15b** | Cart shipping estimate preview; Stripe ETA UI | — |
| **M16** | Returns, refunds, exchanges | Email-only policy today |
| **M12** | Notification preferences | — |
| **M13** | Marketing pixels / UTM on orders | — |

**In repo — use §17 / §17b / §2 / §4 (not this table):** M6b, M6c, M17.

Add test sections here when each milestone ships.

---

## Run log

| Date | Tester | Environment | Scope | Pass/Fail | Notes |
|------|--------|-------------|-------|-----------|-------|
| | | prod / local / preview | full / smoke / §N | | |
| | | | | | |

---

## Updating this doc

When a milestone ships, add or expand the matching section and remove it from **Not yet built**. Keep edge-case bullets aligned with [cursor-roadmap.md](../project-plans/cursor-roadmap.md) acceptance criteria.
