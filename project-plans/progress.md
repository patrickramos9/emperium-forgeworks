# Project Progress

Living status log. Update this file when milestones move or deploys land.

**Last updated:** 2026-05-25

---

## Current phase

**M8 — Content & community** — **In progress (M8a announcements started).** M7 complete (deploy pending). M3b pinned until EIN.

| Area | Status |
|------|--------|
| Fullstack CI + DynamoDB + S3 | ✅ |
| Admin product CRUD + gallery + variations | ✅ |
| Storefront live catalog + PDP | ✅ |
| Cart UX (M3a) | ✅ Deployed |
| Customer accounts (M4) | ✅ Deployed |
| Admin portal + stats (M5) | ✅ Deployed |
| Auth/catalog ops fixes | ✅ Admin group, shop catalog, idle timeout |
| Stripe + Google Pay (M3b) | ⏳ Blocked on EIN |
| M7a Storefront cleanup | ✅ Done |
| M7b Hidden Vault | ✅ Done (backend deploy + `VAULT_ACCESS_KEY` secret) |
| M8a Announcements | 🟡 In progress |
| M8b Reviews / M8c Sculptors / notifications | ⚪ Not started |
| Promo codes (M6) | ⚪ After M3b |

---

## Phase summary

| Milestone | Status | Notes |
|-----------|--------|-------|
| **M1** Public preview | ✅ Done | https://emperiumforgeworks.com |
| **M2** Backend + admin | ✅ Done | Production smoke-test passed |
| **M3a** Cart UX | ✅ Done | Qty limits, validation, guest orders |
| **M3b** Stripe + Google Pay | ⏳ Pinned | Waiting on EIN; mock checkout today |
| **M4** Customer accounts | ✅ Done | Sign up/in, orders, header menu |
| **M5** Admin portal + stats | ✅ Done | Shell, dashboard, orders UI |
| **M6** Promo codes | ⚪ Not started | Cart/checkout discounts |
| **M7a** Storefront cleanup | ✅ Done | No Forge on cards; About-only; copy |
| **M7b** Hidden Vault | ✅ Done | `vaultOnly`, `/vault`, Lambda verify, admin |
| **M8** Content & community | ⚪ Not started | Reviews, sculptors, notifications |
| **M9** Polish / Gallery | ⚪ Not started | SEO, gallery page, performance |

Legend: ✅ Done · 🟡 In progress · ⏳ Blocked / waiting · ⚪ Not started

---

## M2 closure checklist ✅

Completed 2026-05-23 (production smoke-test passed):

1. Amplify build: backend + frontend both succeed  
2. `/shop` — DynamoDB products load  
3. Admin — login, edit title/images/variations, Save  
4. PDP — description, multi-select variants, linked photos, price total  

---

## Recent accomplishments

- **M5** — `AdminLayout`, dashboard stats, orders list/detail, Plausible placeholder, nav stubs
- **M4** — customer sign-up/sign-in, order history, `addCustomerToGroup` Lambda, `Order.userId`
- **M3a** — cart qty limits, validation, guest orders, minimal line-item snapshots
- **Ops fixes** — admin must be in `admin` group; shop uses userPool when signed in + `authenticated` Product read; 8h admin idle sign-out
- **M2 complete** — production smoke-test passed; fullstack CI; catalog seeded
- Docs: [docs/deploy-option-b.md](../docs/deploy-option-b.md)

---

## Blockers & decisions

| Item | Status |
|------|--------|
| Payment provider | Mock until **M3b** (Stripe + Google Pay); **blocked on EIN** |
| Visitor analytics | Dashboard placeholder only — set `VITE_PLAUSIBLE_DOMAIN` when ready |
| Sales stats in admin | Mock orders drive dashboard until **M3b** |
| Cognito sessions | Access token ~1h (auto-refresh); refresh token ~30d; **admin 8h idle** sign-out |
| Shop + admin same browser | Signed-in admin uses userPool on `/shop`; deploy `authenticated` Product read |
| Product images + IAM | Catalog images use **guest IAM** (`storefrontStorage.ts`); `npm run check:storage` catches outputs drift — see [docs/storage-auth.md](../docs/storage-auth.md) |
| Vault access model | Shared key / access code — **M7** |
| Gallery page | Deferred to **M9** |
| PII | Prefer Stripe for receipts; minimal `Order` in DynamoDB |

---

## Next actions (recommended order)

### M8 (next; uses M5 admin shell)

6. Announcements + **notification badge** on account avatar  
7. Order **reviews** + home **Voices From The Void** + `/reviews` page  
8. Admin **Sculptors** CRUD + public `/sculptors/:slug` pages  

### Later

9. **M3b** — Stripe + Google Pay when EIN ready  
10. **M6** — promo codes  
11. **M9** — Gallery, SEO, performance  

**Optional:** `VITE_PLAUSIBLE_DOMAIN` for admin dashboard traffic link.

See [milestones.md](./milestones.md) for full scope per phase.

---

## Preview & environment URLs

| Environment | URL |
|-------------|-----|
| Local | http://localhost:5173 |
| Amplify (main) | https://main.d25csy1hf0rl22.amplifyapp.com/ |
| Production | https://emperiumforgeworks.com |
| Production (www) | https://www.emperiumforgeworks.com |

---

## Changelog

| Date | Update |
|------|--------|
| 2026-05-24 | **M7 complete** — storefront cleanup + Hidden Vault (`vaultOnly`, `/vault`, verify Lambda) |
| 2026-05-25 | **M7/M8 scope expanded** — cleanup tasks, reviews, sculptors, notifications |
| 2026-05-25 | **Plan refresh** — M3a/M4/M5 marked done; auth/shop fixes logged |
| 2026-05-27 | **Storage auth guard** — `storefrontStorage.ts` (guest IAM for catalog images), `check:storage`, [docs/storage-auth.md](../docs/storage-auth.md) |
| 2026-05-24 | **Shop catalog fix** — `authenticated` Product read; signed-in catalog uses userPool |
| 2026-05-24 | **Admin auth fix** — `admin` group guard; 8h idle session |
| 2026-05-24 | **M5 complete** — admin shell, dashboard, orders list/detail (deployed) |
| 2026-05-24 | **M3a + M4** — cart UX, customer auth (deployed) |
| 2026-05-24 | **M3b pinned** — Stripe + Google Pay deferred until EIN |
| 2026-05-23 | **M2 complete** — production smoke-test passed; phase closed |
| 2026-05-23 | **M2 enhancements** — variations, gallery, multi-select PDP, description |
| 2026-05-23 | **M2 live** — fullstack CI; seed + admin user |
| 2026-05-20 | Custom domain — Route 53 → Amplify |
| 2026-05-19 | M1 live on Amplify Hosting |
