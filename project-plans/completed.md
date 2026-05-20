# Completed Work

What is **done** in the codebase today (storefront + backend definition). Does not include production AWS deploy unless noted.

---

## Planning & repository

- [x] Project scaffolded as a React monorepo (`packages/shared` + Vite app)
- [x] GitHub repository created and pushed (`main`)
- [x] `.gitignore` for secrets, `node_modules`, `.env.local`
- [x] `chat-transcript.md` removed from git (contained redacted credentials); added to `.gitignore`
- [x] Option A deploy guide: `docs/deploy-option-a.md`
- [x] `amplify.yml` for Amplify Hosting (Node 20, SPA redirects)

---

## Design & UX

- [x] **Obsidian Forge** Tailwind theme (colors, typography, spacing from DESIGN.md)
- [x] Legacy Stitch HTML preserved under `legacy/stitch_export/`
- [x] **Home** — hero banner (Etsy shop asset), featured collections, tech specs, testimonials, sculptors, newsletter
- [x] **Shop (“The Vault”)** — grid, category filters, search (header), product cards, announcement block
- [x] **Product detail (PDP)** — Eldritch Dragon layout (variants, lore, specs HUD, related products)
- [x] **Process / About** — forge narrative, fabrication steps, NSMiniatures section, forge story
- [x] **Header / footer** — nav (Shop, Gallery placeholder, Process, About), cart, admin link
- [x] Product imagery via legacy CDN URLs + local hero banner in `public/images/`

---

## Storefront features

- [x] **Seed catalog** — 8 products in `src/data/seedProducts.ts`
- [x] **Cart** — React context, line items, variant selection, `/cart` page
- [x] **Mock checkout** — `MockPaymentProvider`, success/cancel routes, banner in local mode
- [x] **Payment abstraction** — `PaymentProvider` interface; Stripe provider stub for later
- [x] `useProducts` hook — loads from Amplify when configured, falls back to seed data
- [x] Local dev verified (`npm run build`, `npm run dev`)

---

## Admin (UI scaffold)

- [x] `/admin/login` — Cognito sign-in UI (requires deployed backend)
- [x] `/admin/products` — product list page
- [x] `/admin/products/:slug` — product add/edit page structure

---

## AWS backend (defined, not production-deployed)

- [x] Amplify Gen 2 in `amplify/`:
  - Cognito Auth + **`admin`** group
  - **Product** model (catalog fields, guest read / admin write)
  - **Order** model (mock/stripe provider, line items JSON)
  - **S3** storage resource for images
- [x] `scripts/seed-products.ts` to populate DynamoDB after sandbox
- [x] `amplify_outputs.json` stub (empty until `npm run sandbox`)

---

## Documentation

- [x] Root `README.md` — quick start, sandbox, payments, deploy pointer
- [x] `project-plans/` — context, completed, milestones, progress (this folder)

---

## Deployment

- [x] **Amplify Hosting (Option A)** — https://main.d25csy1hf0rl22.amplifyapp.com/ (`main` branch)

---

## Not completed (see milestones)

- Backend deployed to AWS (`sandbox` / pipeline)
- Catalog served from DynamoDB in production
- Admin CRUD + S3 uploads end-to-end in prod
- Stripe live payments
- Custom domain `emperiumforgeworks.com`
- Runtime news/announcements model
- Gallery page
