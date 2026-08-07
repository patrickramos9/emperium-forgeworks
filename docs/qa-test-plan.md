# QA test plan — Emperium Forgeworks Store

Feature-by-feature manual QA checklist for production (and optionally local/sandbox). Use this after deploys, before marking a milestone verified, or for periodic regression.

**Related:** [cursor-roadmap.md](../project-plans/cursor-roadmap.md) (what’s shipped vs planned) · [stripe-setup.md](./stripe-setup.md) (payments & promo checkout behavior)

**Roadmap last synced:** 2026-08-01

---

## Feature coverage (shipped → section)

| Milestone | What | QA section |
|-----------|------|------------|
| Layout / nav | Header, footer, announcements | §1 |
| M2, M7a | Shop + PDP | §2 |
| M15 | Shipping display + profiles | §3, §10 |
| M3a, M6, M6c, M17 | Cart + promos | §4, §17, §17b |
| M3b | Checkout + Stripe | §5 |
| M4, M6b, M8a.2, M17 | Accounts, favorites, notifications | §6 |
| M8b | Reviews | §7 |
| M2, M3b, M15, M6 | Admin orders | §8 |
| M2 | Admin products (+ `activeCartCount`) | §9 |
| M8a.1 | Announcements | §11 |
| M8a.2 | Admin notifications | §12 |
| M7b | Vault | §13 |
| M8c, M8d | Sculptors + partner | §14 |
| M5 | GA4 dashboard | §15 |
| Legal / static | About, policies | §16, §18a |
| M6 core/b/c + new-account | Promo templates & grants | §17 |
| M17 | Removed-from-catalog | §17b |
| Go-live polish | Order email, catalog, scroll | §18a |
| **M9a** | UX polish (toasts, feedback) | §20 |
| **M11** | Order status + shipping | §19 |
| **M16** | Returns, refunds & exchanges | §21 |
| **M13a** | Public catalog images + Merchant feed | §24 |

---

## Testing now

**Next milestone:** **M19** — Catalog sales & bundles.

Pre-launch sign-off closed 2026-06-11. **M11** signed off 2026-06-23 (§19). **M13a** signed off 2026-07-07 (§24). Run smoke after deploys; full §6–§20 checklists for regression when touching related code.

| When | What to run |
|------|-------------|
| **After any deploy** | Quick smoke (§5 checkout, §8 admin order, home/shop load) |
| **Promo/cart/favorites change** | §4, §6, §17, §17b |
| **UX / toast / account forms change** | §2, §4, §6, §20 |
| **Catalog/admin product change** | §2 PDP, §17b, §9, §18a admin catalog |
| **New milestone** | Matching section below + remove from **Not yet built** |

**Production-verified (regression optional):** M3b (incl. cancel/refund sync), M6 (core + **M6b** + **M6c** + **new-account**), M7b, M8b/c/d, M15, **M17**, **M11** (§19), go-live polish §18a, order notification email, **M9a** (§20), **M16** (§21), **M22** (§22), **M21** / **M21c** (§23), **M13a** (§24).

**Do not test yet:** M19, M18, M6d marketing email, M10, M12, **M13b**, **M9** (SEO/gallery — not M9a).

### Deploy prerequisites (M6b/c + M17 + new-account) — signed off 2026-06-11; new-account signed off 2026-06-20

- [x] Amplify **backend** deployed: `Favorite`, `CartSnapshot`, `toggleProductFavorite`, `syncCartSnapshot`, `PromoTemplate` flags, `Favorite.productSlug`
- [x] Amplify **backend** redeployed for **new-account promo**: `PromoGrant.source` includes `new_account`, `PromoTemplate.useForNewAccount`, `issueNewAccountWelcomeGrant` mutation + Lambda
- [x] Amplify **frontend** deployed against current `amplify_outputs.json`
- [x] Promo templates configured per source (admin, thank-you, favorite, abandoned cart, new-account)
- [x] Promo template with **Use for new-account welcome grants** (only one active) — **New Account** template active
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
- [ ] Open a product PDP; add to cart — **toast** confirms add (M9a); cart icon count bumps
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
- [ ] **Add to cart** disabled when out of stock or variants required but none selected — helper text explains why (M9a)
- [ ] **Add to cart (M9a):** success **toast** with product name + price; optional **View cart** action; page does not navigate away
- [ ] Specs block (material, sculptor, status) when present
- [ ] Description and lore sections render
- [ ] “You might also like” links work
- [ ] Breadcrumb: Shop → category → product

### Favorites (M6b) — PDP

- [ ] **Signed out:** “Save to favorites” prompts sign-in (no API error)
- [ ] **Signed in:** **Save to favorites** / heart toggles; state persists after refresh
- [ ] First favorite on a product (with favorite template active): in-system **notification** + open **favorite** grant (if not already open for that product)
- [ ] **Save / unsave toasts (M9a):** brief toast on favorite toggle (aligned with add-to-cart pattern)
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

- [ ] Empty cart message + link to shop (styled empty state — M9a)
- [ ] **Catalog load error:** banner when shop catalog fails; cart still usable where possible (M9a)
- [ ] Line items: title, variant label, qty, line total
- [ ] Quantity +/- respects max; remove line works
- [ ] Subtotal correct
- [ ] **Signed out:** “Sign in for promotional offers” (or similar); no promo line applied
- [ ] **Signed in, no grants:** subtotal only; no promo deduction line
- [ ] **Signed in, active grant:** promo line shows label, **expiration date**, and −discount; **total before shipping** = subtotal − discount
- [ ] **Line thumbnails** resolve from catalog/S3 (not raw `localStorage` paths); refresh `/cart` still shows images
- [ ] **Mock checkout banner** visible when `VITE_APP_ENV=local`
- [ ] **Out of stock** line flagged; checkout blocked until fixed or removed
- [ ] **Unavailable lines banner (M17/M9a):** when product deleted or `inStock` unchecked, banner shows **removed from store** or **out of stock** (not stuck on “Verifying…”)
- [ ] **Removed from catalog** line flagged (§17b); subtotal/promo exclude non-purchasable lines
- [ ] **Catalog loading:** brief **“Verifying cart against catalog…”** — no false **removed from store** while catalog enriches (§17 M6c regression)
- [ ] **Price changed** since add-to-cart: flagged; checkout blocked until user refreshes from PDP (re-add)
- [ ] Clear cart works
- [ ] **Checkout redirect (M9a):** click Checkout → button shows **Forging…**; **Redirecting to secure checkout…** banner; Clear disabled until redirect or error
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
- [x] Cancel at Stripe → `/checkout/cancel?session=…`; pending order becomes **Cancelled** (allow ~10s; refresh admin)
- [ ] **Cancel page (M9a):** **Updating order status…** banner while syncing; error banner if sync fails (non-blocking)
- [x] Expire open session in Stripe Dashboard (or wait for expiry) → webhook sets pending order **Cancelled**
- [ ] Full refund in Stripe Dashboard on paid order → webhook sets order **Refunded**
- [ ] Stripe Dashboard: session, payment, shipping amount match admin order

---

## 6. Customer accounts (M4)

**Routes:** `/account/register`, `/account/login`, `/account/forgot-password`, `/account`, `/account/orders`, `/account/favorites`, `/account/notifications`

### Auth

- [ ] Register new customer; confirm email if Cognito requires verification
- [x] **Register confirm (M9a + new-account):** after verify + sign-in → welcome **toast** with link to notifications; account menu notification badge updates (~1–2s)
- [x] **New-account grant (§17):** with `useForNewAccount` template active, confirm new email → **Welcome to the forge** notification + open `new_account` grant (once per user)
- [ ] Login / logout
- [ ] **Form feedback (M9a):** login/register/notifications errors show styled **PageFeedback** banner (not bare red text only)
- [ ] Forgot password flow — success message after reset uses consistent banner styling
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
- [ ] **Badge refresh:** after favorite grant, cart abandon grant, mark-read, or register confirm — badge updates without full page reload where implemented
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
- [ ] **Active cart count:** product cards show **In N carts** (or similar) for shoppers with items in server snapshot — updates after cart sync (signed-in only until **M6e** guest carts)
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
- [ ] **`us_free_international_flat` (M15):** profile kind available in admin; free US shipping + flat international rate applies at checkout for assigned products
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

**Routes:** `/about`, `/shipping-returns`, `/privacy-policy`, `/forge-terms`

- [ ] About page content and layout; Forge Story stats load
- [ ] Shipping & returns policy readable; contact email link works
- [ ] **Privacy policy** (`/privacy-policy`) loads from footer; last-updated date reasonable
- [ ] **Forge terms** (`/forge-terms`) loads from footer
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
- [ ] **Use for new-account welcome grants** checkbox: only one active template; enabling clears flag on others
- [ ] **Deactivate** template: still listed; marked inactive
- [ ] Delete template (confirm)

### Admin — issued grants (list + revoke)

- [ ] **`/admin/promos` → Issued grants** table loads: **Issued**, **Source** (incl. **New account**), **Offer**, **Recipient**, **Status**
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

### M6 — New-account welcome grants

**Production verified:** 2026-06-20 (register → verify → sign-in → welcome notification + open grant).

**Requires:** Backend with `useForNewAccount`, `new_account` source, `issueNewAccountWelcomeGrant` mutation (frontend calls after verify/sign-in).

**Setup**

- [x] One active template with **Use for new-account welcome grants** (only one system-wide)
- [x] Fresh test email never registered before (or delete Cognito user + reset grants via `reset-promo-data.ts`)

**Issuance**

- [x] Register → confirm email → sign in: **Welcome to the forge** in Account → Notifications
- [x] Admin **Issued grants**: source **New account**, status **open**, correct template/discount
- [x] Grant applies at cart/checkout like other whole-cart grants (best-savings tie-break vs favorite/abandon if multiple)
- [x] **Once per lifetime:** same user cannot receive a second `new_account` grant (re-register same email blocked by Cognito; admin-created users without email confirm do not receive grant)

**Template rules**

- [ ] Deactivate new-account template → **no new** grants on future sign-ups; existing open grants still redeem
- [ ] Switch active new-account template (exclusive flag) → only the newly flagged template used for future sign-ups

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

## §21 — Returns, refunds & exchanges (M16)

**Status:** **Signed off** 2026-06-24 — production verified (returns, admin refunds, pre-ship cancel, refund status UI).

### Customer pre-ship cancellation (M16d)

- [ ] Paid order not shipped → **Cancel order** on order detail → confirm → full refund in Stripe
- [ ] Order shows **Cancelled**; refund ledger entry `customer cancellation`
- [ ] After admin marks **Shipped** → cancel section hidden; return link available when in window
- [ ] `/shipping-returns` documents pre-ship cancellation policy

### Admin refunds (M16a)

- [ ] Paid Stripe order → **Admin → Orders → detail** → Refunds panel shows PaymentIntent, refundable balance
- [ ] Partial refund (e.g. shipping only) → order stays **Paid**, `refundedCents` updates, ledger entry appears
- [ ] Full refund → order **Refunded**; refundable balance $0
- [ ] Mock checkout order → refund panel shows manual-status message (no Stripe button)

### Customer return requests (M16b)

- [ ] Paid + shipped order within 30-day window → **Request a return** on order detail
- [ ] Submit return with reason + line items → status **Requested** on order detail
- [ ] Second request blocked while one is open
- [ ] Ineligible order (pending / outside window) → no self-service link; contact copy only

### Admin returns (M16b/c)

- [ ] **Admin → Returns** lists open requests; links to order detail
- [ ] Approve return → customer sees approved status + ship instructions on `/account/orders/:id/return`
- [ ] Mark **Received** → **Closed**; exchange reason shows case-by-case note on admin panel
- [ ] After return received, issue refund from order detail Refunds panel

---

## §22 — Stripe Tax (M22)

**Status:** **Signed off** 2026-06-24 — production verified (destination-based tax via Stripe Tax on Checkout).

**Troubleshooting $0 tax on Checkout**

1. **Standalone Tax API is not required** — Checkout with `automatic_tax` calculates tax internally. The [Tax Calculations API](https://docs.stripe.com/tax/standalone-tax-api) is for custom PaymentIntents / off-Stripe flows only.
2. Tax stays **$0 until the customer enters a complete shipping address** — the “determined by shipping information” tooltip is normal until then.
3. **Live registration** must exist for the ship-to state (Stripe → Tax → Registrations, live mode).
4. Product tax code must be **tangible goods** (`txcd_99999999`), not services — misclassified products can show $0 tax.
5. After payment, open the transaction → **Tax calculation** for Stripe’s reason code (`not_collecting`, `standard_rated`, etc.).

### Checkout & orders

- [ ] Cart shows “before shipping & tax” and checkout copy mentions tax at checkout
- [ ] Stripe **test** Checkout with ship-to in a **registered** state (e.g. MA) → tax line on Stripe Checkout
- [ ] Completed order: customer + admin order detail show **Sales tax** row and total includes tax
- [ ] Support order notification email includes tax when `taxCents > 0`
- [ ] Ship-to in **unregistered** state → no tax on Checkout (until registration added in Stripe)
- [ ] Full refund (M16) still refunds full PaymentIntent amount (tax included)

**Stripe test addresses:** [docs.stripe.com/tax/testing](https://docs.stripe.com/tax/testing)

---

## §23 — Printing as a Service (M21 / M21c)

**Status:** **M21** shipped 2026-06-24 (pay-first). **M21c** quote-first — **production verified** 2026-08-01.

### Setup

- [x] Admin → **Print service** → save config, set **Active**
- [x] Catalog product slug `printing-as-a-service` with shipping profile + weight (oz) — `npx tsx scripts/seed-print-service-product.ts` if missing

### Customer flow (M21c — current)

- [x] Home **Printing as a Service** card → `/print` (when active)
- [x] Sign in; policy checkbox; resin / color / notes / `.stl` or `.zip` upload (**no size price**)
- [x] Submit → Account → Print requests
- [x] After admin quote → notification + **Review and pay quote** link → Stripe → paid order

### Admin flow (M21c)

- [x] Admin → **Print requests** (badge when `submitted` / `in_review`)
- [x] Download file; assign figure lines by size tier; **Save quote** or **Decline**
- [x] Order detail after pay → **Download STL/ZIP**; mark **Shipped** → file purged

### Legacy (do not use)

- Pay-first size-tier → cart → checkout for prints is **disabled** (server rejects print cart lines)

---

## §24 — Public catalog images + Merchant feed (M13a)

**Status:** **Production verified** 2026-07-07 — backend deploy with public `products/*` policy; storefront images + feed export.

### Storefront images

- [ ] `/shop` — product cards load images (signed out, incognito)
- [ ] PDP — gallery images load without login
- [ ] Image URL is stable S3 path (`…/products/{slug}/…`), not presigned query string

### Merchant feed

- [ ] `npm run export:merchant-feed` → `docs/merchant-center-feed.csv` (35 public products)
- [ ] Open an `image_link` from CSV in incognito — image loads
- [ ] Upload CSV to Merchant Center (or use for Google Ads product images)

---

## Not yet built — skip until milestone ships

| Milestone | Feature | Notes |
|-----------|---------|--------|
| **M19** | Catalog sales & bundles (list/compare pricing) | **Next** |
| **M18** | Cart price-change in-system notifications | After M19 + M6c |
| **M9** | Polish & growth (gallery, SEO, structured data) | **Not M9a** — UX polish shipped §20 |
| **M6d** | Abandoned-cart **email** | In-system M6c only today |
| **M8a.3** | Inbox vs notification campaigns split | — |
| **M10** | Admin–customer chat | — |
| **M11a** / **M11b** / **M14** | Fabrication sub-stages, Pi bridge, ForgeLink | Deferred |
| **M15b** | Cart shipping estimate preview; Stripe ETA UI | — |
| **M12** | Notification preferences | Depends on M8a.3 |
| **M13b** | Merchant API sync, marketing pixels, UTM on orders | M13a done §24 |
| **M6e** (remainder) | Guest carts / favorites / print requests + real merge | Foundation verified — see **§25** |

**Production-verified sections (regression optional):** §6 (favorites), §17 (M6b/c + new-account), §17b (M17), §18a (go-live polish), §19 (M11), §20 (M9a), **§21 (M16)**, **§22 (M22)**, **§23 (M21/M21c)**, **§24 (M13a)**, **§25 (M6e foundation)**.

Add test sections here when each **new** milestone ships.

---

## §25 — Guest identity foundation (M6e)

**Status:** **Production verified** 2026-08-06 — cookie + HMAC token + merge stub. Guest cart/favorite/print ownership still open.

### Bootstrap (signed out)

- [x] Network: Function URL (`lambda-url…`) returns **200** with `guestId` + `guestToken`
- [x] Local Storage has `efw_guest_id` and `efw_guest_token`
- [x] Reload keeps the same guest id (session reuse)

### Sign-in merge

- [x] After login/register, `mergeGuestIdentity` succeeds (counts may be `0` until guest rows exist)
- [ ] Tampered `efw_guest_token` → merge fails without blocking login (optional regression)

---

## §20 — Initial UX polish (M9a)

**Status:** **Shipped** 2026-06-16 — deploy frontend; regression when touching cart, PDP, checkout, or account forms.

### Global

- [ ] Toast stack appears top/bottom per design; auto-dismisses; `aria-live` announces to screen readers
- [ ] Multiple toasts queue without overlap bugs
- [ ] Toast **action** link (e.g. View cart, Notifications) navigates correctly

### Add to cart + cart badge

- [ ] PDP add-to-cart → toast with product name + price within ~1s; user stays on PDP
- [ ] Header cart icon count **bumps** or animates on add (in addition to numeric update)
- [ ] Rapid double add → sensible qty + single or stacked toast behavior (no crash)

### Favorites

- [ ] Save / unsave toast matches add-to-cart tone and duration

### Cart page

- [ ] Empty state: styled panel + CTA to shop
- [ ] Catalog verifying: **Verifying cart against catalog…** info banner
- [ ] Catalog error: error banner; page not blank
- [ ] Unavailable lines: unified banner when any line removed or out of stock
- [ ] Checkout errors: styled error banner; clears when blocking issues resolved
- [ ] Checkout in progress: **Forging…** button + **Redirecting to secure checkout…**; Clear disabled

### Checkout cancel

- [ ] `/checkout/cancel?session=…` — sync status + error banners (§5)

### Account forms

- [ ] Login error → PageFeedback error banner
- [ ] Password reset success query param → PageFeedback success on login page
- [ ] Register sign-up / confirm errors → PageFeedback
- [ ] Register confirm success → welcome toast (§6)
- [ ] Notifications load error → PageFeedback on inbox page

### Regression (M9a must not break)

- [ ] Variant picker + qty rules unchanged
- [ ] Promo auto-apply + abandon sync unchanged (§17)
- [ ] Removed-from-catalog behavior unchanged (§17b)
- [ ] Browser back/forward scroll behavior unchanged (§18a)

---

## §19 — Customer order status + shipping (M11)

**Status:** **Signed off** 2026-06-23 — deployed; regression when touching fulfillment, checkout, or order UI.

### Data & admin

- [x] Paid order gets `fulfillmentStatus = paid` (webhook + mock path)
- [x] Admin can advance: paid → received → processing → shipped (forward only)
- [x] **Shipped** requires carrier + tracking number; `shippedAt` set
- [x] Payment `status` separate from fulfillment (`pending` / `paid` / `failed` / `cancelled` / `refunded`)
- [x] Admin orders list shows **fulfillment** status (not payment-only)

### Customer UI

- [x] `/account/orders/:orderId` — timeline (4 stages), line items, ship-to, tracking when shipped
- [x] Order history list shows fulfillment label + links to detail
- [x] Notifications (`kind: order`) on each transition; shipped includes tracking link
- [x] Line items show variant labels; product links resolve shop vs vault

### Email (when SES production ready)

- [ ] Customer receives confirmation email on **paid** (optional — SES production pending)
- [ ] Customer receives **shipped** email with carrier + tracking to `Order.email`

### Regression

- [x] Thank-you promo (M6) still fires separately (`kind: marketing`)
- [x] Support new-order email (admin) unaffected
- [x] Checkout does not leave orphan `pending_*` orders on retry

---

## §18a — Go-live polish (2026-06-13)

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
| 2026-06-24 | Patrick | prod | M22 §22 | Sign-off | Stripe Tax on Checkout; tax on order detail |
| 2026-06-24 | Patrick | prod | M16 §21 | Sign-off | Returns, admin refunds, pre-ship cancel, Payment/Fulfillment columns |
| 2026-06-23 | Patrick | prod | M11 §19 | Sign-off | Fulfillment timeline, notifications, order line items, checkout hardening |
| 2026-06-11 | Patrick | prod | §18 order email | Pass | Live Stripe order → SES email to support inbox |
| 2026-06-11 | Patrick | prod | M6b, M6c, M17, §18 | Sign-off | Deployed; monitor for bugs |

---

## Updating this doc

When a milestone ships, add or expand the matching section and remove it from **Not yet built**. Keep edge-case bullets aligned with [cursor-roadmap.md](../project-plans/cursor-roadmap.md) acceptance criteria.
