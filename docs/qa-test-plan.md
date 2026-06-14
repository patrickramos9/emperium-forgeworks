# QA test plan — Emperium Forgeworks Store

Feature-by-feature manual QA checklist for production (and optionally local/sandbox). Use this after deploys, before marking a milestone verified, or for periodic regression.

**Related:** [cursor-roadmap.md](../project-plans/cursor-roadmap.md) (what’s shipped vs planned) · [stripe-setup.md](./stripe-setup.md) (payments & promo checkout behavior)

**Roadmap last synced:** 2026-06-11

---

## Testing now

**Next milestone:** **M11** — customer order status (paid → received → processing → shipped + tracking). See §19 when spec is implemented.

Pre-launch sign-off closed 2026-06-11. Run smoke after deploys; full §6–§18 checklists for regression when touching related code.

| When | What to run |
|------|-------------|
| **After any deploy** | Quick smoke (§5 checkout, §8 admin order, home/shop load) |
| **Promo/cart/favorites change** | §4, §6, §17, §17b |
| **Catalog/admin product change** | §2 PDP, §17b, §18 admin catalog |
| **New milestone** | Matching section below + remove from **Not yet built** |

**Production-verified (regression optional):** M3b, M6 (core + **M6b** + **M6c**), M7b, M8b/c/d, M15, **M17**, go-live polish §18, order notification email.

**Do not test yet:** M19, M18, remaining M9a (add-to-cart toast, etc.), M6d marketing email, M11, M10/M12/M13/M16.

### Deploy prerequisites (M6b/c + M17) — signed off 2026-06-11

- [x] Amplify **backend** deployed: `Favorite`, `CartSnapshot`, `toggleProductFavorite`, `syncCartSnapshot`, `PromoTemplate` flags, `Favorite.productSlug`
- [x] Amplify **frontend** deployed against current `amplify_outputs.json`
- [x] Promo templates configured per source (admin, thank-you, favorite, abandoned cart)
- [x] Order notification Lambdas/schema + SES verified

### Promo test data reset (between runs)

```bash
npx tsx scripts/reset-promo-data.ts
```

Then recreate templates in **Admin → Promo codes**. Use a fresh browser session or incognito if local cart state confuses idle-timer tests.

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
- [ ] After save: success copy mentions **Account → Saved favorites** (M17)

---

## 3. Shipping display (M15)

**Depends on:** Admin → Shipping profiles + product assignment (first profile by sort order is implicit default)

### Admin setup (prerequisite)

- [ ] At least one **active** shipping profile (first by sort order is implicit default)
- [ ] Profile has rate + optional **ready to ship** min/max days
- [ ] Products assigned a profile (or rely on first active profile)

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
- [ ] Inactive profile / no active profiles: checkout fails with admin-actionable error

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
- [ ] **Catalog loading:** brief **“Verifying cart against catalog…”** — no false **removed from store** while catalog enriches (§17 M6c regression)
- [ ] **Price changed** since add-to-cart: flagged; checkout blocked until user refreshes from PDP (re-add)
- [ ] Clear cart works
- [ ] **M6c:** signed in with items → sync (~600ms on `/cart`, or any page when cart becomes empty) updates server snapshot; see §17 (M6c)
- [ ] **M6c revoke:** clear cart or remove last line **anywhere** (shop PDP qty→0, `/cart` remove) → open `abandoned_cart` grant **revoked**; partial line removal **keeps** grant on remaining subtotal

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
- [ ] Cancel at Stripe → `/checkout/cancel?session=…`; pending order becomes **Cancelled** (allow ~10s; refresh admin)
- [ ] Expire open session in Stripe Dashboard (or wait for expiry) → webhook sets pending order **Cancelled**
- [ ] Full refund in Stripe Dashboard on paid order → webhook sets order **Refunded**
- [ ] Stripe Dashboard: session, payment, shipping amount match admin order

---

## 6. Customer accounts (M4)

**Routes:** `/account/register`, `/account/login`, `/account/forgot-password`, `/account`, `/account/orders`, `/account/favorites`, `/account/notifications`

### Auth

- [ ] Register new customer; confirm email if Cognito requires verification
- [ ] Login / logout
- [ ] Forgot password flow
- [ ] Protected routes redirect to login with `returnTo`

### Account home

- [ ] Profile info displays
- [ ] Links to **order history**, **notifications**, and **saved favorites** work

### Saved favorites (M17)

**Route:** `/account/favorites` (also **Account → Saved favorites**)

- [ ] **Signed out:** redirect to login with `returnTo=/account/favorites`; after login, lands on favorites page
- [ ] **Empty state:** copy + link to shop when no favorites saved
- [ ] **Add from PDP:** favorite a shop product → appears on list with image, title, price; card links to correct PDP (`/shop/:slug`)
- [ ] **Vault favorite:** with vault access, favorite a vault-only product → card links to `/vault/:slug` (not `/shop`)
- [ ] **Remove from list:** **Remove from favorites** removes row without error; PDP heart reflects unfavorited on revisit
- [ ] **Remove from PDP:** unfavorite on PDP → item disappears from list on refresh
- [ ] **Removed from store:** after admin deletes a favorited product, row moves to **Removed from the store** section (slug or id shown); remove clears favorite (see also §17b)
- [ ] **Pre-deploy rows** without `productSlug`: removed section may show product id — still removable

### Orders (customer)

- [ ] Paid orders appear for signed-in customer (owner scope)
- [ ] Order summary readable (date, total, status)
- [ ] Guest checkout orders: behavior documented (may not appear unless linked — verify current behavior)

### Notifications (M8a.2)

- [ ] Inbox lists active notifications for user
- [ ] Unread badge in account menu decrements when marked read
- [ ] **Read notifications** do not affect cart, promos, or abandon detection (inbox only)
- [ ] Vault-grant notification received when admin adds vault access
- [ ] **Thank-you promo (M6):** after paid order, in-system notification about next-order offer (if thank-you template configured)
- [ ] **Abandoned cart (M6c):** **Your cart is waiting** notification when grant issued — separate from cart discount UI

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

### Admin — issued grants (list + revoke)

- [ ] **`/admin/promos` → Issued grants** table loads: **Issued**, **Source**, **Offer**, **Recipient**, **Status**
- [ ] Grant links to live template name + discount; **Revoke** on open grants from list and template edit page
- [ ] Orphaned grants (template deleted) show **Deleted template** + short id — not “Unknown template”
- [ ] Cannot delete template while **open** grants reference it (revoke first)

### Admin — issue & revoke grants

- [ ] On template edit → **Issue grant** with **Customer A** email → success
- [ ] Issued grant appears in template grant list **and** main **Issued grants** table (status **open**)
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

**Scope:** One grant per user per abandon event; discount on **whole cart subtotal** (not per line). `cartSnapshotId` = user id.

**Setup**

- [ ] Active template: **Use for abandoned-cart**, **abandon after hours** = **1** (QA), fixed or percent discount
- [ ] Optional: run `npx tsx scripts/reset-promo-data.ts` for clean grants/snapshots/notifications

**Idle → grant**

- [ ] Signed in; add item(s); visit `/cart` once (catalog finishes → **“Verifying cart against catalog…”** may flash briefly)
- [ ] Wait ≥ **abandon after hours** without changing cart lines (qty, items, price)
- [ ] Return to `/cart` → **Welcome-back offer applied** banner; promo line on cart; admin **Issued grants** shows **Abandoned cart** / **Open**
- [ ] Account → Notifications: **Your cart is waiting** (marketing) — **notifications do not trigger cart sync**; stale old marketing rows are inbox-only

**Grant behavior**

- [ ] Discount applies to **full purchasable subtotal** (all lines in cart)
- [ ] Remove **one** line but leave others → grant **still applies** to remaining subtotal
- [ ] **Empty cart** (clear or remove last line, any page) → grant **revoked**; snapshot deleted
- [ ] Re-add same item immediately → **no** abandon discount until a **new** full idle period
- [ ] After new idle period + return → new grant (if template still active)

**Tie-break & checkout**

- [ ] **Favorite + abandoned** both eligible: **best savings** wins (§17); after abandon sync issues grant, abandoned grant preferred on that visit when configured
- [ ] Stripe checkout: discounted merchandise + separate shipping; admin order promo fields populated
- [ ] **M6d** email — skip (M13)

**Regression (2026-06 fixes)**

- [ ] First `/cart` visit after idle: no false **removed from store**; promo visible without leaving and re-entering cart
- [ ] CloudWatch: no `Variable 'lineItems' has an invalid value` on `syncCartSnapshot`

---

## 17b. Removed-from-catalog — cart & favorites (M17 / B1)

**Status:** **Production verified** (2026-06-11) — deployed; use for regression if cart/favorites code changes.

**Prep (regression):** Admin deletes or delists a product that Customer A already has in **cart** and/or **favorites**.

### Cart

- [ ] `/cart` shows removed line with **“removed from the store”** (or equivalent) styling; line is not treated as purchasable
- [ ] Banner or inline copy when checkout blocked; **Checkout** disabled until blocking issues cleared
- [ ] Subtotal / promo discount use **purchasable lines only** (removed line excluded)
- [ ] **Abandoned-cart sync** sends only purchasable lines (removed lines not in snapshot)
- [ ] Remove ghost line → checkout works for remaining items
- [ ] **Out of stock** (product still in catalog): flagged separately from removed; checkout blocked
- [ ] **Server guard:** tamper `productId` in devtools / retry checkout API → Stripe session rejected with clear error

### Favorites list — cross-check §6

Full happy-path and vault checks live in **§6 Saved favorites**. In this section, verify **removed-from-catalog** behavior only:

- [ ] After admin **deletes** a favorited product: appears under **Removed from the store** on `/account/favorites`; remove clears favorite
- [ ] Favorites without stored `productSlug` (pre-deploy): removed section may show product id — still removable

### Favorites / PDP

- [ ] Favorited product still in catalog: heart works as before (§2)
- [ ] After admin **deletes** product: visiting old `/shop/:slug` shows **stale favorite** notice (if user had favorited **after** deploy with slug stored) with option to clear favorite
- [ ] No new **favorite** promo issued for removed product
- [ ] Favorites without stored `productSlug` (pre-deploy rows): stale notice may not appear on PDP — acceptable; re-favorite after deploy for full path; list page still shows removed row when product missing from catalog

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
| **M11** | Customer order status + shipping tracking | **Next** — paid/received/processing/shipped; §19 when built |
| **M19** | Catalog sales & bundles (list/compare pricing) | After M11 |
| **M18** | Cart price-change in-system notifications | After M19 + M6c |
| **M9a** | Initial UX polish (e.g. add-to-cart toast/feedback) | Scroll-to-top shipped §18; rest planned |
| **M6d** | Abandoned-cart **email** | In-system M6c only today |
| **M10** | Admin–customer chat | — |
| **M11** / **M11b** / **M14** | Fabrication sub-stages (M11a), Pi bridge, ForgeLink | Deferred after M11 |
| **M15b** | Cart shipping estimate preview; Stripe ETA UI | — |
| **M16** | Returns, refunds, exchanges | Email-only policy today |
| **M12** | Notification preferences | — |
| **M13** | Marketing pixels / UTM on orders | — |

**Production-verified sections (regression optional):** §6 (favorites), §17 (M6b/c), §17b (M17), §18 (go-live polish).

Add test sections here when each **new** milestone ships.

---

## §19 — Customer order status + shipping (M11)

**Status:** Implemented in repo — deploy backend (`fulfillmentStatus`, `updateOrderFulfillment` mutation) + frontend; then run checklist.

### Data & admin

- [ ] Paid order gets `fulfillmentStatus = paid` (webhook + mock path)
- [ ] Admin can advance: paid → received → processing → shipped (forward only)
- [ ] **Shipped** requires carrier + tracking number; `shippedAt` set
- [ ] Payment `status` separate from fulfillment (`pending` / `paid` / `failed` / `cancelled` / `refunded`)

### Customer UI

- [ ] `/account/orders/:orderId` — timeline (4 stages), line items, ship-to, tracking when shipped
- [ ] Order history list shows fulfillment label + links to detail
- [ ] Notifications (`kind: order`) on each transition; shipped includes tracking link

### Email (when SES production ready)

- [ ] Customer receives confirmation email on **paid** (optional but recommended)
- [ ] Customer receives **shipped** email with carrier + tracking to `Order.email`

### Regression

- [ ] Thank-you promo (M6) still fires separately (`kind: marketing`)
- [ ] Support new-order email (admin) unaffected

---

## §18 — Go-live polish (2026-06-13)

**Status:** **Signed off** 2026-06-11 — deployed to production; monitor for bugs. Checklists below retained for regression.

### Order notifications

- [x] Place **live Stripe** test order → email arrives at support inbox (`SUPPORT_INBOX_EMAIL`) — **verified 2026-06-11**
- [x] Admin **Dashboard**: “new orders” banner + stat + **Orders** nav badge — **signed off 2026-06-11**
- [x] Open order detail → badge clears (auto-ack) OR use **Mark as seen** on dashboard — **signed off 2026-06-11**
- [x] Mock checkout (local only): `notifyOrderPlaced` path — **signed off 2026-06-11**

### Storefront & legal

- [x] Footer: **Privacy Policy**, **Forge Terms**, **Emperium Forgeworks LLC**, no **Admin** link — **signed off 2026-06-11**
- [x] `/about` Forge Story stats — **signed off 2026-06-11**
- [x] Scroll: back preserves position; forward scrolls to top — **signed off 2026-06-11**
- [x] Shop: no testimonial block; featured carousel — **signed off 2026-06-11**

### Admin catalog & shipping

- [x] Category filters, drag sort, featured flag, product edit layout, shipping profiles — **signed off 2026-06-11**

### Admin dashboard

- [x] GA4 start/end dates persist in session — **signed off 2026-06-11**

---

## Run log

| Date | Tester | Environment | Scope | Pass/Fail | Notes |
|------|--------|-------------|-------|-----------|-------|
| 2026-06-11 | Patrick | prod | §18 order email | Pass | Live Stripe order → SES email to support inbox |
| 2026-06-11 | Patrick | prod | M6b, M6c, M17, §18 | Sign-off | Deployed; monitor for bugs |

---

## Updating this doc

When a milestone ships, add or expand the matching section and remove it from **Not yet built**. Keep edge-case bullets aligned with [cursor-roadmap.md](../project-plans/cursor-roadmap.md) acceptance criteria.
