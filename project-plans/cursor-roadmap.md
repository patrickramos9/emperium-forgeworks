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

**Last updated:** 2026-06-02

| Item | State |
|------|--------|
| **Phase** | Promo codes (M6) |
| **Next** | **M6** — promo templates, grants, auto-apply checkout (spec below; M6b–M6d phased) |
| **Blocked** | — |
| **Recently verified** | **M15** — profiles, Stripe checkout shipping, admin order totals, PDP shipping block (`shippingDisplay` snapshot) — **production verified** |
| **In progress** | **M6 core** — templates, grants, auto-apply cart/checkout, thank-you on paid order |
| **Payments today** | Mock locally; Stripe when `VITE_APP_ENV=deployment` + backend secrets |
| **QA** | [docs/qa-test-plan.md](../docs/qa-test-plan.md) — feature-by-feature manual regression |

**Recommended build order:**  
M8 (done) → **M3b** (done) → **M15** (done) → **M6** → **M6b** (favorites) → **M6c** (abandoned cart) → M11 → **M16** → M10 → M11b → M14 → M12 → **M13** (+ **M6d** abandoned-cart email) → M9

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

### Blocked / waiting

_(none)_

### In progress

- **M6 core** — implemented in repo; deploy + QA pending (M6b favorites, M6c abandoned cart not started)

### Planned (not started)
- **M6** — Promo templates, grants, auto-apply checkout, thank-you issuance, admin tools
- **M6b** — Favorites + favorite-item grants (re-issue after purchase)
- **M6c** — Abandoned cart detection + in-system notification (account required)
- **M6d** — Abandoned-cart **email** (defer; align with M13 marketing)
- **M9** — Polish & growth (gallery, SEO, performance)
- **M10** — Admin–customer chat
- **M11** — Print progress tracker (Queued → fabrication → Shipped)
- **M16** — Returns, refunds & exchanges (Stripe refunds + return requests; exchanges operational)
- **M11b** — Raspberry Pi SDCP bridge (optional; extends M11)
- **M12** — Notification preferences
- **M13** — Marketing & growth engine (feed, pixels, UTM — prefer after M3b)
- **M14** — ForgeLink™ hardware MVP (device registry; extends M11b API)

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

**Status:** Spec agreed (2026-06-02) — not implemented. `/admin/promos` is a placeholder.

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
| **abandoned_cart** | Cart idle ≥ N hours with items (**M6c**) | Cart-scoped grant for that snapshot | New grant on each new abandon event while template active (**M6c**) |

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

- **`/admin/promos`** — CRUD templates (amount, expiry, active).
- Issue grant to user; **revoke** one grant (abuse / ToS).
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

**Status:** **Production verified** (2026-06-02) — live checkout with shipping on admin orders; PDP shipping block confirmed after `shippingDisplay` snapshot + deploy. Deeper regression (mixed carts, weight tiers, free-over-threshold) tracked in [docs/qa-test-plan.md](../docs/qa-test-plan.md).

**Goal:** All shipping rules live in **Admin → Shipping profiles**. Each **product** picks a profile when edited (like Etsy listings). Checkout computes shipping from those assignments only — **nothing hardcoded in Lambda or env vars**.

#### Design principles

1. **Profiles are admin-configured** — flat rate, free over order subtotal, or weight tiers.
2. **Products assign a profile** — `Product.shippingProfileId` on product edit; blank → store **default** profile (`ShippingProfile.isDefault`).
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
| `isDefault` | boolean | Fallback when product has no assignment (one per store) |
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

- **`/admin/shipping`** — CRUD profiles (all kinds + default flag + weight tiers + ready to ship).
- **`/admin/products/:slug`** — **Shipping profile** dropdown + **Weight (oz)**; save writes `shippingDisplay` snapshot.
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

**Why after M11:** Return eligibility starts at **delivery**. M11’s fulfillment stages (especially **Shipped** / delivered date) make the 30-day window enforceable in software. Refunds can ship earlier as admin-only if needed.

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

### M9 — Polish & growth

**Goal:** SEO, gallery, performance.

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

### M11 — Print progress tracker

**Goal:** Track order progress through fabrication stages.

**Data model:**
- `PrintJob`:
  - `id`
  - `orderId`
  - `stage: enum` (`queued`, `printing`, `wash`, `supports`, `cure`, `shipped`)
  - `stageTimestamps: JSON` (map stage → datetime)
  - `notes?: string`

**Auth:**
- Owner read (via `orderId`).
- Admin read/write.

**Backend logic:**
- When order is created:
  - Create `PrintJob` with `stage = queued`.
- Admin UI:
  - On order detail page, show stage stepper.
  - Buttons to advance stage.
  - Each stage change:
    - Update `PrintJob`.
    - Create `Notification` of kind `order` for the customer (if signed in).

**Frontend:**
- Customer:
  - On order detail page, show stepper with 6 stages.
- Admin:
  - Stage controls integrated into existing order detail page.

**Cursor rules:**
- Reuse `Notification` model for stage updates.
- Do not introduce new notification types unless needed.

---

### M11b — Raspberry Pi printer bridge (optional)

**Depends on:** M11 (`PrintJob` model and stage API must exist first).

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

