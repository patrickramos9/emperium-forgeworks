# Project Progress

Living status log. Update this file when milestones move or deploys land.

**Last updated:** 2026-05-28

---

## Current phase

**M8 — Content & community** — **In progress (M8a + M8b complete; M8c sculptors next).** M7 complete. M3b pinned until EIN.

| Area | Status |
|------|--------|
| Fullstack CI + DynamoDB + S3 | ✅ |
| Admin product CRUD + gallery + variations | ✅ |
| Storefront live catalog + PDP | ✅ |
| Cart UX (M3a) | ✅ Deployed |
| Customer accounts (M4) | ✅ Deployed |
| Admin portal + stats (M5) | ✅ Deployed (GA4 live) |
| Auth/catalog ops fixes | ✅ Admin group, shop catalog, idle timeout |
| Stripe + Google Pay (M3b) | ⏳ Blocked on EIN |
| M7a Storefront cleanup | ✅ Done |
| M7b Hidden Vault | ✅ Done (backend deploy + `VAULT_ACCESS_KEY` secret) |
| M8a.1 Announcements | ✅ Done |
| M8a.2 Notifications | ✅ Done (inbox, badge, targeting, vault grant trigger) |
| M8b Reviews | ✅ Done |
| M8c Sculptors | ⚪ Not started |
| M10 Admin–customer chat | ⚪ Not started |
| M11 Print progress tracker | ⚪ Not started |
| M11b Pi printer bridge (Saturn / SDCP) | ⚪ Optional after M11 |
| M12 Notification preferences | ⚪ Not started |
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
| **M5** Admin portal + stats | ✅ Done | Shell, orders UI, GA4 dashboard + product-interest insights |
| **M6** Promo codes | ⚪ Not started | Cart/checkout discounts |
| **M7a** Storefront cleanup | ✅ Done | No Forge on cards; About-only; copy |
| **M7b** Hidden Vault | ✅ Done | `vaultOnly`, `/vault`, Lambda verify, admin |
| **M8** Content & community | 🟡 In progress | Reviews done; sculptors pending |
| **M9** Polish / Gallery | ⚪ Not started | SEO, gallery page, performance |
| **M10** Admin–customer chat | ⚪ Not started | Either party can initiate |
| **M11** Print progress tracker | ⚪ Not started | Queued → fabrication → Shipped + notifications |
| **M11b** Pi printer bridge | ⚪ Optional | Saturn 4 Ultra SDCP → Raspberry Pi → store API |
| **M12** Notification preferences | ⚪ Not started | Per-category opt-out |

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

- **M8b** — Review model, account review flow, `/reviews`, home **Voices From The Void**, admin moderation
- **M8a.2** — customer notification inbox, unread badge, admin CRUD, per-user targeting, vault-grant auto-notification (production verified)
- **M5** — `AdminLayout`, dashboard stats, orders list/detail, GA4 runtime analytics (cards, trends, top/low-interest products)
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
| Visitor analytics | GA4 Data API live in admin dashboard |
| Sales stats in admin | Mock orders drive dashboard until **M3b** |
| Cognito sessions | Access token ~1h (auto-refresh); refresh token ~30d; **admin 8h idle** sign-out |
| Shop + admin same browser | Signed-in admin uses userPool on `/shop`; deploy `authenticated` Product read |
| Product images + IAM | Catalog images use **guest IAM** (`storefrontStorage.ts`); `npm run check:storage` catches outputs drift — see [docs/storage-auth.md](../docs/storage-auth.md) |
| Vault access model | Shared key / access code — **M7** |
| Gallery page | Deferred to **M9** |
| Print automation | **M11b** — Raspberry Pi on shop LAN bridges Saturn 4 Ultra (SDCP) to stage API; wash/cure/ship stay manual |
| Pi bridge as product | Future B2B — sell preconfigured Pi + forge-bridge to other print shops after in-house M11b is proven |
| PII | Prefer Stripe for receipts; minimal `Order` in DynamoDB |

---

## Next actions (recommended order)

### M8 (next; uses M5 admin shell)

8. **M8c** Admin sculptors CRUD + public `/sculptors/:slug` pages + home integration  

### After M8

9. **M3b** — Stripe + Google Pay when EIN ready  
10. **M6** — promo codes  
11. **M10** — admin–customer chat (either party initiates)  
12. **M11** — print progress tracker (Queued → fabrication → Shipped + stage notifications)  
13. **M11b** *(optional)* — Raspberry Pi SDCP bridge for Saturn 4 Ultra auto **3D Printing** (and optional print-complete → wash)  
14. **M12** — notification preferences (per-category opt-out)  
15. **M9** — Gallery, SEO, performance  

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
| 2026-05-28 | **Site design docs** — `project-plans/site-design/` architecture, API, data models, auth, deployment |
| 2026-05-28 | **M8b complete** — order reviews, Voices From The Void on home, `/reviews`, admin moderation |
| 2026-05-28 | **M11b planned** — Raspberry Pi LAN bridge (SDCP → Saturn 4 Ultra) for automated printing-stage updates |
| 2026-05-28 | **M8a.2 complete** — notifications inbox, badge, targeting, vault-grant trigger (prod verified); **M10–M12** added (chat, print tracker, notification prefs) |
| 2026-05-27 | **M5 traffic stats upgraded** — GA4 Data API dashboard live (trend + product-interest insights) |
| 2026-05-27 | **M8 split** — M8a.1 announcements marked done; M8a.2 notifications tracked separately |
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
