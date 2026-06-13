# cursor-roadmap.md — Emperium Forgeworks

Author: Patrick + Copilot  
Mode: **Balanced** (improve but don’t rewrite)  
Primary goal: **Ship features fast, then refactor incrementally.**

This document is the **authoritative spec for AI-driven development (Cursor)** on the Emperium Forgeworks storefront, admin portal, and AWS backend.

Cursor should treat this file as the **source of truth** for:
- What to build
- Where to put code
- How to wire it into the existing architecture
- What is in scope vs out of scope for each milestone

**Reference docs (how the system works today):** `project-plans/reference/` — not directives.

**Historical plans:** `project-plans/archive/` — Cursor should ignore (see `.cursorignore`).

---

## Current status (update when milestones ship)

**Last updated:** 2026-06-11

| Item | State |
|------|--------|
| **Phase** | **Core commerce live** — **M11 customer order status** is next (critical) |
| **Next** | **M11** — paid → received → processing → shipped (+ tracking); customer notifications + optional SES email |
| **Blocked** | _(none)_ — **SES production access** in progress (enables customer transactional email; in-app notifications work without it) |
| **Recently verified** | **M6b** · **M6c** · **M17** (B1) · **Go-live polish** · **Order notification email** to support (2026-06-11) |
| **In progress** | **M11** — customer order status (in repo; **backend redeploy required**) · **AWS SES** production setup (ops) |
| **Payments today** | **Production:** Stripe live when `VITE_APP_ENV=deployment` (Amplify `main`). Mock only for local `npm run dev`. |
| **QA** | [docs/qa-test-plan.md](../docs/qa-test-plan.md) — smoke/regression on demand; §6–§18 retained as checklists |
| **Test hygiene** | `scripts/reset-promo-data.ts` — grants, templates, marketing notifications, cart snapshots |

**Recommended build order:**  
M8 (done) → M3b (done) → M15 (done) → M6 + **M6b/c** (done) → **M17** (done) → **M11** (customer order status + shipping) → **M19** → **M18** → **M9a** → **M16** → M10 → M12 → **M13** (+ **M6d**) → **M9** → **M11a** (fabrication sub-stages) → M11b (Pi) → M14

**Deferred (ops / hardware):** **M11a** (optional print micro-stages), **M11b** (Pi bridge), **M14** (ForgeLink™).

When a milestone ships, update this table and the **Shipped** list in §3 below.

---

## 0. Cursor operating rules

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

---

## 1. High-level architecture (for Cursor)

### 1.1 System layers

- **Frontend SPA (React + Vite + Tailwind)**
  - Storefront (`/`, `/shop`, `/shop/:slug`, `/vault`, `/about`, `/reviews`)
  - Cart + checkout (`/cart`, `/checkout/success`)
  - Customer account (`/account/*`)
  - Admin portal (`/admin/*`)
  - Partner portal (`/partner/*`) — M8d sculptor self-service

- **Backend (Amplify Gen 2)**
  - Cognito User Pool + Identity Pool
  - AppSync GraphQL (Amplify Data)
  - DynamoDB tables (generated from models)
  - S3 `productImages` bucket
  - Lambda functions for:
    - GA4 dashboard
    - Customer listing/lookup
    - Post-confirmation group assignment
    - Stripe Checkout + webhook (M3b)
    - Future: Pi bridge endpoints (if needed)

- **Integrations**
  - GA4 (gtag + Data API)
  - Stripe (live — M3b verified)
  - Raspberry Pi bridge (planned, external agent calling API)

### 1.2 Data access patterns

Use the existing helpers in `src/lib/amplifyDataClient.ts`:

- `getGuestDataClient()` — for public reads and guest operations.
- `getCustomerDataClient()` — for authenticated customer operations.
- `getAdminDataClient()` — for admin-only operations.

**Rule for Cursor:**  
When adding new data flows, **always** use the appropriate client helper and follow the existing pattern in `services/`.

---

## 2. Existing data models (reference)

Cursor must treat [`project-plans/reference/data-models.md`](./reference/data-models.md) (not `archive/`) as the canonical description of current models:

- `Product` (includes `shippingProfileId`, `weightOz`, `shippingDisplay` snapshot for PDP)
- `Order`
- `ShippingProfile` (guest/authenticated read; admin CRUD)
- `Announcement`
- `Notification`
- `NotificationRead`
- `Review`
- `VaultAccess`
- `Sculptor`

When adding new models (e.g., `Conversation`, `Message`, `PrintJob`, `NotificationPreference`), follow the same style:
- Define in `amplify/data/resource.ts`.
- Use appropriate auth rules (guest read, owner read, admin CRUD, etc.).
- Use `userId` for owner scoping where relevant.

---

## 3. Milestones overview

The roadmap is milestone-based. Each milestone should be **independently shippable**.

### Shipped (do not change unless explicitly asked)

- **M1** — Public preview
- **M2** — Backend + admin
- **M3a** — Cart UX
- **M4** — Customer accounts
- **M5** — Admin portal + stats (GA4 dashboard)
- **M7a** — Storefront cleanup
- **M7b** — Hidden Vault (permission-based `VaultAccess`)
- **M8a.1** — Announcements
- **M8a.2** — Notifications (inbox, badge, targeting, vault-grant trigger)
- **M8b** — Reviews (“Voices From The Void”, admin moderation) — **production verified**
- **M8c** — Sculptors (admin CRUD, `/sculptors/:slug`, portfolio carousel, rich text) — **production verified**
- **M8d** — Sculptor partner portal (`/partner/sculptor`, admin-granted `editorUserId`) — **production verified**
- **M3b** — Live Stripe Checkout + webhook (`Order` paid, ship-to address, email/phone) — **production verified**
- **M15** — Shipping profiles, product assignment, Stripe checkout shipping, order totals, PDP shipping (`shippingDisplay` + live fallback), ready-to-ship on profiles — **production verified**
- **M6 core** — Promo templates, grants, auto-apply cart/checkout, thank-you on paid order, admin tools — **production verified** (2026-06-02)
- **M6c** — Abandoned-cart snapshot, idle grant, revoke on empty cart, issued-grants admin table — **production verified** (2026-06-11)
- **M6b** — Favorite grants + PDP UI + favorites list — **production verified** (2026-06-11)
- **M17** — Removed-from-catalog UX (cart + favorites) — fixes **B1** — **production verified** (2026-06-11)
- **Go-live polish (2026-06-13)** — see **§3.1** below — **production verified** (2026-06-11; monitor for bugs)

### 3.1 Go-live polish batch (2026-06-13)

Shipped in repo during pre-launch polish. **Signed off** 2026-06-11 (deployed; monitor for bugs). Regression checklists in [docs/qa-test-plan.md](../docs/qa-test-plan.md) §18.

| Area | What shipped |
|------|----------------|
| **Order notifications** | SES email on paid order (Stripe webhook + `notifyOrderPlaced` for mock checkout) — **email production verified** (2026-06-11); `Order.supportNotifiedAt`, `Order.adminAcknowledgedAt`; admin dashboard banner + “New orders” stat + Orders nav badge; auto-ack on order detail + “Mark as seen”; `getStorefrontStats` query for public About-page sales count |
| **Admin catalog** | Editable **category filters** (`CatalogSettings`, shared shop + admin); **drag-and-drop** product sort on admin grid (numeric sort field removed from edit); **featured products** carousel on home (max 4, 3s interval, compact overlay text); **product description template** in DB (one-time localStorage migration) |
| **Admin orders** | Customer email/name on list + detail (not raw Cognito id); pending-order ship-to copy fix |
| **About page** | Forge Story stats: **Quality Index** = avg approved review rating; **Successful Forgings** = paid order count |
| **Storefront UX** | Scroll to top on forward navigation (preserve browser back/forward); removed shop **High Fidelity Prints** testimonial box; footer **Emperium Forgeworks LLC**; removed public **Admin** footer link |
| **Legal** | `/privacy-policy`, `/forge-terms` (footer linked); `/shipping-returns` unchanged |
| **Admin product edit** | Subtitle under title; price above variations |
| **Shipping profiles** | Removed **Store default** checkbox and product dropdown empty option; **first profile by sort order** is the implicit default (checkout + PDP fallback) |
| **Admin dashboard** | GA4 traffic **start/end dates** persist in `sessionStorage` for the browser session |
| **Build / deploy** | Lambda `package-lock.json` sync (`stripe-webhook`, `notify-order-placed`, `get-storefront-stats`); `@aws-sdk/client-ses` on Amplify backend package for shared `order-shared/notifySupport.ts` type-check |

**Ops:** SES identity verified; live Stripe order → support inbox email **confirmed** (2026-06-11). Production storefront uses live Stripe on Amplify `main` (`VITE_APP_ENV=deployment`).

### Blocked / waiting

_(none)_

### In progress

_(none — monitor production; fix bugs ad hoc)_

### Resolved bugs

| ID | Issue | Resolution |
|----|--------|------------|
| **B1** | Admin deletes/delists product while in customer cart or favorites | **M17** deployed 2026-06-11 — monitor for edge cases |

### Planned (not started)

**Next (critical — shopper-facing)**

- **M11** — **Customer order status + shipping** — paid → received → processing → shipped; tracking on ship; in-app `order` notifications; optional customer email when SES production ready (see §4)

**Core + polish (after M11)**

- **M19** — Catalog **sales** on products and **bundles** (storefront pricing; separate from M6 account promos)
- **M18** — **Cart price-change** in-system notifications (sale or list price up/down for items in cart)
- **M9a** — **Initial UX polish** (micro-interactions, cart feedback, consistency — see §4)

**Later**

- **M16** — Returns, refunds & exchanges
- **M10** — Admin–customer chat
- **M12** — Notification preferences
- **M13** — Marketing & growth engine (+ **M6d** abandoned-cart email)
- **M9** — Polish & growth (gallery, SEO, performance)

**Deferred — fabrication detail / hardware**

- **M11a** — Optional fabrication sub-stages (queued, printing, wash, …) — admin-only detail inside **processing**; not required for customer-facing four stages
- **M11b** — Raspberry Pi SDCP bridge (optional)
- **M14** — ForgeLink™ hardware MVP

§4 below has implementation specs for milestones that are not yet shipped.

---

## 4. Milestones — implementation specs for Cursor

### M3b — Live payments (Stripe + Google Pay)

**Status:** **Production verified** (2026-05-31) — live Checkout, live-mode webhook, orders auto-`paid`, fulfillment fields on `Order`.

**Goal:** Replace mock checkout with real Stripe payments while preserving the `PaymentProvider` abstraction.

**Scope:**
- Implement `StripePaymentProvider` in `packages/shared/`.
- Wire `checkoutService` to use Stripe when `VITE_APP_ENV=deployment`.
- Add Stripe Checkout session creation + redirect.
- Add webhook Lambda to update `Order.status`.

**Backend:**
- Add Stripe secrets to Amplify backend env (documented, not hardcoded).
- Add Lambda for Stripe webhooks:
  - Verify signature.
  - On successful payment, set `Order.status = "paid"` and `paymentProvider = "stripe"`.
  - Use `externalSessionId` to correlate.

**Frontend:**
- `checkoutService.ts`:
  - Use `StripePaymentProvider` when env is `deployment`.
  - Keep `MockPaymentProvider` for `local`.

**Auth & data:**
- Do not store card data.
- Keep `Order` minimal as currently designed.

**Interim (pre-M15):** Address + phone collection on Stripe Checkout and basic fulfillment fields on `Order` may ship under M3b. **Paid shipping, profile management, and order shipping totals** belong to **M15 — Shipping** (do not hardcode production rates in the Lambda long-term).

**Cursor rules:**
- Do not change `PaymentProvider` interface shape.
- Do not change existing mock behavior.
- Only extend where needed.

---

### M6 — Promo codes (templates + grants)

**Status:** **Production verified** (2026-06-02 core; **M6b** + **M6c** 2026-06-11). **M6d** (abandoned-cart email) deferred to M13.

**2026-06-11 deploy fixes (M6c):** `syncCartSnapshot` stores `lineItems` as JSON string; empty-cart sync revokes open `abandoned_cart` grants; cart page waits for catalog verify before false “removed” errors; `useEmptyCartSnapshotSync` in `CartProvider`; admin **Issued grants** table + deleted-template labels.

**Goal:** Etsy-style **issued offers** tied to accounts: auto-apply the single best eligible grant at checkout, persist on `Order`, separate from **M15 shipping**.

#### Core rules (business)

1. **One grant per order** — no stacking. If multiple grants are eligible, apply the one with the **greatest savings** (compare actual cents off **merchandise subtotal**, whether percent or fixed).
2. **Tie-break** — if savings are equal, **soonest expiry** wins.
3. **Discount base** — merchandise **subtotal before shipping**. Shipping profiles (M15) are unrelated.
4. **Accounts required** — grants are non-transferable (`userId`; optional bind to email at issuance). Guest checkout does not receive promo benefits.
5. **Auto-apply** — customer does not need to type a code; best grant is applied in cart and locked in `create-stripe-checkout`.
6. **Cart UX** — show promo as a line with **expiration date** visible on the deduction row.
7. **Template vs grant**
   - **PromoTemplate** (admin config): kind (`percent` | `fixed`), value, `active`, default expiry rules, optional per-source config.
   - **PromoGrant** (issued instance): one **redemption** per grant; `source`, `userId`, optional `productId` / `cartSnapshotId`, `expiresAt`, `revokedAt`, `redeemedAt`, `orderId`.
8. **Deactivate template** — stops **new** issuances only. Already-issued unused grants remain valid until **used**, **expired**, or **admin revoked** (per buyer / ToS).
9. **Re-issuance loop** — each grant is single-use. After redemption (or qualifying event), a **new** grant may be issued only while the template is **active** and source rules fire again (see sources below). This is not “one code forever on a SKU.”

#### Grant sources

| Source | When issued | Eligibility at checkout | Re-issue after use |
|--------|-------------|-------------------------|-------------------|
| **admin** | Admin assigns to a user on demand | Per grant scope (cart / product) | Manual only |
| **thank_you** | On **paid** order (webhook final step) | Next order; template expiry | New grant after each **completed** purchase (while template active) |
| **favorite** | First time user favorites product **P** (**M6b**) | Discount applies only when **P** is in cart (line-level or allocated to P’s subtotal) | If **P** still favorited after paid order → new grant (**M6b**) |
| **abandoned_cart** | Cart idle ≥ N hours with items (**M6c**) | **Whole-cart subtotal** (not per line); tied to user + snapshot | Revoked when cart **fully empty**; new grant after new idle period (**M6c**) |

- **Favorite vs abandoned cart** — different triggers; both may exist for a user but only **one** wins at checkout (best savings → soonest expiry).
- **Unfavorite** (v1): unused grant remains until used/expired (no automatic revoke).

#### Notifications

- **v1:** **In-system** only (`Notification` kind `marketing` or `promo`) — favorite, thank-you, abandoned cart, admin-assigned.
- **Later (M6d / M13):** **Email** for **abandoned cart** recovery (in-system alone does not bring users back off-site).

#### Data models (Amplify)

**`PromoTemplate`** (admin CRUD):
- `name`, `kind` (`percent` | `fixed`), `percent` or `amountCents`, `active`
- `defaultExpiresInDays` or indefinite flag
- `source` enum or flags for which issuance paths use this template

**`PromoGrant`** (system + admin):
- `templateId`, `userId`, `source` (`admin` | `thank_you` | `favorite` | `abandoned_cart`)
- `productId?`, `cartSnapshotId?`
- `expiresAt`, `revokedAt?`, `redeemedAt?`, `orderId?`
- Optional display `code` / token for admin reference (not shared between users)

**`Order`** (extend):
- `discountCents`, `promoGrantId`, `promoSource`, `promoLabel` (and/or snapshot of expiry shown at checkout)

**`CartSnapshot`** (**M6c**): `userId`, line items json, `updatedAt`, `abandonedAt?`

**`Favorite`** (**M6b**): `userId`, `productId`, `createdAt`

#### Backend

- `promoGrantService` — list eligible grants for user + cart, compute cents off subtotal, pick winner, revoke.
- **`create-stripe-checkout`** — accept `promoGrantId` (or re-resolve server-side); discount subtotal before shipping; reject tampered amounts.
- **`stripe-webhook`** — on paid: issue thank-you grant; favorite re-issue if still favorited; mark grant redeemed; increment usage.
- No trust in client-side discount math.

#### Admin UI

- **`/admin/promos`** — CRUD templates (amount, expiry, active); **Issued grants** table (all sources, revoke).
- Issue grant to user; **revoke** one grant (abuse / ToS); block template delete while open grants exist.
- Order detail shows applied promo fields.

#### Storefront

- **Cart** — auto-applied promo line, subtotal after discount, shipping unchanged from M15, **expiry shown** on promo line.
- **Account** — optional list of active grants / notifications linking to cart.
- No “stacking” UI.

#### Phasing

| Milestone | Deliver |
|-----------|---------|
| **M6** | Templates, grants, admin assign/revoke, auto-apply cart + checkout, order fields, thank-you on paid webhook, in-system notifications |
| **M6b** | `Favorite` model + UI + favorite issuance + post-purchase re-issue |
| **M6c** | Server `CartSnapshot`, abandon detection, grant + in-system notify on return |
| **M6d** | Abandoned-cart email (with M13) |

**Cursor rules:**
- Single grant per order; never stack with shipping-profile free shipping as a “promo.”
- Template `active: false` must not delete or invalidate outstanding grants.
- Prefer server-side grant resolution in Lambda over client-only validation.

**Acceptance (M6 core):**
- Admin creates template, assigns grant to user; user sees discount on cart with expiry; checkout total matches Stripe; order stores promo fields.
- Paid order issues thank-you grant; notification appears in account inbox.
- Deactivating template stops new thank-you grants; existing unused thank-you grant still redeems.

---

### M15 — Shipping

**Status:** **Production verified** (2026-06-02) — live checkout with shipping on admin orders; PDP shipping block confirmed after `shippingDisplay` snapshot + deploy. **2026-06-13:** removed admin **Store default** UX; fallback = **first active profile by `sortOrder`** (legacy `isDefault` field unused in UI). Deeper regression tracked in [docs/qa-test-plan.md](../docs/qa-test-plan.md).

**Goal:** All shipping rules live in **Admin → Shipping profiles**. Each **product** picks a profile when edited (like Etsy listings). Checkout computes shipping from those assignments only — **nothing hardcoded in Lambda or env vars**.

#### Design principles

1. **Profiles are admin-configured** — flat rate, free over order subtotal, or weight tiers.
2. **Products assign a profile** — `Product.shippingProfileId` on product edit; new products pre-select the **first profile by `sortOrder`**; legacy rows with blank `shippingProfileId` fall back to that same first active profile at checkout/PDP.
3. **No hardcoded fallback** — if no active profiles or a product cannot resolve a profile, checkout fails with a clear admin-facing error (not silent $0 shipping).
4. **Multi-item carts (Option B)** — Etsy-like combine rule:
   - Keep the **highest first-item** shipping charge among combined (non-weight-tier) profile groups.
   - Charge **additional-item** rates for all remaining items.
   - Weight-tier profiles are added separately.
   - Expose a single shipping line on Stripe Checkout.

#### Shipping profile (`ShippingProfile`)

| Field | Type | Notes |
|-------|------|--------|
| `name` | string | Label on checkout / admin |
| `kind` | enum | `flat` \| `free_over_threshold` \| `weight_tier` |
| `amountCents` | int | First-item amount (or below-threshold first-item amount) |
| `additionalItemCents` | int | Additional-item amount after the first |
| `freeThresholdCents` | int? | `free_over_threshold`: order subtotal ≥ this → $0 |
| `weightTiers` | json? | `weight_tier`: `[{ maxWeightOz, amountCents }, …]` |
| `allowedCountries` | string[] | ISO codes for Stripe address collection |
| `isDefault` | boolean | **Legacy** — no longer set in admin UI (2026-06-13); fallback uses first profile by `sortOrder` |
| `active` | boolean | Inactive profiles cannot be used |
| `minReadyToShipDays`, `maxReadyToShipDays` | int? | Profile-wide “ships in …” window (e.g. large-order profile) |
| `sortOrder` | int | Admin list ordering |
| `minDeliveryDays`, `maxDeliveryDays` | int? | **Backlog (M15b):** optional Stripe Checkout estimated **arrival** (transit after ship) |

#### Product assignment (Etsy-style)

| Field | Type | Notes |
|-------|------|--------|
| `Product.shippingProfileId` | string? | Chosen on **Admin → Products → Edit** |
| `Product.weightOz` | int? | Required when assigned profile uses `weight_tier` |
| `Product.shippingDisplay` | json? | Cached PDP copy (`profileName`, `rateLabel`, `readyToShipLabel`) — written on **admin product save**; PDP reads snapshot first, then live profile fetch |

#### Rate kinds (all admin-created)

| Kind | Admin configures | Checkout computes |
|------|------------------|-------------------|
| **Flat** | `amountCents` + `additionalItemCents` | First item + each additional item |
| **Free over $X** | `amountCents` + `additionalItemCents` + `freeThresholdCents` | $0 if **order** subtotal ≥ threshold, else first+additional |
| **Weight tiers** | Tier table + product `weightOz` | Tier from sum of line weight in profile group |

#### Backend

- **`create-stripe-checkout`**: load products → resolve profile per line → `resolveCartShipping()` → single Stripe `shipping_option` with computed total (no hardcoded rates).
- **`stripe-webhook`**: persist `subtotalCents`, `shippingCents`, `shippingLabel`, `totalCents`.

#### Admin UI

- **`/admin/shipping`** — CRUD profiles (all kinds + weight tiers + ready to ship + sort order).
- **`/admin/products/:slug`** — **Shipping profile** dropdown (required selection when profiles exist) + **Weight (oz)**; save writes `shippingDisplay` snapshot.
- **Product detail (`/shop/:slug`)** — shipping card under price from snapshot or live profile.
- **Order detail** — subtotal, shipping, total, ship-to.

**Operations:**

- After changing shipping profiles or assignments, **re-save affected products** once so PDP snapshots stay in sync.
- Checkout uses Lambda (always loads profiles server-side); PDP uses product record + optional guest `ShippingProfile` read.

**Cursor rules:**

- **Never hardcode shipping amounts** in Lambda after M15 ships.
- Weight-based logic uses admin tier tables, not code constants.
- M6 promos apply to product subtotal before shipping.

**Acceptance:**

- Admin creates “Free over $100” profile, assigns to a product; cart ≥ $100 ships free.
- Admin creates weight-tier profile; product with weight gets tiered rate.
- Product with no assignment uses default profile.
- Checkout errors clearly if profiles or weights are missing.
- No `$0 Standard shipping` hardcoded fallback in code.

**Future (M15b):**

- Combined-shipping refinements (max vs sum rules for mixed profiles).
- Cart-page shipping estimate preview.
- Admin UI for **estimated arrival** (`minDeliveryDays` / `maxDeliveryDays` → Stripe `delivery_estimate`).
- Checkout shipping line suffix for ready to ship / estimated arrival.

---

### M16 — Returns, refunds & exchanges

**Status:** Planned — policy page exists (`/shipping-returns`); operations are email-only today.

**Goal:** Support your published policy (30-day returns on new products, buyer pays return shipping, refund within ~2 days of receipt) with admin tools and optional customer self-service — without building a full RMA/ERP.

**Why after M11:** Return eligibility starts at **delivery**. M11’s **shipped** stage + `deliveredAt` make the 30-day window enforceable in software. Refunds can ship earlier as admin-only if needed.

#### Three concepts (different complexity)

| Concept | What it is | Build approach |
|---------|------------|----------------|
| **Refund** | Money back via Stripe | Lambda + admin UI; webhook sync |
| **Return** | Physical item coming back | `ReturnRequest` workflow; admin approve → receive → refund |
| **Exchange** | Replace item / variant | Mostly **operational** — admin notes + partial refund or new checkout link; no automated swap checkout in v1 |

#### Prerequisites (gap today)

- `Order` stores `externalSessionId` (Checkout session) but **not** `stripePaymentIntentId` — refunds need the PaymentIntent (persist on webhook from `session.payment_intent`).
- Order `status` is only `pending` \| `paid` \| `failed` — extend for refund/return lifecycle.
- No customer “request return” flow on **Account → Orders** (page exists, read-only).

#### Phase A — Admin Stripe refunds (M16a)

**Backend:**
- Webhook: also handle `charge.refunded` / `refund.updated` (keep `Order` in sync).
- Admin-only mutation `createStripeRefund` Lambda:
  - Full or partial refund (amount in cents, optional reason).
  - Calls `stripe.refunds.create({ payment_intent, amount?, reason })`.
- Extend `Order`:
  - `stripePaymentIntentId: string`
  - `refundedCents: int` (default 0)
  - `paymentStatus: enum` — e.g. `paid` \| `partially_refunded` \| `refunded` (or derive from cents)
  - Optional `refundNotes: string` (admin)

**Admin UI (`/admin/orders/:id`):**
- Show payment ref, amount paid, amount refunded.
- **Issue refund** — full or partial, confirm dialog.
- Read-only refund history from Stripe or mirrored JSON on order.

**Acceptance:** Admin partial-refunds shipping on a paid order; Stripe Dashboard and order record match.

#### Phase B — Return requests (M16b)

**Data — `ReturnRequest` model:**
- `orderId`, `userId?`, `email`
- `status: enum` — `requested` \| `approved` \| `denied` \| `received` \| `closed`
- `reason: enum` — `defective` \| `not_as_described` \| `changed_mind` \| `other`
- `customerNotes`, `adminNotes`
- `lineItems: json` (which items / qty)
- `requestedAt`, `resolvedAt?`

**Customer:** **Account → Orders → Request return** (only if order `paid`, within 30 days of `deliveredAt` when M11 provides it; until then admin override).

**Admin:** Queue on order detail or `/admin/returns` — approve (email instructions: ship to forge address), mark **received**, trigger refund (Phase A) or link to refund button.

Align copy with `ShippingReturnsPage` — contact-before-shipping is the default path; self-service **requests** replace unstructured email for tracking.

#### Phase C — Exchanges (M16c, light)

- Return reason **`exchange`** + admin workflow checklist (no automated inventory swap).
- Admin: create manual **replacement order** (future) or send **one-time discount code** (M6) for difference.
- Document in admin UI: “Exchanges are handled case-by-case — approve return, then re-ship or refund difference.”

#### Out of scope (v1)

- Automated return labels (EasyPost/ShipStation).
- Restocking inventory on return.
- Customer-initiated Stripe refunds without admin approval.

**Cursor rules:**
- All Stripe refund calls go through a **Lambda** (never expose secret key to admin SPA).
- Refund amounts cannot exceed `totalCents - refundedCents`.
- Mock-checkout orders: admin status/notes only (no Stripe call).

---

### M8c — Sculptors

**Goal:** Admin-managed sculptor profiles + public pages.

**Data model:**
- `Sculptor` model (PK: `slug`):
  - `slug: string`
  - `name: string`
  - `logo: string` (S3 key under `sculptors/{slug}/…`)
  - `galleryImages: string[]` (S3 keys under `sculptors/{slug}/gallery/…`)
  - `description: string` (rich text HTML)
  - `myMiniFactoryUrl?: string`
  - `patreonUrl?: string`
  - `instagramUrl?: string`
  - `facebookUrl?: string`
  - `xUrl?: string`
  - `active: boolean`
  - `sortOrder: int`

**Auth:**
- Guest + authenticated read.
- Admin CRUD.

**Frontend:**
- Admin:
  - `/admin/sculptors` list + edit page.
  - Logo + portfolio gallery upload via S3 (reuse product gallery patterns).
  - Rich text description editor.
- Public:
  - `/sculptors/:slug` page (portfolio carousel + bio).
  - Home page: live sculptor cards from DB.

**Cursor rules:**
- Follow existing admin patterns (`AdminLayout`, list + detail pages).
- Use `services` module for sculptor data access.

**Follow-on:** **M8d** — sculptor self-service editing — **shipped** (see below).

---

### M8d — Sculptor self-service editor (partner sub-admin)

**Status:** **Production verified.**

**Depends on:** M8c (shipped sculptor profiles + admin CRUD).

**Goal:** A licensed sculptor can edit **their own** public profile using the same fields and UX as admin sculptor edit, without access to the full admin portal or other sculptors’ data. An **admin grants** edit access per sculptor.

**Permission model (v1):**
- Add optional `editorUserId: string` on `Sculptor` — Cognito `sub` of the user allowed to edit that profile.
- Admin assigns or revokes access from the sculptor admin edit page (lookup customer by email, same pattern as vault/notifications targeting).
- Auth rules on `Sculptor`:
  - Guest + authenticated: read (unchanged).
  - Admin: full CRUD (unchanged).
  - Owner: `allow.ownerDefinedIn("editorUserId").identityClaim("sub").to(["read", "update"])` — only when `editorUserId` is set.

**Fields sculptors may edit (self-service):**
- `name`, `description`, `logo`, `galleryImages`, social URLs (`myMiniFactoryUrl`, `patreonUrl`, `instagramUrl`, `facebookUrl`, `xUrl`).

**Fields admin-only (not exposed on partner UI):**
- `slug`, `active`, `sortOrder`, `editorUserId` (grant/revoke).

**Frontend:**
- **Partner portal** (new, not under `/admin`):
  - Route e.g. `/partner/sculptor` (or `/sculptor/edit`) — single edit page for the logged-in sculptor’s assigned profile.
  - `SculptorPartnerLayout` — minimal shell (brand header, sign out, link to public profile); **no** admin nav.
  - Reuse existing editor building blocks: `RichTextEditor`, `AdminSculptorGalleryEditor`, logo upload helpers, `saveSculptor` (or a scoped `updateOwnSculptor` service that rejects admin-only fields).
  - Gate route: user must be signed in and `editorUserId` must match their `sub` for exactly one `Sculptor` row; otherwise show “no access” / contact admin.
- **Admin:**
  - On `/admin/sculptors/:slug` — section **Partner access**: assign user by email (sets `editorUserId`), revoke (clears field), show current assignee.

**Backend / services:**
- `sculptorService.ts`:
  - `getSculptorForEditor(client, userId)` — fetch the one profile this user may edit.
  - `updateOwnSculptor(client, userId, data)` — update allowed fields only; verify `editorUserId === userId`.
- Optional Lambda: add user to a `sculptor` Cognito group on grant (for nav/routing hints only); **authorization must still use `editorUserId` on the model**, not group alone.

**Cursor rules:**
- Do **not** duplicate the full admin sculptor form — extract shared `SculptorProfileForm` (or similar) used by admin and partner pages; admin wrapper adds slug/active/sort/access controls.
- Partner users must **not** reach `/admin/*` routes (existing admin guard unchanged).
- Slug rename stays admin-only (PK recreate logic stays in admin save path).
- Follow existing patterns: `requireAdminSession`, customer session helpers, `resolveImageUrl`, storage under `sculptors/*`.

**Acceptance:**
- Admin grants sculptor A access; sculptor A signs in and edits bio/gallery/logo; changes appear on `/sculptors/:slug`.
- Sculptor A cannot edit sculptor B’s profile or access admin pages.
- Admin can revoke access; former editor loses partner route.

---

### M9a — Initial UX polish

**Status:** **Partial** — scroll-to-top on forward nav shipped (2026-06-13). Remaining items planned after M18.

**Shipped (2026-06-13, see §3.1):** forward-navigation scroll reset (back/forward preserves position).

**Goal:** Small, high-impact storefront UX improvements that make the shop feel finished. No new backend models unless strictly necessary.

**Priority examples (expand during implementation):**

| Area | Improvement |
|------|-------------|
| **Add to cart** | Clear feedback when item(s) added — e.g. brief toast, inline confirmation, and/or cart icon badge animation (header count already updates; user may not notice) |
| **PDP** | Disabled “Add to cart” states explained (variants required, out of stock) |
| **Cart** | Loading / empty / error states consistent with design system |
| **Checkout** | Clearer progress when redirecting to Stripe (“Forging…” already; ensure errors are visible) |
| **Account** | Form success/error feedback on login, register, notifications |
| **Favorites** | Confirm save/unsave beyond button label (align with add-to-cart pattern) |

**Out of scope (M9a):**

- New commerce features (sales, promos, shipping) — other milestones.
- SEO, gallery page, Merchant feed — **M9**.
- Print stages — **M11**.

**Cursor rules:**

- Prefer lightweight patterns (toast component, `aria-live` region, CSS transition) over new dependencies.
- Reuse existing `Icon`, layout header cart count, and Tailwind tokens.

**Acceptance:**

- Adding a product from PDP gives **obvious** confirmation within 1s without leaving the page.
- No regression to cart, checkout, or variant picker behavior.

---

### M9 — Polish & growth

**Goal:** SEO, gallery, performance — **after M9a** and core milestones; not a substitute for cart/PDP micro-interactions.

**Scope:**
- **Gallery page**:
  - `/gallery` route.
  - Uses existing product images and/or curated gallery entries (v1 can reuse `Product`).
- **SEO/meta tags**:
  - Add per-route `<title>` and meta description.
  - OG tags for key pages (home, PDP).
- **Performance**:
  - Ensure images use appropriate sizes and lazy loading.
  - Confirm CDN usage via Amplify (no code change needed, but ensure URLs are correct).
- **Newsletter**:
  - Wire home page newsletter form to a provider (Mailchimp, etc.) or create a simple DynamoDB-backed `NewsletterSubscriber` model (minimal PII: email only).

**Cursor rules:**
- Keep SPA structure; no SSR.
- Use React Helmet or a simple head manager pattern if already present; otherwise, introduce a minimal solution.

---

### M10 — Admin–customer chat

**Goal:** Direct messaging between admins and customers.

**Data models:**
- `Conversation`:
  - `id`
  - `userId` (customer)
  - `subject: string`
  - `lastMessageAt: datetime`
  - `unreadForCustomer: boolean`
  - `unreadForAdmin: boolean`
- `Message`:
  - `id`
  - `conversationId`
  - `senderRole: "admin" | "customer"`
  - `body: string`
  - `createdAt: datetime`

**Auth:**
- Customer:
  - Owner read/write on conversations where `userId = sub`.
- Admin:
  - Full read/write.

**Frontend:**
- Customer:
  - `/account/messages` or `/account/chat`:
    - List of conversations.
    - View + reply.
    - Start new conversation.
- Admin:
  - `/admin/messages`:
    - List conversations.
    - Filter by customer.
    - Open from order detail (link to conversation).

**Real-time:**
- v1: polling (simple interval or manual refresh).
- Future: AppSync subscriptions (optional).

**Cursor rules:**
- Use `services/chatService.ts` for data access.
- Do not implement real-time subscriptions in v1 unless explicitly requested.

---

### M11 — Customer order status + shipping (critical — next)

**Status:** **In progress** — implemented in repo (2026-06-11); deploy backend + QA §19.

**Goal:** Close the post-purchase communication gap. Separate **payment** status (`pending` \| `paid` \| `failed`) from **fulfillment** progress customers actually care about.

#### Customer-facing stages (v1 — only these four on storefront)

| Stage | Customer sees | When set |
|-------|----------------|----------|
| **Paid** | Payment received | Stripe webhook / mock checkout sets `Order.status = paid` and `fulfillmentStatus = paid` |
| **Received** | We have your order | Admin advances (or optional auto shortly after paid) — shop acknowledged the order |
| **Processing** | Your order is being forged | Admin advances when fabrication starts |
| **Shipped** | Shipped + carrier + tracking link | Admin advances with **carrier** + **tracking number** (required) |

Do **not** expose internal print micro-stages (queued, printing, wash, …) to customers in v1 — those belong to **M11a** (optional admin-only detail while status stays **processing**).

#### Customer updates today (gap — pre-M11)

| Channel | What fires after purchase | Notes |
|---------|---------------------------|--------|
| **Account → Order history** | Status label **Paid** only | No fulfillment timeline, ship-to, or tracking |
| **Account → Notifications** | Optional **thank-you promo** (M6) | `kind: marketing` — not order status |
| **Checkout success** | Static “payment received” | No ongoing updates |
| **Email to customer** | _(none)_ | Support inbox email only (go-live polish) |
| **Guest checkout** | Limited order history unless account linked | `Order.email` stored — use for shipped email |

#### Data model

Extend **`Order`**:

| Field | Type | Notes |
|-------|------|--------|
| `fulfillmentStatus` | enum | `paid` \| `received` \| `processing` \| `shipped` — **customer-facing** timeline |
| `fulfillmentUpdatedAt` | datetime? | Last fulfillment transition |
| `carrier` | string? | Required when advancing to **shipped** |
| `trackingNumber` | string? | Required when advancing to **shipped** |
| `trackingUrl` | string? | Optional; derive from carrier + number when omitted |
| `shippedAt` | datetime? | Set on **shipped** |
| `deliveredAt` | datetime? | Manual v1; used by **M16** return window |

Keep `Order.status` for **payment** only — do not overload with fabrication.

#### Notifications & email

On each fulfillment transition (when `userId` is set):

1. Create targeted `Notification` with `kind: order`, linking to **`/account/orders/:orderId`**.
2. **Copy (examples):**
   - **Paid:** “Payment received — we’re preparing your order.”
   - **Received:** “We’ve received your order.”
   - **Processing:** “Your order is being forged.”
   - **Shipped:** “Your order has shipped via {carrier} — tracking {number}.” (must include clickable tracking)

**Email (customer):** reuse SES + `order-shared` patterns (same stack as support order email). Send on **Paid** (confirmation) and **Shipped** (tracking) at minimum; optional on received/processing. Requires **SES production** or verified recipient addresses until sandbox limits are lifted. Respect **M12** `order` preference when implemented; until then, treat order-status email as transactional.

#### Backend

- **Stripe webhook** (+ mock `notifyOrderPlaced`): after `status = paid`, set `fulfillmentStatus = paid`, create **paid** notification (and optional confirmation email to `Order.email`).
- **Admin mutation** (or admin UI → `Order.update`): advance `fulfillmentStatus` forward only (no skip backward in v1); validate carrier + tracking before **shipped**.
- Optional: tie admin dashboard **acknowledge** to auto-advance **paid → received** (reuse `adminAcknowledgedAt` pattern) — decide at implementation.

#### Frontend

- **Customer**
  - **`/account/orders/:orderId`** — NEW: line items, totals, ship-to, **4-step timeline**, tracking block when shipped.
  - **Order history list** — link to detail; show `fulfillmentStatus` label (not only “Paid”).
  - **Notifications** — `order` kind rows deep-link to order detail.
- **Admin**
  - Order detail: fulfillment stepper (4 stages) + shipping fields on **shipped**; separate from payment status dropdown.

#### Out of scope for M11 v1

- Fabrication micro-stages (**M11a**).
- Carrier API auto-tracking / delivery webhooks.
- Real-time push / AppSync subscriptions.
- Guest order portal without sign-in (email-only updates via SES is acceptable v1).

#### Cursor rules

- Reuse `Notification` (`kind: order`) — do not add a parallel inbox system.
- Reuse SES helpers from `order-shared/` for customer email; separate template from support new-order email.
- Do not extend payment `status` enum for fulfillment.

#### Acceptance

- Paid Stripe order → customer sees **Paid** on order detail + `order` notification.
- Admin advances through **received** → **processing** → **shipped** (with carrier + tracking) → customer timeline and notifications update at each step.
- **Shipped** shows tracking link on order detail and in notification (and email when SES allows).
- **M16** can use `shippedAt` / `deliveredAt` for return policy.

---

### M11a — Fabrication stage detail (optional — deferred)

**Status:** **Deferred** — after **M11**. Optional admin-only granularity while customer status remains **processing**.

**Goal:** Internal print pipeline tracking (`PrintJob`: queued → printing → wash → supports → cure) without changing the customer-facing four stages.

**Depends on:** **M11** (`fulfillmentStatus` + order detail page exist).

**Customer rule:** Storefront continues to show **processing** until admin sets **shipped** on the parent `Order`.

**Acceptance:** Admin sees micro-stage stepper on order detail; customer UI unchanged except optional admin note.

---

### M11b — Raspberry Pi printer bridge (optional)

**Status:** **Deferred** with **M11a**.

**Depends on:** **M11a** (`PrintJob` model and stage API).

**Goal:** Automate stage transitions for the **3D Printing** step using a Pi on the LAN.

**Backend:**
- Add a secure endpoint (mutation) for the Pi to call:
  - `updatePrintJobStage(printJobId, stage, metadata?)`
  - Auth via API key or service token (not Cognito).
- Ensure idempotency (repeated calls with same stage are safe).

**Pi side (out of repo scope, but API must support it):**
- Pi connects to printer via SDCP.
- On print start:
  - Calls `updatePrintJobStage(..., "printing")`.
- On print complete:
  - Optionally calls `updatePrintJobStage(..., "wash")` or leaves to admin.

**Cursor rules:**
- Only implement the backend endpoint and wiring to `PrintJob`.
- Do not implement Pi code in this repo.

---

### M12 — Notification preferences

**Goal:** Let customers control which notifications they receive.

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
  - For broadcast, skip users who have disabled that category.
- Transactional notifications (order/print) may be mandatory; this can be a config flag.

**Frontend:**
- Account settings page:
  - `/account/settings` or section on `/account`.
  - Toggles for each category.

**Cursor rules:**
- Do not retroactively delete existing notifications.
- Only prevent new ones from being created for disabled categories.

---

### M17 — Removed-from-catalog UX (bug **B1**)

**Status:** **Production verified** (2026-06-11) — deployed; monitor for edge cases.

**Goal:** When a product is no longer in the catalog (admin delete, or treat as unavailable if `inStock: false` / hidden — confirm behavior in implementation), customers with it in **cart** or **favorites** see a clear message instead of broken checkout or silent failures. Customers can **view and manage** all saved favorites in one place.

**Depends on:** **M6b** (`Favorite` model + PDP favorites UI).

**Storefront:**

- **Cart (`/cart`):** Lines for missing products show **“Removed from the store”** (or similar), no checkout for those lines; one-click **Remove**; block checkout while any removed line remains (extend `validateCartLines`).
- **Favorites list (`/account/favorites`):** Signed-in customers see saved pieces (shop + vault), link to PDP, **Remove from favorites**; **Removed from the store** section for stale favorites (slug/id) with one-click clear.
- **Favorites (PDP):** `StaleFavoriteNotice` when favorite points at missing slug; do not issue favorite promos for removed products.
- **Account home:** link to **Saved favorites**.
- **CartSnapshot / promo:** Do not apply product-scoped grants for removed `productId`s.

**Admin:**

- Optional: soft-delete flag on `Product` instead of hard delete (v2); v1 can rely on delete + client handling of missing catalog row.

**Acceptance:**

- Customer with stale cart line for deleted product sees explicit copy, can remove line, checkout works for remaining valid lines.
- **`/account/favorites`** lists active favorites with product cards; removed favorites in separate section; remove works from list and PDP.
- Favorite on deleted product shows removed message; toggle clears favorite without error.

---

### M18 — Cart price-change notifications

**Status:** Planned — **after M19** (needs sale/list price semantics) and **M6c** (`CartSnapshot` sync).

**Goal:** Notify signed-in customers (in-system `Notification`, kind `marketing` or `order`) when an item **in their server cart snapshot** has a **price decrease** (sale or markdown) or **price increase** (list price change).

**Depends on:** **M6c** (`CartSnapshot`), **M19** (or minimal `compareAtCents` / `salePriceCents` on `Product` if M19 is phased).

**Design notes:**

- Compare **last notified price** (or price at last `CartSnapshot` sync) vs current catalog `priceCents` (+ variant delta).
- Throttle: one notification per product per user per change window (avoid spam on every cart page load).
- Respect **M12** preferences when implemented; until then, send marketing notifications.
- **Not** the same as **M6** promo grants (account offers); this is **catalog price** transparency.

**Backend:**

- Extend `syncCartSnapshot` (or dedicated Lambda) to diff prices and create targeted notifications.
- Optional: store `lastNotifiedPriceCents` on snapshot line json.

**Acceptance:**

- Admin lowers product price → customer with item in cart receives in-system alert with link to cart/PDP.
- Price increase → optional notification (config or always inform — decide at implementation).

---

### M19 — Catalog sales & product bundles

**Status:** Planned — **after M17**, **before M18** (price alerts need stable sale fields).

**Goal:** Admin-defined **storefront sales** on individual products and **bundles** (multi-SKU single purchase). Distinct from **M6** (per-account promo grants auto-applied at checkout).

**Scope (v1):**

1. **Single-product sale**
   - Fields on `Product` (or `ProductSale` overlay): e.g. `salePriceCents`, `compareAtCents`, `saleStartsAt`, `saleEndsAt`.
   - PDP + shop card show struck-through compare + sale price.
   - Cart uses **sale price** for subtotal; checkout Lambda reads live catalog (same as today, with sale fields).

2. **Bundles (v1 minimal)**
   - `ProductBundle` or `bundleItems` json on a sellable “bundle” product: component `productId`s + qty.
   - One add-to-cart for bundle; line items expand for shipping/inventory or stay single bundle line (decide at spec — prefer expanded lines for M15 shipping).

3. **Admin**
   - Product edit: sale window + compare-at.
   - Bundle editor (which products, bundle price).

**Out of scope (v1):**

- Stack bundle sale with M6 account promo (still **one grant per order**; sale price is line price before grant).
- BOGO / complex rules.

**Relationship to M6:**

| | **M6 promos** | **M19 catalog sales** |
|--|----------------|------------------------|
| Who | Per-user grants | Everyone sees sale on PDP |
| Set in | Promo templates / grants | Product (or bundle) admin |
| Checkout | Auto-pick best grant | Line `priceCents` from catalog |

**Acceptance:**

- Admin sets 20% off a SKU for two weeks; storefront shows sale; cart/checkout totals match.
- Admin creates bundle at fixed price; customer adds once; order line items and shipping resolve correctly.

---

### M13 — Marketing & growth engine (new)

**Goal:** Turn the site into a growth-ready ecommerce platform.

**Scope:**

1. **Google Merchant Center + Shopping feed**
   - Generate a product feed (XML or JSON) from `Product` data.
   - Include:
     - Title, description, price, availability, image URL, product URL.
   - Either:
     - Static feed endpoint (Lambda + AppSync), or
     - Export script run manually.

2. **Tracking pixels**
   - Ensure GA4 events for:
     - View item
     - Add to cart
     - Begin checkout
     - Purchase (after Stripe integration).
   - Optionally add:
     - Meta pixel
     - TikTok pixel
   - Keep them behind config flags/env vars.

3. **Email capture**
   - Wire newsletter form to:
     - A provider (Mailchimp, etc.), or
     - A simple `NewsletterSubscriber` model (email only).
   - Add a basic welcome flow (even if manual at first).

4. **Retargeting readiness**
   - Ensure UTM parameters are preserved through checkout.
   - Ensure order records can be correlated with campaigns (store `utmSource`, `utmMedium`, `utmCampaign` on `Order` if present).

**Cursor rules:**
- Keep tracking scripts minimal and configurable.
- Do not hardcode IDs; use env vars.

---

### M14 — ForgeLink™ hardware MVP (new)

**Status:** **Deferred** with **M11** / **M11b**.

**Depends on:** M11b (reuse the same device-authenticated `updatePrintJobStage` API; do not invent a second auth scheme).

**Goal:** Prepare the platform to support a sellable Pi-based print bridge product.

**Scope (in this repo):**

1. **Device model**
   - `ForgeDevice`:
     - `id`
     - `name`
     - `apiKey` (hashed or token)
     - `status: "active" | "inactive"`
     - `lastSeenAt: datetime`
     - `notes?: string`

2. **Admin UI**
   - `/admin/devices`:
     - List devices.
     - Create device (generate token).
     - Deactivate/reactivate.

3. **API for devices**
   - Mutations:
     - `registerDevice` (optional, or admin-only).
     - `updatePrintJobStage` (reuse from M11b, but scoped to a device).
   - Auth:
     - Use a device token separate from Cognito.

4. **Pairing concept**
   - For now, pairing can be manual:
     - Admin creates device.
     - Copies token into Pi config.

**Cursor rules:**
- Do not implement billing, multi-tenant, or external customer onboarding yet.
- Keep ForgeLink™ logic clearly separated from core storefront flows.

---

## 5. Frontend implementation guidelines for Cursor

- Use existing layout components (`Layout`, `AdminLayout`).
- Use existing design tokens and Tailwind classes.
- For new pages:
  - Add route in `App.tsx`.
  - Place page in `src/pages/...`.
- For new admin pages:
  - Add to admin nav.
  - Use `requireAdminSession`.

**Error handling:**
- Follow existing pattern: local `error` state with a visible message.
- Log to console where helpful; do not introduce new logging infrastructure.

**Loading states:**
- Use simple spinners or skeletons consistent with existing pages.

---

## 6. Backend implementation guidelines for Cursor

- All new models go in `amplify/data/resource.ts`.
- Use Amplify Data patterns already present.
- For custom logic:
  - Add new Lambda under `amplify/functions/`.
  - Wire via Amplify Data custom resolvers if needed (see [`reference/api-reference.md`](./reference/api-reference.md)).

**Auth rules:**
- Use `allow.guest()` for public read where appropriate.
- Use `ownerDefinedIn("userId")` for customer-owned data.
- Use `ownerDefinedIn("editorUserId")` for sculptor partner self-service (M8d).
- Use `group("admin")` for admin-only operations.

---

## 7. What Cursor must not do

- Do not replace Amplify with a custom backend.
- Do not introduce a second auth system.
- Do not change the design system or Tailwind token names.
- Do not remove or rename existing models without explicit instruction.
- Do not introduce SSR or a different routing framework.
- Do not move or delete documentation in `project-plans/` or `docs/`.

---

## 8. How to use this roadmap with Cursor

When Patrick asks Cursor to implement a feature:

1. Identify the relevant milestone(s) in this file.
2. Follow the **data model**, **API**, **frontend**, and **backend** specs for that milestone.
3. Respect the **operating rules** and **file placement rules**.
4. Keep changes scoped to the milestone.
5. If something is ambiguous, prefer:
   - Minimal implementation
   - Consistency with existing patterns
   - Backwards compatibility

This roadmap is meant to **accelerate shipping**, not to chase architectural perfection.

Ship first. Refactor in slices. Grow the forge.

