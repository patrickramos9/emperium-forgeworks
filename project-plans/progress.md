# Project Progress

Living status log. Update this file when milestones move or deploys land.

**Last updated:** 2026-05-24 (M5)

---

## Current phase

**M7 — Hidden Vault** or **M8 — Runtime news** — **Next up.** M5 complete. **M3b pinned** until EIN.

| Area | Status |
|------|--------|
| Fullstack CI + DynamoDB + S3 | ✅ |
| Admin product CRUD + gallery + variations | ✅ |
| Storefront live catalog + PDP enhancements | ✅ |
| Cart UX hardening (M3a) | ✅ |
| Customer accounts (M4) | ✅ |
| Admin portal + stats (M5) | ✅ |
| Stripe + Google Pay live checkout | ⏳ M3b — blocked on EIN |
| Hidden Vault | ⚪ M7 |
| Promo codes | ⚪ M6 |

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
| **M7** Hidden Vault | ⚪ Not started | Key-gated exclusive catalog |
| **M8** Runtime news | ⚪ Not started | Announcements API + admin |
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

- **M2 complete** — production smoke-test passed; phase closed
- **M2 deployed** — IAM service role + CDK bootstrap; fullstack CI; catalog seeded
- Admin: userPool client, CRUD, S3 upload, expanded product form
- Storefront: guest/userPool data clients, `mapAmplifyProduct`, image URL resolution
- Docs: [docs/deploy-option-b.md](../docs/deploy-option-b.md)

---

## Blockers & decisions

| Item | Status |
|------|--------|
| Payment provider | Mock until **M3b** (Stripe + Google Pay); **blocked on EIN** |
| Visitor analytics | Not in app today — **M5** (Plausible/GA4 or similar) |
| Sales stats in admin | Needs paid **Orders** from **M3b**; mock orders OK for UI |
| Vault access model | Shared key / access code — **M7** |
| Gallery page | Deferred to **M9** |
| PII | Prefer Stripe for receipts; minimal `Order` in DynamoDB |

---

## Next actions (recommended order)

1. **Deploy** — push M5 (Order admin `update` auth) if not yet deployed  
2. **M7** — Hidden Vault (mock checkout OK)  
3. **M8** — runtime announcements (uses M5 admin shell)  
4. **M3b** — Stripe + Google Pay — **resume when EIN is ready**  
5. **M6** — promo codes (after M3b)  

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
| 2026-05-24 | **M5 complete** — admin shell, dashboard, orders list/detail |
| 2026-05-24 | **M3a + M4** — cart UX, customer auth, order history |
| 2026-05-24 | **M3b pinned** — Stripe + Google Pay deferred until EIN |
| 2026-05-23 | **M2 complete** — production smoke-test passed; phase closed |
| 2026-05-23 | **M2 enhancements** — variations, gallery, multi-select PDP, description |
| 2026-05-23 | **M2 live** — fullstack CI; seed + admin user |
| 2026-05-20 | Custom domain — Route 53 → Amplify |
| 2026-05-19 | M1 live on Amplify Hosting |
