# Emperium Forgeworks — Project Context

## Business

**Emperium Forgeworks** is the online storefront for a 3D-printed miniatures business. We specialize in:

- **Sci-fi** — armored warriors, voidbound sentinels, tactical grimdark
- **Fantasy & dark fantasy** — heroes, undead, eldritch horrors, terrain

Products are high-fidelity **resin prints** (made to order), positioned as premium collectibles for wargamers and RPG players. Brand voice: *forged in resin, born in shadow* — grimdark, industrial, cinematic.

**Domain:** [emperiumforgeworks.com](https://emperiumforgeworks.com)

---

## Product goals

| Goal | Description |
|------|-------------|
| **Showcase catalog** | Shop (“The Vault”), product detail pages, collections, process/about storytelling |
| **Sell online** | Cart and checkout with reliable payment processing |
| **Operate without redeploys** | Product catalog, inventory flags, and news/announcements should be editable at **runtime** via a backend—not baked into frontend builds |
| **Admin workflow** | Protected admin area to CRUD products, upload images, and manage storefront content |
| **Incremental delivery** | Ship in phases (hosted static preview → full AWS backend → payments → custom domain) |

---

## Technical direction

### Frontend

- **React** + **Vite** + **TypeScript**
- **Tailwind CSS** using the **Obsidian Forge** design system (ported from Stitch HTML exports)
- **React Router** for `/`, `/shop`, `/shop/:slug`, `/process`, `/cart`, `/admin/*`

### Backend (target architecture)

- **AWS Amplify Gen 2** — Auth (Cognito), **DynamoDB** (Amplify Data), **S3** (product images)
- **Amplify Hosting** for the static SPA; backend deployed via sandbox (dev) and pipeline (prod) when ready
- Local dev uses **seed data** until `amplify_outputs.json` is populated from a deployed sandbox

### Payments

- **Stripe** for production card payments (not yet live — **pinned until EIN** is available for Stripe business onboarding)
- **Google Pay** via Stripe Checkout / Payment Element (same session and webhooks as cards; enable in Stripe Dashboard when M3b ships)
- **`PaymentProvider` abstraction** in `packages/shared/` — `MockPaymentProvider` for local/preview, `StripePaymentProvider` stub for later
- Checkout must not scatter payment logic across pages; one provider interface, env-driven implementation

### Content not yet in the data model (planned)

- **News / forge announcements** — runtime-editable blocks (home, shop sidebar) without redeploy
- **Inventory** — `inStock` and related fields on `Product`; possible future stock counts per variant

---

## Data & privacy principles

We want to **minimize sensitive customer data** stored in our systems.

| Data type | Preferred approach |
|-----------|-------------------|
| **Payment card / bank details** | Never on our servers — **Stripe** only |
| **Sales totals, refunds, disputes** | Primary view in **Stripe Dashboard**; optional minimal order records in our DB for fulfillment |
| **Customer PII** (name, address, email) | Collect only what fulfillment requires; avoid duplicating full profiles in DynamoDB if Stripe Checkout can hold billing/shipping |
| **Order records** | Store **order ID**, line items (product refs, qty, price at purchase), status, and Stripe session/payment intent ID—not full payment instrument data |
| **Email on orders** | Only if needed for shipping confirmations; consider Stripe customer email as source of truth where possible |

**Current schema note:** `Order` includes optional `email` for mock checkout. Before production, align fields with “minimum necessary” and document retention.

**Security hygiene:** No AWS keys or secrets in git; rotate any credentials ever exposed; use `.env.local` and Amplify environment variables only.

---

## Reference & design

- Legacy UI reference: `legacy/stitch_export/` (HTML mocks + `screen.png` + Etsy hero banner)
- Design tokens: `legacy/stitch_export/obsidian_forge/DESIGN.md`

---

## Deployment cadence (agreed)

1. **Option A (now):** Amplify Hosting — frontend only, seed catalog, public preview URL  
2. **Option B (next):** Deploy Amplify backend, seed DynamoDB, wire catalog + admin to live API  
3. **Stripe + Google Pay + domain:** Real payments (when EIN unblocks M3b), `emperiumforgeworks.com`, production env vars  

Each feature ships via **commit → push → Amplify build** unless backend schema changes require sandbox/pipeline deploy.

---

## Out of scope (for now)

- **Gallery** page (nav placeholder only)
- Full **Stripe webhooks** and tax/shipping automation (until explicitly planned)
- External CMS (Contentful, etc.) — admin dashboard is the intended CMS

---

## Repository

- **GitHub:** `patrickramos9/emperium-forgeworks`
- **Local path:** `emperiumforgeworks-store` (run `npm` from a non–cloud-synced disk on Windows)
