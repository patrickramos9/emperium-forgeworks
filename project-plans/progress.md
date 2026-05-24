# Project Progress

Living status log. Update this file when milestones move or deploys land.

**Last updated:** 2026-05-24

---

## Current phase

**M4 — Customer accounts** — **Next up.** M2 is complete. **M3b (Stripe + Google Pay) pinned** until EIN is available for Stripe onboarding.

| Area | Status |
|------|--------|
| Fullstack CI + DynamoDB + S3 | ✅ |
| Admin product CRUD + gallery + variations | ✅ |
| Storefront live catalog + PDP enhancements | ✅ |
| Production smoke-test | ✅ Passed 2026-05-23 |
| Cart UX hardening | ⚪ M3a (optional parallel) |
| Stripe + Google Pay live checkout | ⏳ M3b — blocked on EIN |
| Customer accounts | 🎯 M4 — next |
| Admin dashboard + stats | ⚪ M5 |
| Promo codes | ⚪ M6 |
| Hidden Vault | ⚪ M7 |

---

## Phase summary

| Milestone | Status | Notes |
|-----------|--------|-------|
| **M1** Public preview | ✅ Done | https://emperiumforgeworks.com |
| **M2** Backend + admin | ✅ Done | Production smoke-test passed |
| **M3a** Cart UX | ⚪ Optional | Persistence, limits, polish |
| **M3b** Stripe + Google Pay | ⏳ Pinned | Waiting on EIN; mock checkout today |
| **M4** Customer accounts | 🎯 Next | Optional signup; guest still OK |
| **M5** Admin portal + stats | ⚪ Not started | Dashboard, orders, analytics |
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

1. **M4** — customer accounts (guest checkout preserved; mock orders OK)  
2. **M3a** — cart UX hardening (can run in parallel with M4)  
3. **M5** — admin shell + dashboard (orders + traffic)  
4. **M7** — Hidden Vault (mock checkout OK)  
5. **M3b** — Stripe + Google Pay + webhooks — **resume when EIN is ready**  
6. **M6** — promo codes (after M3b)  

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
| 2026-05-24 | **M3b pinned** — Stripe + Google Pay deferred until EIN; **M4** is next |
| 2026-05-23 | **M2 complete** — production smoke-test passed; phase closed |
| 2026-05-23 | **M2 enhancements** — variations, gallery, multi-select PDP, description |
| 2026-05-23 | **M2 live** — fullstack CI; seed + admin user |
| 2026-05-20 | Custom domain — Route 53 → Amplify |
| 2026-05-19 | M1 live on Amplify Hosting |
