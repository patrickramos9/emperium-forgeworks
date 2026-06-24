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

**Last updated:** 2026-06-22

| Item | State |
|------|--------|
| **Phase** | **Post-M16** — **M21 Printing as a Service** is next |
| **Next** | **M21** — policy + print configurator, STL upload, standard cart/checkout |
| **Blocked** | _(none)_ — **SES production access** stalled (AWS support); **customer transactional email** optional — in-app order notifications work; third-party email (Resend/Postmark/etc.) or **M20** `EmailProvider` port are fallbacks |
| **Recently verified** | **M16** returns/refunds (2026-06-22) · **M11** customer order status + shipping (2026-06-23) · **M6 new-account promo** (2026-06-20) · **M6b** · **M6c** · **M17** (B1) · **Go-live polish** · **Order notification email** to support (2026-06-11) · **M3b cancel/refund sync** (2026-06-14) |
| **Recently shipped (repo)** | **M16** admin Stripe refunds, return requests, `/admin/returns` (2026-06-22) · **M11 polish** (2026-06-23): checkout orphan-order fix, order line variant labels, product links (shop/vault/admin), admin orders fulfillment column · **M15** `us_free_international_flat` (2026-06-14) · **M9a** UX polish (2026-06-16) |
| **In progress** | _(none)_ |
| **Payments today** | **Production:** Stripe live when `VITE_APP_ENV=deployment` (Amplify `main`). Mock only for local `npm run dev`. |
| **QA** | [docs/qa-test-plan.md](../docs/qa-test-plan.md) — smoke/regression on demand; §6–§20 retained as checklists |
| **Test hygiene** | `scripts/reset-promo-data.ts` — grants, templates, marketing notifications, cart snapshots |

**Recommended build order:**  
M8 (done) → … → **M11** (done) → **M16** (done) → **M21** (printing as a service) → **M19** (catalog sales & bundles) → **M18** → **M8a.3** (inbox vs campaigns) → M10 → M12 → **M13** (+ **M6d**) → **M6e** (guest cart + identity sync) → **M9** → **M11a** (fabrication sub-stages) → M11b (Pi) → M14

**Deferred (ops / hardware):** **M11a** (optional print micro-stages), **M11b** (Pi bridge), **M14** (ForgeLink™). **Post-v1:** **M20** (cloud portability — §4).

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
- `Notification` _(today — conflates campaigns + inbox; split in **M8a.3**)_
- `NotificationRead` _(today — migrate to inbox read model in **M8a.3**)_
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
- **M3b** — Live Stripe Checkout + webhook (`Order` paid / cancelled / refunded, ship-to address, email/phone) — **production verified**; cancel sync (`cancelStripeCheckoutSession`, `/checkout/cancel`, webhooks) — **production verified** (2026-06-14)
- **M15** — Shipping profiles, product assignment, Stripe checkout shipping, order totals, PDP shipping (`shippingDisplay` + live fallback), ready-to-ship on profiles — **production verified**
- **M6 core** — Promo templates, grants, auto-apply cart/checkout, thank-you on paid order, admin tools — **production verified** (2026-06-02)
- **M6c** — Abandoned-cart snapshot, idle grant, revoke on empty cart, issued-grants admin table — **production verified** (2026-06-11)
- **M6b** — Favorite grants + PDP UI + favorites list — **production verified** (2026-06-11)
- **M17** — Removed-from-catalog UX (cart + favorites) — fixes **B1** — **production verified** (2026-06-11)
- **Go-live polish (2026-06-13)** — see **§3.1** below — **production verified** (2026-06-11; monitor for bugs)
- **M9a** — Initial UX polish (toasts, cart badge bump, PDP/cart/favorites/checkout/account feedback) — **shipped** (2026-06-16; deploy frontend)
- **M6 new-account promo** — `useForNewAccount` template flag + `new_account` grant via `issueNewAccountWelcomeGrant` after verify/sign-in — **production verified** (2026-06-20)
- **M11** — Customer order status + shipping (`fulfillmentStatus`, 4-stage timeline, admin fulfillment stepper, in-app `order` notifications, tracking on ship, order detail with line items/variants/product links) — **production verified** (2026-06-23); checkout orphan-order fix; admin orders list fulfillment column; cart/admin product link routing (shop vs vault vs admin edit)
- **M16** — Returns, refunds & exchanges (`createStripeRefund`, partial/full refunds, `ReturnRequest`, customer `/account/orders/:id/return`, admin `/admin/returns`) — **shipped** (2026-06-22; deploy backend + frontend)

### 3.4 M16 — returns, refunds & exchanges (2026-06-22)

| Area | What shipped |
|------|----------------|
| **M16a** | `createStripeRefund` Lambda; `Order.refundedCents`, `refunds` ledger, `refundNotes`; admin refund panel on order detail; webhook syncs partial + full refunds |
| **M16b** | `ReturnRequest` model; `submitReturnRequest` / `updateReturnRequest`; customer return form; admin queue on order detail + `/admin/returns` |
| **M16c** | Exchange reason + admin case-by-case copy on return detail |

**Deploy:** Backend (schema, 3 Lambdas) + frontend.

### 3.3 M11 — customer order status + shipping (2026-06-23)

**Signed off** 2026-06-23 — regression checklist [docs/qa-test-plan.md](../docs/qa-test-plan.md) §19.

| Area | What shipped |
|------|----------------|
| **Fulfillment** | `fulfillmentStatus` on `Order`; admin advance paid → received → processing → shipped; carrier + tracking required on ship |
| **Customer** | `/account/orders/:orderId` timeline, ship-to, tracking; order history fulfillment labels; `kind: order` notifications |
| **Admin** | Fulfillment stepper on order detail; orders list/dashboard show **fulfillment** (not payment status only) |
| **Checkout hardening** | Stripe session before DB order; cancel superseded pending orders; hide orphan `pending_*` rows on customer orders |
| **Order line items** | Variant labels on snapshots; product links (customer: shop/vault; admin: product edit); cart vault-only links |

**Optional (deferred):** Customer transactional email on paid/shipped — blocked on SES production access (in-app notifications verified).

**Deploy:** Backend (`updateOrderFulfillment`, checkout Lambda) + frontend.

### 3.1 Go-live polish batch (2026-06-13)

Shipped in repo during pre-launch polish. **Signed off** 2026-06-11 (deployed; monitor for bugs). Regression checklists in [docs/qa-test-plan.md](../docs/qa-test-plan.md) §18a.

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

### 3.2 M9a + new-account promo (2026-06-16)

**M9a:** shipped in repo (deploy frontend). **New-account promo:** **production verified** 2026-06-20. Regression checklists in [docs/qa-test-plan.md](../docs/qa-test-plan.md) §20 and §17 (new-account).

| Area | What shipped |
|------|----------------|
| **Global UX (M9a)** | Toast system + `aria-live`; cart icon badge bump on add; `PageFeedback` banners |
| **PDP** | Add-to-cart toast (product name + price, optional View cart); disabled-state helper text |
| **Favorites** | Save/unsave toasts aligned with add-to-cart |
| **Cart** | Loading / empty / error / unavailable-line banners; checkout “Forging…” + redirect status; clear disabled during redirect |
| **Checkout cancel** | Sync status/error banners on `/checkout/cancel` |
| **Account forms** | Login / register / notifications use `PageFeedback`; register welcome toast + notification badge refresh |
| **New-account promo** | `PromoTemplate.useForNewAccount`; grant `source: new_account` via `issueNewAccountWelcomeGrant` mutation (called after verify/sign-in); admin template checkbox; once per user lifetime |

**Deploy:** Frontend for M9a UX + `ensureNewAccountWelcomeGrant()`; **backend redeploy** for schema enum + `issue-new-account-grant` Lambda.

### Blocked / waiting

_(none)_

### In progress

_(none — monitor production; fix bugs ad hoc)_

### Resolved bugs

| ID | Issue | Resolution |
|----|--------|------------|
| **B1** | Admin deletes/delists product while in customer cart or favorites | **M17** deployed 2026-06-11 — monitor for edge cases |

### Planned (not started)

**Next**

- **M21** — **Printing as a Service** — home-page entry, policy + print configurator, STL upload, standard cart/checkout (see §4)

**Then**

- **M19** — Catalog **sales** on products and **bundles** (storefront pricing; separate from M6 account promos)

**Core + polish (after M19)**

- **M18** — **Cart price-change** in-system notifications (sale or list price up/down for items in cart)
- **M8a.3** — **Inbox messages vs notification campaigns** — split immutable per-customer deliveries from editable admin broadcasts (see §4)

**Later**

- **M10** — Admin–customer chat
- **M12** — Notification preferences _(depends on **M8a.3**)_
- **M13** — Marketing & growth engine (+ **M6d** abandoned-cart email)
- **M9** — Polish & growth (gallery, SEO, performance)
- **M6e** — **Guest cart & identity sync** — server-side guest carts (cookie id), parity with signed-in `CartSnapshot` for counts, abandon detection, sign-in merge (see §4)

**Deferred — fabrication detail / hardware**

- **M11a** — Optional fabrication sub-stages (queued, printing, wash, …) — admin-only detail inside **processing**; not required for customer-facing four stages
- **M11b** — Raspberry Pi SDCP bridge (optional)
- **M14** — ForgeLink™ hardware MVP

**Post-v1 major release (after current roadmap)**

- **M20** — **Cloud portability layer** — provider ports/adapters so email, storage, auth, and data access are not hard-wired to AWS (see §4). Ship incrementally; Amplify remains the default backend until adapters are proven.

§4 below has implementation specs for milestones that are not yet shipped.

---

## 4. Milestones — implementation specs for Cursor

### M3b — Live payments (Stripe + Google Pay)

**Status:** **Production verified** (2026-05-31) — live Checkout, live-mode webhook, orders auto-`paid`, fulfillment fields on `Order`. **2026-06-14:** checkout **cancel + refund sync** — **production verified**.

**Goal:** Replace mock checkout with real Stripe payments while preserving the `PaymentProvider` abstraction.

**Scope:**
- Implement `StripePaymentProvider` in `packages/shared/`.
- Wire `checkoutService` to use Stripe when `VITE_APP_ENV=deployment`.
- Add Stripe Checkout session creation + redirect.
- Add webhook Lambda to update `Order.status` (`paid`, `cancelled`, `refunded`).

**Backend:**
- Add Stripe secrets to Amplify backend env (documented, not hardcoded).
- Add Lambda for Stripe webhooks:
  - Verify signature.
  - On successful payment, set `Order.status = "paid"` and `paymentProvider = "stripe"`.
  - On `checkout.session.expired`, set **pending** orders to **`cancelled`** (shared `order-shared/stripeOrderStatus.ts`; never overwrites `paid` / `refunded`).
  - On full `charge.refunded`, set **paid** orders to **`refunded`** (partial refunds leave status `paid` until **M16a**).
  - Use `externalSessionId` / `stripePaymentIntentId` to correlate.
- **`cancel-stripe-checkout`** Lambda + `cancelStripeCheckoutSession` mutation:
  - Called from `/checkout/cancel?session={CHECKOUT_SESSION_ID}` when the customer abandons Stripe Checkout.
  - Retrieves session by id; if not paid, marks the linked **pending** order **`cancelled`** (idempotent with webhook path).

**Frontend:**
- `checkoutService.ts`:
  - Use `StripePaymentProvider` when env is `deployment`.
  - Keep `MockPaymentProvider` for `local`.
- **`CheckoutCancelPage`** (`/checkout/cancel`):
  - On load with `?session=`, calls `cancelStripeCheckoutSession` so admin sees **Cancelled** without waiting for session expiry webhook.
  - Cart unchanged; user can return to `/cart`.

**Auth & data:**
- Do not store card data.
- Keep `Order` minimal as currently designed.

**Interim (pre-M15):** Address + phone collection on Stripe Checkout and basic fulfillment fields on `Order` may ship under M3b. **Paid shipping, profile management, and order shipping totals** belong to **M15 — Shipping** (do not hardcode production rates in the Lambda long-term).

**Cursor rules:**
- Do not change `PaymentProvider` interface shape.
- Do not change existing mock behavior.
- Only extend where needed.

**Acceptance (cancel + refund sync):**
- Customer clicks back/cancel on Stripe Checkout → lands on `/checkout/cancel?session=…` → pending order shows **Cancelled** in admin (~immediate after mutation).
- Stripe session expires without payment → webhook sets same pending order **Cancelled**.
- Already-**paid** order is never downgraded to cancelled by cancel redirect or expiry handler.
- Full refund in Stripe Dashboard → order **Refunded**; partial refund leaves order **Paid** (until M16a).

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
| **new_account** | Customer verifies email and signs in (`issueNewAccountWelcomeGrant`) | Next order; template expiry | **Once per user lifetime** (no re-issue) |

- **Favorite vs abandoned cart** — different triggers; both may exist for a user but only **one** wins at checkout (best savings → soonest expiry).
- **Unfavorite** (v1): unused grant remains until used/expired (no automatic revoke).

#### Notifications

- **v1:** **In-system** only (`Notification` kind `marketing` or `promo`) — favorite, thank-you, abandoned cart, admin-assigned.
- **Later (M6d / M13):** **Email** for **abandoned cart** recovery (in-system alone does not bring users back off-site).
- **Later (M8a.3):** Split **immutable inbox deliveries** from **editable admin campaigns** — see §4 **M8a.3** (today promo/order/vault messages share the same mutable `Notification` table as admin broadcasts).

#### Data models (Amplify)

**`PromoTemplate`** (admin CRUD):
- `name`, `kind` (`percent` | `fixed`), `percent` or `amountCents`, `active`
- `defaultExpiresInDays` or indefinite flag
- `source` enum or flags for which issuance paths use this template

**`PromoGrant`** (system + admin):
- `templateId`, `userId`, `source` (`admin` | `thank_you` | `favorite` | `abandoned_cart` | `new_account`)
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
| **M6 (new-account)** | `useForNewAccount` template + `new_account` grant on verify/sign-in — **production verified** 2026-06-20 |
| **M6c** | Server `CartSnapshot`, abandon detection, grant + in-system notify on return |
| **M6d** | Abandoned-cart email (with M13) |
| **M6e** | Guest identity (cookie) + server guest cart sync; merge on sign-in; `activeCartCount` + abandon paths include guests |

**Cursor rules:**
- Single grant per order; never stack with shipping-profile free shipping as a “promo.”
- Template `active: false` must not delete or invalidate outstanding grants.
- Prefer server-side grant resolution in Lambda over client-only validation.

**Acceptance (M6 core):**
- Admin creates template, assigns grant to user; user sees discount on cart with expiry; checkout total matches Stripe; order stores promo fields.
- Paid order issues thank-you grant; notification appears in account inbox.
- Deactivating template stops new thank-you grants; existing unused thank-you grant still redeems.

---

### M6e — Guest cart & identity sync (backlog)

**Status:** **Planned** — after **M6d** / **M13** marketing email path (or in parallel if abandon parity is prioritized). **Today:** guest carts live in **browser `localStorage` only**; `syncCartSnapshot` requires Cognito auth; `Product.activeCartCount`, abandoned-cart detection, and account promos only see **signed-in** shoppers.

**Goal:** No behavioral gap between guest and signed-in shoppers for **server-visible cart state** — same snapshot sync, admin cart counts, idle/abandon tracking, and clean **merge on sign-in/register**. Checkout promos remain **account grants** at payment time (M6 business rule); guests still **sign in to redeem** offers, but their cart history and abandon eligibility are not lost while browsing signed out.

#### Why a cookie (or equivalent)

Guests have no Cognito `sub`. The backend needs a **stable anonymous identifier** across page loads and return visits (until expiry). Options:

| Approach | Notes |
|----------|--------|
| **HttpOnly cookie** (recommended) | e.g. `efw_guest_id` = UUID; set on first visit if missing; sent automatically to guest-accessible sync API; harder to tamper than `localStorage` alone |
| **localStorage mirror** | Fallback if cookie blocked; same UUID; document as secondary |

**Yes — this requires persisting that id in the database** keyed by the cookie value, analogous to `CartSnapshot.userId` today.

#### Data model

Extend or parallel **`CartSnapshot`**:

| Option | Recommendation |
|--------|----------------|
| **A — widen `CartSnapshot`** | Add optional `guestId` (PK or GSI); exactly one of `userId` \| `guestId` set |
| **B — `GuestCartSnapshot` model** | PK `guestId`; same `lineItems`, `updatedAt`, `abandonedAt` fields |

Prefer **one sync code path** in Lambda with shared line-item normalization (`cart-shared/`).

**`guestId`:** opaque UUID v4; no PII. TTL / cleanup job for rows idle > N days (e.g. 90) so counts and storage do not grow forever.

#### API

- **`syncCartSnapshot`** (or **`syncGuestCartSnapshot`**) — `allow.guest()` + `allow.authenticated()`:
  - Authenticated: current behavior (`userId` from `sub`).
  - Guest: read `guestId` from **HttpOnly cookie** (Lambda reads cookie header) or accept `guestId` argument only when it matches verified cookie (do not trust client-only ids).
- Rate-limit / payload caps on guest sync (abuse hygiene).
- **`Product.activeCartCount`:** increment/decrement from **both** user and guest snapshots (one cart per `userId` or per `guestId`).

#### Frontend

- On app bootstrap: ensure guest cookie exists (edge/Lambda Set-Cookie on first API call, or lightweight guest-session endpoint).
- **`useCartSnapshotSync`:** run for **all** shoppers — signed-in uses `sub`; guest uses cookie-backed sync (same debounce as today).
- **Sign-in / register:** merge guest snapshot into user snapshot (union line items, prefer user cart on conflict); delete guest row; recompute cart counts; then issue abandon grant if idle rules fire post-merge.

#### Promos & notifications (parity scope)

| Feature | Guest after M6e |
|---------|-----------------|
| **Cart snapshot / idle timer** | Yes — server `updatedAt` |
| **Abandoned-cart grant** | Issue on **sign-in** when merged idle cart qualifies (or on return with cookie + later login) — still tied to `userId` |
| **Auto-apply promo at checkout** | Still requires **signed-in** account (M6) |
| **Thank-you / favorite grants** | Unchanged — need `userId` |
| **M18 price-change alerts** | Can key off guest snapshot until login, then migrate to user |

#### Admin

- **`Product.activeCartCount`** includes guest + signed-in carts (label optional: “In N carts” unchanged).
- Optional later: admin filter “guest vs account” carts — out of scope v1.

#### Security & privacy

- Cookie: `Secure`, `SameSite=Lax`, reasonable `Max-Age` (e.g. 365d).
- Do not store email/IP in guest snapshot.
- GDPR: document anonymous cart id in privacy policy; cleanup on TTL.

#### Out of scope (v1)

- Guest **checkout** without email (unchanged — Stripe collects email).
- Guest **promo redemption** without account.
- Cross-device guest sync without cookie (new device = new guest id until sign-in).

#### Acceptance

- Guest adds item → server row exists under `guestId` → admin product **cart count** +1.
- Guest removes item / clears cart → count −1.
- Guest returns days later (same cookie) → snapshot still drives abandon idle time.
- Guest signs in → guest snapshot merged into user cart; guest row deleted; counts unchanged net of duplicate cart.
- Signed-in behavior unchanged.

**Cursor rules:**
- Reuse `sync-cart-snapshot` Lambda patterns and `cart-shared/productCartCounts.ts`; do not fork a second count implementation.
- Cookie must be validated server-side; never accept arbitrary `guestId` from SPA without cookie match.
- Merge-on-login must be idempotent.

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
| **Free US / flat international** | International `amountCents` + `additionalItemCents`; US free; `allowedCountries` must include `US` + international codes | Two Stripe shipping options: **US — Free shipping** and **International — {profile name}** (customer selects matching option) |

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

**Status:** **Shipped** (2026-06-22) — admin Stripe refunds (**M16a**), customer return requests (**M16b**), exchange workflow notes (**M16c**). Policy at `/shipping-returns`.

**Goal:** Support your published policy (30-day returns on new products, buyer pays return shipping, refund within ~2 days of receipt) with admin tools and optional customer self-service — without building a full RMA/ERP.

**Why after M11:** Return eligibility starts at **delivery**. M11’s **shipped** stage + `deliveredAt` make the 30-day window enforceable in software. Refunds can ship earlier as admin-only if needed.

#### Three concepts (different complexity)

| Concept | What it is | Build approach |
|---------|------------|----------------|
| **Refund** | Money back via Stripe | Lambda + admin UI; webhook sync |
| **Return** | Physical item coming back | `ReturnRequest` workflow; admin approve → receive → refund |
| **Exchange** | Replace item / variant | Mostly **operational** — admin notes + partial refund or new checkout link; no automated swap checkout in v1 |

#### Prerequisites (gap today)

- `Order.stripePaymentIntentId` is set on paid checkout (2026-06-11) — refunds correlate via PaymentIntent metadata + stored id.
- Order `status` includes `cancelled` and `refunded`; **webhook + cancel redirect sync** shipped (2026-06-14).
- **M16a–c shipped** (2026-06-22): `createStripeRefund`, return requests, admin + customer UI.

#### Phase A — Admin Stripe refunds (M16a) — **shipped**

**Backend:**
- Webhook: **`charge.refunded`** sync — **done** (partial + full via `refundedCents`).
- Admin-only mutation `createStripeRefund` Lambda — **shipped**.
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

#### Phase B — Return requests (M16b) — **shipped**

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

#### Phase C — Exchanges (M16c, light) — **shipped**

- Return reason **`exchange`** + admin workflow checklist (no automated inventory swap).
- Admin: create manual **replacement order** (future) or send **one-time discount code** (M6) for difference.
- Document in admin UI: “Exchanges are handled case-by-case — approve return, then re-ship or refund difference.”

#### Phase D — Customer pre-ship cancellation (M16d) — **shipped** (2026-06-22)

**Goal:** Customer cancels any **paid, not-yet-shipped** order from **Account → Order details**; full refund issued automatically.

**Eligibility:** `status === paid`, fulfillment **not** `shipped`, no `shippedAt`, refundable balance > 0, order belongs to signed-in customer.

**Backend:** `cancelCustomerOrder` mutation → `issueOrderRefund` (full amount, `source: customer_cancel`, Stripe `requested_by_customer`).

**Policy:** `/shipping-returns` — cancellations before shipment; returns after ship.

**Acceptance:** Customer cancels while order is in Received/Processing → refunded in Stripe + order shows **Cancelled**; after ship, cancel UI hidden, return flow only.

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

### M8a.3 — Inbox messages vs notification campaigns

**Status:** **Planned** — after **M9a**; **before M12** (preferences need a clear split between broadcast campaigns and per-customer inbox).

**Depends on:** **M8a.2** (shipped — single `Notification` table + inbox UI), **M6** (promo grant notifications), **M11** (order fulfillment notifications).

**Goal:** Fix the conflation in **M8a.2** where one `Notification` model serves two different purposes:

1. **Admin broadcast campaigns** — editable, schedulable, shown to all signed-in customers (or filtered later by **M12**).
2. **Issued inbox deliveries** — immutable snapshots of what a **specific customer** was told when an event fired (promo grant, order status, vault access, admin-issued grant).

Today, system-issued rows appear in **Admin → Notifications** as editable entries. Editing retroactively changes what customers see in **Account → Notifications**, which is wrong for event-driven messages. There is also no way to tell admin-created broadcasts from auto-generated inbox lines (`kind: marketing` is used for both).

#### Design principles

| Concern | Campaign (broadcast) | Inbox message (issued) |
|---------|----------------------|-------------------------|
| **Mutability** | Admin may edit title/body, schedule, deactivate | **Immutable** after create — historical record |
| **Audience** | All signed-in users (no `userId`) | One `userId` per row |
| **Created by** | Admin UI | System on event (promo, order, vault, …) |
| **Admin UI** | CRUD on **Campaigns** page | **Read-only** list (optional); manage underlying grant/order instead |
| **Customer UI** | Appears in inbox while active + in schedule | Always in inbox until user dismisses/reads (no retroactive edit) |

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
- `source` — `promo_grant` \| `order_fulfillment` \| `vault` \| `admin_grant` \| `cart_price` \| `campaign` (if fan-out from campaign is added later)
- `promoGrantId?`, `orderId?`, `campaignId?` — optional links for admin drill-down
- `createdAt` (implicit)

**`InboxMessageRead`** _(migrate from `NotificationRead`)_:

- `inboxMessageId`, `userId`, `readAt` — composite PK

**Deprecation:** Remove or stop writing to legacy `Notification` / `NotificationRead` after migration. One-time script or dual-read transition during deploy.

#### Issuance paths (write `InboxMessage`, not `Notification`)

| Event | `source` | `kind` | Link |
|-------|----------|--------|------|
| Favorite / thank-you / abandon-cart grant | `promo_grant` | `marketing` | `promoGrantId` |
| Admin issue grant (notify on) | `admin_grant` | `marketing` | `promoGrantId` |
| Order fulfillment transition (**M11**) | `order_fulfillment` | `order` | `orderId` |
| Vault access granted | `vault` | `system` | — |
| Cart price change (**M18**, future) | `cart_price` | `marketing` or `order` | `productId?` |

Lambdas / services to update: `promo-shared/grantIssuance.ts`, `order-shared/fulfillment.ts`, `notificationService.ts` (`createPromoGrantNotification`, `createVaultAccessGrantedNotification`), `promoGrantService.issuePromoGrant`.

#### Customer inbox

- **`listCustomerNotifications`** → query active **campaigns** (schedule + `active`) **plus** user's **`InboxMessage`** rows; merge and sort by date.
- Campaigns: live reference to `NotificationCampaign` row (edits affect not-yet-seen viewers — acceptable for broadcasts).
- Issued messages: read from `InboxMessage` snapshot only.

#### Admin UI

- **`/admin/notifications`** → rename or subtitle **“Campaigns”** — CRUD **only** `NotificationCampaign`; remove edit links for issued inbox rows.
- **Issued inbox (read-only):** optional `/admin/inbox` or section on promo template / customer lookup — list `InboxMessage` with `source`, recipient, timestamp; **no** edit/delete of body (revoke grant / advance order instead).
- **Issued grants** table (**M6**) remains the control plane for promo offers.

#### Migration

- Rows with `userId` set → `InboxMessage` (infer `source` from `kind` + title heuristics or default `promo_grant` for `marketing`).
- Rows without `userId` → `NotificationCampaign`.
- `NotificationRead` → `InboxMessageRead` (map notification id → inbox message id).
- Update `scripts/reset-promo-data.ts` for new table names.

#### Relationship to other milestones

- **M12** — preferences apply to **campaign** categories and optional **marketing** inbox; **order** / transactional inbox may stay mandatory.
- **M18** — cart price alerts write `InboxMessage`, not `Notification`.
- **M6d / M13** — abandoned-cart **email** is separate channel; in-app line remains `InboxMessage`.

#### Cursor rules

- **Never** update `title`/`body` on an existing `InboxMessage` after create.
- Do not list issued inbox rows on the campaigns edit screen.
- Keep promo grant + order notification **copy composition** at write time (snapshot), same strings as today.
- Campaign fan-out to per-user snapshots is **out of scope** v1 — campaigns stay live-reference for all viewers.

#### Acceptance

- Admin creates a **campaign** → all signed-in customers see it in inbox; admin can edit campaign copy; customers see updated text (live campaign behavior).
- Promo grant issued → **one** `InboxMessage` for that user; admin **cannot** edit it from campaigns UI; text unchanged if admin edits promo template.
- Order **shipped** → immutable `InboxMessage` with tracking copy; links to order detail.
- Account inbox badge + read/unread works with `InboxMessageRead`.
- No issued system messages appear as editable rows in **Admin → Campaigns**.

---

### M9a — Initial UX polish

**Status:** **Shipped** (2026-06-16) — scroll-to-top on forward nav (2026-06-13); toasts, cart badge bump, PDP/cart/favorites feedback, checkout redirect banner, account form `PageFeedback`, cancel-page sync banners.

**Shipped (2026-06-13, see §3.1):** forward-navigation scroll reset (back/forward preserves position).

**Shipped (2026-06-16):** global toast + `aria-live`; cart icon badge bump; PDP add-to-cart toast; favorites save/unsave toasts; cart loading/empty/error/unavailable-line banners; checkout “Forging…” + redirect status; login/register/notifications form feedback; checkout cancel sync feedback.

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
- **SEO / meta tags / structured data**:
  - Add per-route `<title>` and meta description.
  - OG tags for key pages (home, PDP).
  - **`sitemap.xml`** — public routes + `/shop/:slug` PDP URLs (exclude vault unless public).
  - **Canonical URLs** on PDP and key landing pages.
  - **Schema.org JSON-LD** (Google structured data for product discovery):
    - **`Product`** on each public PDP — `name`, `description`, absolute `image`, `sku` (slug or id), `brand`, `offers` (`price`, `priceCurrency`, `availability` from `inStock`, `url`).
    - **`Organization`** (+ optional **`WebSite`**) on home — business name, site URL, logo.
    - Optional **`ItemList`** on `/shop` (product URLs only; v1 nice-to-have).
  - Validate with Google Rich Results Test + Search Console after deploy.
  - **Public shop catalog only** — do not emit Product JSON-LD for vault-gated PDPs.
  - When **M19** catalog sales ship, JSON-LD `offers.price` must match the **live sale price** on PDP/checkout.
- **Performance**:
  - Ensure images use appropriate sizes and lazy loading.
  - Confirm CDN usage via Amplify (no code change needed, but ensure URLs are correct).
- **Newsletter**:
  - Wire home page newsletter form to a provider (Mailchimp, etc.) or create a simple DynamoDB-backed `NewsletterSubscriber` model (minimal PII: email only).

**Not in M9 (see M13):** Google Merchant Center **product feed** (XML/TSV/API) for Shopping listings — separate from on-page JSON-LD. JSON-LD is sufficient for crawl/rich-result signals; Merchant feed is optional later if you want Shopping ads / free listings.

**Cursor rules:**
- Keep SPA structure; no SSR.
- Use React Helmet or a simple head manager pattern if already present; otherwise, introduce a minimal solution.
- JSON-LD via a small component (e.g. `ProductStructuredData`) — absolute image/page URLs from `SITE_URL`; reuse existing product fields, no new backend models for v1.

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

### M11 — Customer order status + shipping

**Status:** **Production verified** (2026-06-23). See **§3.3** for sign-off summary. Regression: [docs/qa-test-plan.md](../docs/qa-test-plan.md) §19.

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

- Reuse `Notification` (`kind: order`) for v1 — **M8a.3** will migrate order inbox rows to immutable `InboxMessage` snapshots.
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

**Depends on:** **M8a.3** (campaign vs inbox split — preferences target **campaign** categories and optional **marketing** inbox; transactional `order` inbox may remain mandatory).

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

**Goal:** Notify signed-in customers (in-system **`InboxMessage`**, kind `marketing` or `order` — see **M8a.3**) when an item **in their server cart snapshot** has a **price decrease** (sale or markdown) or **price increase** (list price change).

**Depends on:** **M6c** (`CartSnapshot`), **M8a.3** (`InboxMessage`), **M19** (or minimal `compareAtCents` / `salePriceCents` on `Product` if M19 is phased).

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

**Status:** Planned — **after M21**, **before M18** (price alerts need stable sale fields from M19).

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

### M21 — Printing as a Service

**Status:** Planned — **after M16**, **before M19**. **M11** + **M15** + checkout are sufficient foundations.

**Goal:** Let customers order **prints of their own STL files** through the normal storefront: policy acknowledgment → configure print → add to cart → Stripe checkout → standard **M11** fulfillment. Entry from the existing home-page card (today disabled **Custom Forge**).

**Depends on:** **M3b** (checkout), **M11** (order + fulfillment), **M15** (shipping on checkout). Optional: **M20b** (`BlobStorageProvider`) — v1 may use Amplify Storage + S3 prefix like sculptor uploads.

**Out of scope (v1):**

- Bespoke sculpt **commissions** (design-from-scratch) — keep as email/`CONTACT_EMAIL`; do not conflate with print-service flow.
- Automated mesh repair, volume-based instant quotes, or printability scoring.
- Customer file retention after job completion (must delete — see policy + lifecycle below).
- Re-selling or listing customer STLs in the catalog.
- **M11a** / **M11b** printer automation (admin prints manually in v1).

#### Customer flow

1. **Home** (`HomePage`) — enable the featured card CTA (retitle/copy to **Printing as a Service**; link to `/print`).
2. **`/print`** — single page (or policy + configurator sections):
   - **Policy** (visible before submit; require explicit acknowledgment checkbox):
     - Customer **owns or has rights** to print the file; no infringing / unlicensed third-party IP.
     - Emperium Forgeworks **does not keep a copy** of the STL after the print job is complete and shipped (operational deletion — see backend).
     - We **do not re-sell** the physical print or the digital file once the order is complete.
     - Standard shop terms / liability limits apply (link to **Forge Terms**).
   - **Configurator** — all required before **Add to cart**:
     | Field | Notes |
     |-------|--------|
     | **Size** | Admin-defined tier (e.g. 32mm, 75mm, 100mm, custom band) — drives **price** |
     | **Resin type** | Admin-defined options (e.g. standard, tough, flexible) — may adjust price |
     | **Resin color** | Admin-defined options per type or global palette |
     | **STL file** | `.stl` only; max size cap (env/config); one file **per cart line** |
   - Live **price preview** from selected size/type surcharges.
   - **Add to cart** → existing `/cart` → **M3b** checkout → **M11** order detail + admin queue.

3. **Auth:** Require **signed-in customer** for upload + checkout (guest STL upload deferred to **M6e**).

#### Cart & checkout integration

Reuse existing cart/checkout — no separate payment path.

1. **Cart line shape** — extend `CartLine` / localStorage with optional `printService` payload:
   - `uploadId`, `originalFileName`, `storagePath`
   - `sizeTierId`, `sizeLabel`
   - `resinTypeId`, `resinTypeLabel`
   - `resinColorId`, `resinColorLabel`
   - `priceCents` (resolved at add-to-cart from admin pricing table)
   - `productId` / `slug` — point at a dedicated catalog row (e.g. `printing-as-a-service`) **or** synthetic id with admin base SKU (prefer **one hidden `Product`** for shipping profile + title in order emails).

2. **Line identity** — `lineKey` includes `uploadId` so two prints of the same file/config are separate lines.

3. **Checkout** — extend `CheckoutCartLine` (and order `lineItems` JSON snapshot) with the same `printService` fields + `variantLabel` summary for display (e.g. `75mm · Tough · Charcoal`).

4. **Catalog validation** — print-service lines **skip** standard PDP catalog checks (`getCartLineIssues` / M17 rules); validate against live **PrintServiceConfig** instead.

5. **Promos** — **M6** grants apply to print-service lines like any other line (one grant per order unchanged).

#### Backend & storage

1. **`PrintServiceConfig`** (model or admin-editable singleton JSON):
   - `active: boolean`
   - `sizeTiers[]`: `{ id, label, priceCents, sortOrder }`
   - `resinTypes[]`: `{ id, label, priceDeltaCents?, sortOrder }`
   - `resinColors[]`: `{ id, label, resinTypeIds?, sortOrder }`
   - `maxFileBytes`, `acceptedExtensions: ["stl"]`
   - Policy body copy (markdown or structured bullets) for `/print` page.

2. **S3 / Storage** — new prefix `print-jobs/{userId}/{uploadId}/…` in `productImages` bucket (or dedicated prefix documented in `storage/resource.ts`):
   - **customer** group: `write` + `read` own prefix only (use identity-scoped path or presigned upload Lambda).
   - **admin** group: `read` + `delete` for fulfillment.
   - Prefer **presigned upload** Lambda if path-level IAM is awkward.

3. **`purgePrintJobFile`** — Lambda (or fulfillment hook):
   - On order **`fulfillmentStatus = shipped`** (or admin **Mark file purged**), delete STL object(s) for linked `uploadId`s.
   - Set `printService.filePurgedAt` on line snapshot; admin UI shows purge status.
   - Idempotent; log failures for manual cleanup.

4. **Support email** — include print params + admin download link (presigned GET, short TTL) in existing `notifySupport` line-item block.

#### Admin

1. **`/admin/print-service`** (or section under Settings):
   - Edit size tiers, resin types/colors, pricing, policy text, `active` toggle.
2. **Order detail** — for print-service lines:
   - Show config summary + **Download STL** (presigned).
   - Show **File purged** timestamp when lifecycle ran.
3. **Orders list** — optional badge/filter **Print job** (nice-to-have v1).

#### Frontend files (expected)

- `src/pages/PrintServicePage.tsx` — policy + configurator.
- `src/lib/printServiceUpload.ts` — STL upload helper (mirror `sculptorImageUpload.ts`).
- `src/services/printServiceConfigService.ts` — fetch config, resolve price.
- Extend `CartContext`, `CartPage`, `OrderLineItemRow`, checkout service for `printService` lines.
- `HomePage.tsx` — enable card → `/print`.
- `App.tsx` — route `/print`.

#### Cursor rules

- Do **not** add customer STLs to the public product catalog or Merchant feed (**M13**).
- Do **not** retain STL files beyond shipped + purge job (policy is contractual and technical).
- Keep print-service logic in dedicated modules; do not fork checkout Lambda into a second code path.
- Validate file type/size server-side in upload Lambda, not only client-side.

#### Acceptance

- Home card navigates to `/print`; disabled state removed when `PrintServiceConfig.active`.
- Customer cannot add to cart until policy checked + all four parameters set + valid STL uploaded.
- Cart shows human-readable config; checkout total matches admin pricing table.
- Paid order appears in admin with downloadable STL and print parameters on line items.
- After admin marks **shipped**, purge job removes STL from storage; admin sees **File purged**; repeat purge is safe.
- Customer order detail shows config summary; no public link to STL file.

---

### M13 — Marketing & growth engine (new)

**Status:** Planned — **after M9** (JSON-LD / SEO on-site) and core commerce milestones (**M19** sales pricing affects Merchant offers).

**Goal:** Turn the site into a growth-ready ecommerce platform.

**Scope:**

1. **Google Merchant Center — product sync (preferred: API)**
   - **Long-term approach:** push catalog updates via **Google Merchant Center Product API** (successor to Content API for Shopping) — insert/update/delete products when admin publishes or changes a `Product` (price, availability, image, title, link).
   - **Why API over file feed:** stays in sync when you edit in admin; no stale XML; fits Amplify Lambda on product save or scheduled reconcile job.
   - **Bootstrap option:** one-time or nightly **XML/JSON feed** from `Product` data if API credentials / Merchant account setup lag — same field mapping as API payloads.
   - **Required fields (typical):** `id`, `title`, `description`, `link`, `image_link`, `price`, `availability`, `condition`; `identifier_exists: no` for custom prints without GTIN when allowed.
   - **Exclude:** vault-gated SKUs unless intentionally listed in a separate Merchant feed.
   - **Ops:** Merchant Center account, domain + business verification, shipping/returns policies linked in MC (align with site legal pages).
   - **Depends on M9 JSON-LD?** No — on-page JSON-LD helps organic search; Merchant API is for **Shopping / free listings** surfaces. Both use the same underlying product fields.

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

### M20 — Cloud portability layer (post-v1 major release)

**Status:** **Planned** — start **after** milestones through **M14** / **M9** / **M13** (current roadmap) are shipped or explicitly deferred. Not a big-bang rewrite.

**Goal:** Reduce vendor lock-in to AWS primitives (Amplify Data, Cognito, S3, SES, Lambda wiring) by introducing **ports + adapters** — the same pattern as `PaymentProvider` in `packages/shared/`. The storefront and admin keep stable domain APIs; cloud-specific SDKs live behind narrow interfaces.

**Why now (documented, not implemented):** SES production approval friction and billing/tooling sprawl if each concern picks a one-off vendor without a shared abstraction. **M20** makes swaps (email, storage, auth, hosting) a configuration change + one adapter, not a repo-wide rewrite.

**Non-goals:**
- Multi-cloud active/active deployment in v1 of M20.
- Replacing React, Stripe, or GA4.
- Rewriting all Amplify models in one release.

#### Phased delivery (recommended order)

| Phase | Port | Today | Adapters (examples) | Lift |
|-------|------|-------|---------------------|------|
| **M20a** | `EmailProvider` | `order-shared/notifySupport.ts`, `notifyCustomer.ts` → SES | SES, Resend, Postmark, SendGrid, Azure ACS | **Small** — do first; unblocks customer email without SES prod |
| **M20b** | `BlobStorageProvider` | `storefrontStorage`, image upload helpers → S3 | S3, Azure Blob | Medium |
| **M20c** | `AuthProvider` / session | `customerAuth`, `adminAuth`, Cognito groups | Cognito (default), Entra External ID, Auth0 | Large — user migration risk |
| **M20d** | `DataRepository` / domain stores | `src/services/*` → AppSync `generateClient` | Amplify Data (default), REST over Functions, future ORM | **Largest** — strangler per domain (orders, products, promos) |

**Rule:** App code calls `sendOrderEmail()`, `uploadProductImage()`, `getOrderById()` — not `SESClient`, `S3Client`, or `client.models.Order.get`.

#### Package layout (target)

Extend `packages/shared/` (or add `packages/platform/`):

```
packages/shared/src/
  contracts/
    payments.ts          # exists — PaymentProvider
    email.ts             # M20a — EmailProvider
    storage.ts           # M20b
  providers/
    ses/ resend/ …       # email adapters
    s3/ blob/ …          # storage adapters
```

Lambdas receive a factory: `createEmailProvider(env)` — same env keys pattern as `createPaymentProvider`.

#### Frontend

- Keep `src/services/` as the **domain boundary**; services must not import `@aws-sdk/*` or `aws-amplify/data` directly where a port exists.
- `amplifyDataClient.ts` becomes the **Amplify adapter** behind repositories until M20d migrates each service.

#### Migration strategy

1. **Strangler fig** — one port at a time; default adapter = current AWS implementation (no behavior change on merge).
2. **Contract tests** — each adapter implements the same interface; smoke test send/upload/read.
3. **No dual-write** unless migrating auth or data (M20c/d); email and storage are safe to swap per env.

#### Email & billing sprawl (pragmatic note)

- Stripe + AWS + one transactional email vendor is normal for a shop; email is typically **low volume / low cost** (often free tier).
- **M20a** keeps email on **one interface** so you are not locked to SES *or* scattered one-off SDK calls.

#### Cursor rules (when M20 starts)

- New cloud integrations **must** go behind a port in `packages/shared` (or `packages/platform`).
- Do not delete Amplify backend until M20d coverage is explicit per domain.
- Section §7 “do not replace Amplify” applies **until M20** is active for that concern.

#### Acceptance (M20a — email only)

- `notifySupport` / `notifyCustomer` call `EmailProvider.send()` only.
- SES adapter passes existing production behavior.
- Second adapter (e.g. Resend) works via env switch without code changes in order fulfillment.
- No `@aws-sdk/client-ses` imports outside the SES adapter module.

#### Acceptance (M20 complete — long-term)

- Domain services in `src/services/` have zero direct Amplify model imports for migrated domains.
- Documented adapter matrix: which ports exist and which cloud backs production.
- Roadmap features (M6d email, M11 customer email, M13) use `EmailProvider` only.

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

- Do not replace Amplify with a custom backend **except where a milestone explicitly scopes it (e.g. M20 ports/adapters).**
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

