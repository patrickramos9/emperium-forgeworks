> **Superseded.** Use [cursor-roadmap.md](../cursor-roadmap.md) for active development.

# Milestones

Roadmap in priority order. Each milestone should be shippable independently where possible (incremental deploys).

**Last updated:** 2026-05-28 (M8a.2 notifications complete; M10–M12 added)

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

## M8 — Runtime content, reviews, sculptors & notifications 🎯 *in progress*

**Goal:** Replace hardcoded marketing content with admin-managed data; social proof from real orders; sculptor pages for partners.

**Depends on:** M5 admin shell (recommended).

### M8a.1 — Announcements ✅

| Task | Notes |
|------|--------|
| **Announcement** model | Title, body, dates, pinned, active — home + shop blocks |
| Admin publish/edit | Under M5 shell |
| Announcement rendering | Promo cards + system banner from runtime data |

**Exit criteria:** Admin can publish/edit announcements that render on storefront. **Met.**

### M8a.2 — Notifications ✅

| Task | Notes |
|------|--------|
| **Notification** model | Lightweight inbox (system + admin broadcasts) |
| **NotificationRead** model | Per-user read state |
| Admin publish/edit | `/admin/notifications` — CRUD, schedule, sort order |
| Customer inbox | `/account/notifications` — list, mark read |
| Avatar badge | Unread count on account avatar in [`AccountMenu.tsx`](src/components/AccountMenu.tsx) |
| Per-user targeting | Optional `userId` on `Notification` — broadcast when unset |
| Vault grant trigger | Auto system notification when admin grants or re-enables Hidden Vault access |

**Exit criteria:** Admin can publish notifications; signed-in customers see inbox + unread badge; targeted messages reach only the intended user. **Met** (production verified).

### M8b — Customer reviews (“Voices From The Void”) ✅

| Task | Notes |
|------|--------|
| **Review** model | Linked to `Order` + `userId`; rating, text, optional display name; moderation flag |
| Account UI | **Review** button per eligible order row on [`AccountOrdersPage.tsx`](src/pages/account/AccountOrdersPage.tsx) |
| Review form | Post-purchase only (paid orders); one review per order |
| Home — runtime | Load approved reviews under **Voices From The Void** (rename section from hardcoded testimonials in [`HomePage.tsx`](src/pages/HomePage.tsx)) |
| Reviews index | **See all reviews** link beside subtitle → `/reviews` (full list page) |
| Admin moderation | [`AdminReviewsPage.tsx`](src/pages/admin/AdminReviewsPage.tsx) — approve / unapprove / delete |

**Exit criteria:** Admin can publish announcements and sculptors; customers can review orders; home shows live reviews + sculptor links; notification badge reflects unread count. **Reviews met** (sculptors pending M8c).

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

## M10 — Admin–customer chat

**Goal:** Direct messaging between admins and individual customers — either party can start a conversation.

| Task | Notes |
|------|--------|
| **Conversation** model | Links admin + customer (`userId`); metadata (subject, last message, unread counts) |
| **Message** model | Body, sender role (`admin` \| `customer`), timestamps; append-only thread |
| Customer UI | Inbox under account — start new thread or reply; unread badge (extend or separate from notifications) |
| Admin UI | Customer-scoped threads under admin shell — open from order detail or customer lookup; admin can initiate |
| Real-time (optional v1) | Polling acceptable for v1; AppSync subscriptions or similar later if needed |
| Auth | Customer owner-scoped read/write on own threads; admin full access |

**Exit criteria:** A customer can message the forge and see replies; an admin can open or start a thread with a specific customer; both sides see conversation history.

**Depends on:** M4 customer accounts; M5 admin shell.

---

## M11 — Print progress tracker

**Goal:** Give customers visibility into where their order is in the full fulfillment pipeline — from queue through fabrication (aligned with **The Ritual of Fabrication** on [`AboutPage.tsx`](src/pages/AboutPage.tsx)) to shipment.

| Stage | Label |
|-------|--------|
| 0 | **Queued** — order received; awaiting fabrication slot |
| 1 | **3D Printing** — Initialization |
| 2 | **Chemical Wash** — Purification |
| 3 | **Support Removal** — Extraction |
| 4 | **UV Curing** — Hardening |
| 5 | **Shipped** — dispatched to customer |

| Task | Notes |
|------|--------|
| **PrintJob** (or order-level) model | Link to `Order` / line items; current stage enum (six stages above); stage timestamps; optional admin notes |
| Admin workflow | Advance stage per order (or per line item) from orders UI; new orders enter at **Queued** |
| Customer UI | Progress stepper on order detail — all six stages; current highlighted, prior complete |
| Stage notifications | Each advance creates a targeted **system** notification (M8a.2) for the order owner |
| Copy / branding | Fabrication steps reuse About ritual names; **Queued** and **Shipped** use forge-appropriate tone |

**Exit criteria:** Admin advances an order from **Queued** through fabrication to **Shipped**; customer sees live six-step progress on their order; each stage change delivers an inbox notification.

**Depends on:** M4 order history; M8a.2 notifications.

### M11b — Raspberry Pi printer bridge (optional, recommended)

**Goal:** Automate **3D Printing** stage updates from a **Saturn 4 Ultra** (or other SDCP v3 Elegoo) on the shop LAN — without exposing the printer to the public internet.

**Why a Pi:** The printer speaks **SDCP** locally (UDP discovery on port 3000, WebSocket status on port 3030). Amplify/Lambda cannot reach a private LAN IP; a always-on **Raspberry Pi** on the same network acts as a trusted outbound agent.

```text
Saturn 4 Ultra (192.168.x.x)
    ↕ SDCP WebSocket (layer %, idle/printing, filename, errors)
Raspberry Pi — “forge-bridge” service
    ↕ HTTPS (API key or service token)
Amplify API → PrintJob stage + customer notification (M8a.2)
```

| Task | Notes |
|------|--------|
| **Pi setup** | Raspberry Pi 4/5 on shop Wi‑Fi/Ethernet; static IP or DHCP reservation for Pi + printer |
| **Bridge service** | Small daemon (Python or Node) — SDCP client ([`elegoo-link`](https://github.com/ELEGOO-3D/elegoo-link), [`sdcp`](https://github.com/blakejrobinson/sdcp), or community libs); reconnect + heartbeat |
| **Order mapping** | Link active print to store `Order` / `PrintJob` — e.g. match Chitubox filename, admin-assigned job ID, or QR at print start |
| **Auto stage rules** | **Queued → 3D Printing** when SDCP reports print started; **3D Printing → Chemical Wash** when print completes successfully (optional confirm in admin UI) |
| **Manual stages unchanged** | Wash, support removal, UV cure, **Shipped** remain admin-driven (printer has no visibility) |
| **Backend endpoint** | Authenticated `PATCH` (or custom mutation) for bridge only — rotate API key; idempotent stage updates |
| **Ops** | `systemd` unit, logs, alert if Pi or printer offline; secrets in `/etc/forge-bridge.env` (not in git) |
| **Security** | Pi initiates outbound HTTPS only; never port-forward 3030; separate bridge credential from admin Cognito |

**Exit criteria:** Starting a print on the Saturn advances the linked order to **3D Printing** without admin clicks; completing a print can advance to **Chemical Wash** (if enabled); failures surface in admin logs; wash→ship stages still manual.

**Depends on:** M11 core (PrintJob model + stage API); shop LAN + Saturn 4 Ultra on SDCP v3 firmware.

**Out of scope for M11b:** Multi-printer farm orchestration; cloud MQTT via Elegoo account; auto **Shipped** from carriers.

**Future product opportunity:** Package the Pi bridge as a **B2B offering** for other resin print shops — preconfigured hardware + forge-bridge software, multi-printer support, and a lightweight admin pairing UI. Emperium Forgeworks dogfoods it first (M11b); productization (billing, onboarding, white-label) is a separate milestone after the in-house bridge is stable.

---

## M12 — Notification preferences

**Goal:** Let signed-in customers control which notification categories they receive.

| Task | Notes |
|------|--------|
| **NotificationPreference** model | Per `userId` — toggles by channel or kind (e.g. `system`, `order`, `marketing`, `print_progress`, `chat`) |
| Account settings UI | Section on account or dedicated `/account/settings` — opt in/out per category |
| Delivery respect | `listCustomerNotifications` / triggers skip disabled kinds; print tracker and future automations honor prefs |
| Defaults | All categories on by default; transactional (order/print) may stay mandatory — decide at implementation |
| Admin broadcasts | Marketing opt-out must be respected; system/security messages policy TBD |

**Exit criteria:** Customer can disable specific notification types; disabled types no longer appear in inbox or drive badge count; new automations (M11, M10) check preferences before creating notifications.

**Depends on:** M8a.2 notifications.

---

## Dependency sketch

```text
M1 → M2 → M3a ─┬→ M4
                ├→ M5 → M8 (content, reviews, sculptors) → M9
                ├→ M6 (needs M3b)
                └→ M3b (Stripe + Google Pay) ⏳ EIN
         M2 → M7a (cleanup) → M7b (vault)
         M4 + M8a.2 → M10 (chat), M11 (print tracker), M11b (Pi bridge, optional), M12 (notification prefs)
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
| M10 | M4, M5 |
| M11 | M4, M8a.2 |
| M11b | M11 core; Raspberry Pi on shop LAN; Saturn 4 Ultra (SDCP v3) |
| M12 | M8a.2 |

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
| M8a.2 | Chat, print tracker, notification prefs (see M10–M12) |
| M10 | Real-time push (optional v1); email fallback |
| M11 | Per-line-item tracking; carrier tracking integration |
| M11b | Multi-printer scheduling; Elegoo cloud relay |
| M12 | Email/SMS channels (in-app prefs only for v1) |
