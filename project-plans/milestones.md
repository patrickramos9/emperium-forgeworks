# Milestones

Roadmap in priority order. Each milestone should be shippable independently where possible (incremental deploys).

**Last updated:** 2026-05-25 (M7 cleanup + M8 scope)

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

**M2 closure (ops):** ~~After each deploy, smoke-test admin save, `/shop` catalog, PDP variants/images/description.~~ **Complete** — production smoke-test passed 2026-05-23.

---

## M3 — Cart & checkout

**Goal:** Reliable purchase flow with minimal PII; **guest checkout remains available.**

Split into cart work (can ship now) and live payments (blocked until business can complete Stripe onboarding).

### M3a — Cart UX ✅

| Task | Notes |
|------|--------|
| Harden cart UX | Persistence, empty states, quantity limits |
| Order privacy review | Minimal line-item snapshots; guest `Order.create` |
| Pre-checkout validation | Stock, price drift vs live catalog |

**Exit criteria:** Cart behaves well on mobile/desktop; mock checkout still creates orders for fulfillment testing. **Met.**

### M3b — Live payments ⏳ *pinned — waiting on EIN*

**Blocker:** Stripe account setup requires EIN (or equivalent business verification). Mock checkout remains in all environments until unblocked.

| Task | Notes |
|------|--------|
| Stripe + `StripePaymentProvider` | `createCheckoutSession`, secrets in Amplify/Lambda |
| **Google Pay** | Enable via Stripe Checkout / Payment Element (no separate processor); same webhook flow as cards |
| Lambda checkout + webhook | Confirm payment → `Order.status` |
| Production env | `VITE_APP_ENV=deployment` + `STRIPE_*` in Amplify |

**Exit criteria:** Test purchase end-to-end (card + Google Pay); order visible in Stripe Dashboard.

**Does not include:** customer accounts (M4), promo codes (M6), admin dashboard (M5).

---

## M4 — Customer accounts ✅

**Goal:** Shoppers **may** register and sign in; **guest checkout still works.**

| Task | Notes |
|------|--------|
| Cognito customer auth | `customer` group via post-confirmation Lambda |
| Account UI | Sign up, sign in, profile, order history |
| Order history | `Order.userId` + owner-scoped read |
| Storefront | Header account menu; post-checkout account CTA |

**Schema:** `Order.userId` optional; guest create; admin read/update.

**Exit criteria:** Guest completes checkout without account; signed-in user sees order history. **Met** (production verified).

**Depends on:** M3a (orders exist — mock checkout is sufficient until M3b).

---

## M5 — Admin portal v2 + stats ✅

**Goal:** Cohesive admin experience with operational visibility.

| Task | Notes |
|------|--------|
| Admin shell | Sidebar/nav: Dashboard, Products, Orders; stubs for Promos, Vault, Settings |
| Products | List/edit in layout (unchanged CRUD) |
| Stats — sales | Revenue, order count, AOV, recent orders (mock labeled) |
| Stats — traffic | GA4 Data API dashboard (cards, trend, top/low-interest products) |
| Orders UI | List + detail; status update (admin `update` on `Order`) |
| Ops fixes | Admin group guard; 8h idle timeout; catalog auth for signed-in users |

**Exit criteria:** Admin dashboard shows purchase metrics; product management at least as capable as today, better organized. **Met** (production verified).

**Depends on:** M3a (orders); M3b for real revenue only.

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

**Depends on:** M3b (Stripe discounts).

---

## M7 — Hidden Vault + storefront cleanup ✅

**Goal:** Ship vault-exclusive catalog **and** polish navigation/copy so the public site matches the grimdark tone before adding more backend features.

### M7a — Storefront cleanup ✅

| Task | Notes |
|------|--------|
| Remove shop quick-add | Drop **Forge** button on [`ProductCard.tsx`](src/components/ProductCard.tsx); add-to-cart only from PDP |
| Hero CTA copy | Replace **Explore Arsenal** on [`HomePage.tsx`](src/pages/HomePage.tsx) — e.g. **Enter the Lair** (primary shop link) |
| Consolidate About | Remove **Process** nav/route; single **About** page at `/about` with existing forge-story content from [`ProcessPage.tsx`](src/pages/ProcessPage.tsx) |
| Remove Affiliated Forge | Delete NSMiniatures “Affiliated Forge” block from About (no affiliated forge yet) |
| Nav/footer links | [`Header.tsx`](src/components/Header.tsx), [`Footer.tsx`](src/components/Footer.tsx), [`App.tsx`](src/App.tsx) — redirect `/process` → `/about` |
| CTA headline | **Ready to Summon Your Fleet** → **Ready To Summon The Darkness?** on About |

**Exit criteria:** Shop cards link to PDP only; one About page; updated foreboding CTAs; no broken links. **Met.**

### M7b — Hidden Vault ✅

| Task | Notes |
|------|--------|
| Product flag | e.g. `vaultOnly`; exclude from public `/shop` queries |
| Unlock flow | Key entry UI; httpOnly cookie / session after success |
| Vault shop | `/vault` or filtered collection when unlocked |
| Admin | Vault products + key rotation (env or `VaultSettings` in DB) |
| Security | Hash key server-side; rate-limit attempts |

**Exit criteria:** Vault SKUs hidden on `/shop` until key entered; purchasable via mock checkout when unlocked. **Met** (set `VAULT_ACCESS_KEY` secret + backend deploy).

**Depends on:** M2 catalog; M3a/M3b for purchases (mock OK until Stripe).

---

## M8 — Runtime content, reviews, sculptors & notifications 🎯 *next*

**Goal:** Replace hardcoded marketing content with admin-managed data; social proof from real orders; sculptor pages for partners.

**Depends on:** M5 admin shell (recommended).

### M8a.1 — Announcements ✅

| Task | Notes |
|------|--------|
| **Announcement** model | Title, body, dates, pinned, active — home + shop blocks |
| Admin publish/edit | Under M5 shell |
| Announcement rendering | Promo cards + system banner from runtime data |

**Exit criteria:** Admin can publish/edit announcements that render on storefront. **Met.**

### M8a.2 — Notifications (pending)

| Task | Notes |
|------|--------|
| **Notification** model | Lightweight inbox (e.g. system + admin broadcasts) |
| Avatar badge | Unread count on account avatar in [`Header.tsx`](src/components/Header.tsx) / [`AccountMenu.tsx`](src/components/AccountMenu.tsx) |

### M8b — Customer reviews (“Voices From The Void”)

| Task | Notes |
|------|--------|
| **Review** model | Linked to `Order` + `userId`; rating, text, optional display name; moderation flag |
| Account UI | **Review** button per eligible order row on [`AccountOrdersPage.tsx`](src/pages/account/AccountOrdersPage.tsx) |
| Review form | Post-purchase only (paid orders); one review per order |
| Home — runtime | Load approved reviews under **Voices From The Void** (rename section from hardcoded testimonials in [`HomePage.tsx`](src/pages/HomePage.tsx)) |
| Reviews index | **See all reviews** link beside subtitle → `/reviews` (full list page) |

### M8c — Sculptors (admin + public pages)

| Task | Notes |
|------|--------|
| **Sculptor** model | Name, logo (S3), description, MyMiniFactory URL, Patreon URL, social URLs (Instagram, Facebook, X, etc.) |
| Admin **Sculptors** | CRUD in admin nav (replace stub); logo upload |
| Sculptor detail page | `/sculptors/:slug` — bio, logo, outbound links |
| Home integration | Replace hardcoded `SCULPTORS` on home with live list; cards link to sculptor page |

**Exit criteria:** Admin can publish announcements and sculptors; customers can review orders; home shows live reviews + sculptor links; notification badge reflects unread count.

**Out of scope for M8:** Etsy sync; automated review solicitation emails (manual post-order review button only).

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
M1 → M2 → M3a ─┬→ M4
                ├→ M5 → M8 (content, reviews, sculptors) → M9
                ├→ M6 (needs M3b)
                └→ M3b (Stripe + Google Pay) ⏳ EIN
         M2 → M7a (cleanup) → M7b (vault)
```

| Phase | Depends on |
|-------|------------|
| M3a | M2 |
| M3b | M2; **EIN** for Stripe onboarding |
| M4 | M3a |
| M5 | M3a (UI); M3b (real revenue) |
| M6 | M3b |
| M7a | — (frontend only) |
| M7b | M2; M3a or M3b for checkout |
| M8 | M5 admin shell; M4 for reviews |
| M9 | — |

---

## Quick reference: what is *not* in each phase

| Phase | Out of scope |
|-------|----------------|
| M2 | Stripe, accounts, promos, vault, admin dashboard |
| M3a | Live payments, accounts, promos, vault, admin stats |
| M3b | Accounts, promos, vault, admin stats |
| M4 | Promos, vault, admin dashboard |
| M5 | Stripe implementation, promos, vault unlock |
| M6 | Vault, customer accounts |
| M7a | Vault, reviews, sculptors |
| M7b | Promo codes (core vault only) |
