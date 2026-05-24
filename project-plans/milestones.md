# Milestones

Roadmap in priority order. Each milestone should be shippable independently where possible (incremental deploys).

**Last updated:** 2026-05-23

---

## M1 — Public preview (Option A) ✅

**Goal:** Site reachable on HTTPS with correct UI.

| Task | Notes |
|------|--------|
| Connect GitHub → Amplify Hosting | Branch `main`, use `amplify.yml` |
| Set build env vars | `VITE_APP_ENV=local`, `VITE_SITE_DOMAIN`, `VITE_SITE_URL` |
| Verify routes | `/`, `/shop`, PDP, `/process`, `/cart` |
| Custom domain | Route 53 + Amplify → emperiumforgeworks.com |

**Exit criteria:** Stakeholders can review the storefront on HTTPS without running locally.

---

## M2 — Backend in the cloud (Option B) ✅

**Goal:** Catalog and admin backed by DynamoDB + S3; no redeploy to change products.

| Task | Notes |
|------|--------|
| Fullstack `amplify.yml` + `pipeline-deploy` on `main` | Gen 2 CI |
| `npm run seed` against deployed API | Catalog in DynamoDB |
| Wire storefront to live `Product.list()` | Guest + signed-in admin clients |
| Cognito admin user + `admin` group | `/admin/login` |
| Admin: product CRUD + S3 image upload | List, create, edit, delete |
| Variations, gallery, PDP polish | Beyond original M2 scope (see below) |

**Exit criteria:** Change a product in admin → shop updates without frontend redeploy.

**Also delivered (M2+ enhancements):**

- Multi-image gallery (upload, drag-reorder), PDP carousel
- Etsy-style variation groups (Size / Type / Custom) + photo linking per option
- Multi-select variant picker on PDP; cart adds all selected combinations
- AWSJSON save fix (`variants` / `specs` as JSON strings)
- Description + Lore as separate PDP sections

**M2 closure (ops):** After each deploy, smoke-test admin save, `/shop` catalog, PDP variants/images/description.

---

## M3 — Cart & checkout 🎯 *next*

**Goal:** Reliable purchase flow with minimal PII; **guest checkout remains available.**

| Task | Notes |
|------|--------|
| Harden cart UX | Persistence, empty states, quantity limits |
| Stripe + `StripePaymentProvider` | `createCheckoutSession`, secrets in Amplify/Lambda |
| Lambda checkout + webhook | Confirm payment → `Order.status` |
| Order privacy review | Minimize stored email; Stripe for receipts where possible |
| Production env | `VITE_APP_ENV=deployment` |

**Exit criteria:** Test purchase end-to-end; order visible in Stripe.

**Does not include:** customer accounts (M4), promo codes (M6), admin dashboard (M5).

---

## M4 — Customer accounts

**Goal:** Shoppers **may** register and sign in; **guest checkout still works.**

| Task | Notes |
|------|--------|
| Cognito customer auth | Separate from `admin` group (e.g. `customer` group) |
| Account UI | Sign up, sign in, profile |
| Order history | Link `Order` to `userId` when signed in |
| Storefront | Header account menu; optional post-checkout account creation |

**Schema:** `Order.userId` optional; users read own orders, admin reads all.

**Exit criteria:** Guest completes M3 checkout without account; signed-in user sees order history.

**Depends on:** M3 (orders exist).

---

## M5 — Admin portal v2 + stats

**Goal:** Cohesive admin experience with operational visibility.

| Task | Notes |
|------|--------|
| Admin shell | Sidebar/nav: Dashboard, Products, Orders, Promo codes, Vault, Settings |
| Products | Migrate existing product list/edit into shell |
| Stats — sales | Revenue, order count, AOV, recent orders (from `Order`) |
| Stats — traffic | Analytics integration (Plausible, GA4, etc.) — not in DynamoDB natively |
| Orders UI | List + detail for fulfillment |

**Exit criteria:** Admin dashboard shows purchase metrics; product management at least as capable as today, better organized.

**Depends on:** M3 for meaningful sales stats.

---

## M6 — Promo codes

**Goal:** Apply promo codes in cart/checkout.

| Task | Notes |
|------|--------|
| `PromoCode` model | Code, percent/fixed, expiry, usage limits, active flag |
| Cart + checkout | Validate server-side; adjusted totals |
| Stripe | Coupons / Promotion Codes or pre-session discount |
| Admin | CRUD under M5 shell |

**Exit criteria:** Valid code reduces checkout total; invalid/expired codes error clearly.

**Depends on:** M3.

---

## M7 — Hidden Vault

**Goal:** Exclusive products visible only after unlocking with a **vault key** (access code).

| Task | Notes |
|------|--------|
| Product flag | e.g. `vaultOnly`; exclude from public catalog queries |
| Unlock flow | Key entry UI; httpOnly cookie / session after success |
| Vault shop | `/vault` or filtered collection when unlocked |
| Admin | Vault products + key rotation (env or `VaultSettings` in DB) |
| Security | Hash key server-side; rate-limit attempts |

**Exit criteria:** Vault SKUs hidden on `/shop` until key entered; purchasable via M3 checkout when unlocked.

**Depends on:** M2 catalog; M3 for purchases.

---

## M8 — Runtime content & operations

**Goal:** News and announcements without code changes. *(Former M4.)*

| Task | Notes |
|------|--------|
| **Announcement** / **News** model | Title, body, dates, pinned, active |
| Admin publish/edit | Home / shop announcement blocks |
| Storefront | Replace hardcoded announcement copy |

**Exit criteria:** Post from admin → appears on site immediately.

---

## M9 — Polish & growth

**Goal:** Growth and quality-of-life. *(Former M5.)*

| Task | Notes |
|------|--------|
| **Gallery** page | Separate from shop catalog |
| SEO / meta tags | Per route, OG images |
| Newsletter | Provider integration; minimal PII in DynamoDB |
| Performance | Image optimization, CDN for S3 |
| Etsy sync (optional) | Out of scope unless requested |

---

## Dependency sketch

```text
M1 → M2 → M3 → M4
              ↘ M5 → M8 → M9
              ↘ M6
         M2 → M7 (buy path needs M3)
```

| Phase | Depends on |
|-------|------------|
| M3 | M2 |
| M4 | M3 |
| M5 | M3 (sales stats) |
| M6 | M3 |
| M7 | M2; M3 for checkout |
| M8 | M5 admin shell (recommended) |
| M9 | — |

---

## Quick reference: what is *not* in each phase

| Phase | Out of scope |
|-------|----------------|
| M2 | Stripe, accounts, promos, vault, admin dashboard |
| M3 | Accounts, promos, vault, admin stats |
| M4 | Promos, vault, admin dashboard |
| M5 | Stripe implementation, promos, vault unlock |
| M6 | Vault, customer accounts |
| M7 | Promo codes, customer accounts |
