# Project Progress

Living status log. Update this file when milestones move or deploys land.

**Last updated:** 2026-05-23

---

## Current phase

**M2 — Backend + admin** — **Code complete**; **closure:** production smoke-test after latest deploy.

| Area | Status |
|------|--------|
| Fullstack CI + DynamoDB + S3 | ✅ |
| Admin product CRUD + gallery + variations | ✅ |
| Storefront live catalog + PDP enhancements | ✅ |
| Production smoke-test (latest deploy) | 🟡 In progress |
| Stripe live checkout | ⚪ M3 |
| Customer accounts | ⚪ M4 |
| Admin dashboard + stats | ⚪ M5 |
| Promo codes | ⚪ M6 |
| Hidden Vault | ⚪ M7 |

---

## Phase summary

| Milestone | Status | Notes |
|-----------|--------|-------|
| **M1** Public preview | ✅ Done | https://emperiumforgeworks.com |
| **M2** Backend + admin | ✅ Done | Awaiting post-deploy smoke-test |
| **M3** Cart & Stripe | ⚪ Next | Guest checkout; mock today |
| **M4** Customer accounts | ⚪ Not started | Optional signup; guest still OK |
| **M5** Admin portal + stats | ⚪ Not started | Dashboard, orders, analytics |
| **M6** Promo codes | ⚪ Not started | Cart/checkout discounts |
| **M7** Hidden Vault | ⚪ Not started | Key-gated exclusive catalog |
| **M8** Runtime news | ⚪ Not started | Announcements API + admin |
| **M9** Polish / Gallery | ⚪ Not started | SEO, gallery page, performance |

Legend: ✅ Done · 🟡 In progress · ⏳ Blocked / waiting · ⚪ Not started

---

## M2 closure checklist

After deploy lands on `main`:

1. Amplify build: backend + frontend both succeed  
2. `/shop` — DynamoDB products load (not seed-only fallback)  
3. Admin — login, edit title/images/variations, **Save** (no `variants` 400)  
4. PDP — description, multi-select variants, linked photos, price total  
5. Optional — re-save legacy products to normalize image paths / variant JSON  

---

## Recent accomplishments

- **M2 enhancements** — gallery editor, PDP carousel, variation groups + photo linking, multi-select picker, description section, AWSJSON payload fix
- **M2 deployed** — IAM service role + CDK bootstrap; fullstack CI; catalog seeded
- Admin: userPool client, CRUD, S3 upload, expanded product form
- Storefront: guest/userPool data clients, `mapAmplifyProduct`, image URL resolution
- Docs: [docs/deploy-option-b.md](../docs/deploy-option-b.md)

---

## Blockers & decisions

| Item | Status |
|------|--------|
| Payment provider | Mock until **M3** Stripe |
| Visitor analytics | Not in app today — **M5** (Plausible/GA4 or similar) |
| Sales stats in admin | Needs paid **Orders** from **M3** |
| Vault access model | Shared key / access code — **M7** |
| Gallery page | Deferred to **M9** |
| PII | Prefer Stripe for receipts; minimal `Order` in DynamoDB |

---

## Next actions (recommended order)

1. **M2 smoke-test** on production after current deploy  
2. **M3** — Stripe checkout + webhooks + `VITE_APP_ENV=deployment`  
3. **M4** — customer accounts (guest checkout preserved)  
4. **M5** — admin shell + dashboard (orders + traffic)  
5. **M6** — promo codes  
6. **M7** — Hidden Vault  

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
| 2026-05-23 | **Roadmap expanded** — M4 accounts, M5 admin stats, M6 promos, M7 Hidden Vault; M8 news, M9 polish |
| 2026-05-23 | **M2 enhancements** — variations, gallery, multi-select PDP, description |
| 2026-05-23 | **M2 live** — fullstack CI; seed + admin user |
| 2026-05-20 | Custom domain — Route 53 → Amplify |
| 2026-05-19 | M1 live on Amplify Hosting |
