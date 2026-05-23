# Project Progress

Living status log. Update this file when milestones move or deploys land.

**Last updated:** 2026-05-23

---

## Current phase

**M2 — Backend + admin (Option B / fullstack CI)** — **Deployed** (build #6 succeeded).

| Area | Status |
|------|--------|
| Local development | ✅ Works (`npm install`, `npm run dev`) |
| Production build | ✅ `npm run build` (after `npm install`) |
| GitHub | ✅ `main` on `patrickramos9/emperium-forgeworks` |
| Amplify fullstack CI | ✅ Job 6 SUCCEED; service role `AmplifyEmperiumForgeworksBackendRole` |
| AWS backend (prod) | ✅ CDK bootstrapped; `pipeline-deploy` on `main` |
| Catalog seed (prod) | ✅ 8 products seeded via `npm run seed` |
| Admin user (prod) | ✅ `admin@emperiumforgeworks.com` in `admin` group (change temp password on first login) |
| Stripe | ⏳ Stub only |
| Custom domain | ✅ https://emperiumforgeworks.com |

---

## Phase summary

| Milestone | Status | Notes |
|-----------|--------|-------|
| **M1** Public preview | ✅ Done | Hosted UI, seed fallback, mock checkout |
| **M2** Backend + admin | ✅ Done | Fullstack CI live; catalog seeded; admin user created |
| **M3** Cart & Stripe | ⚪ Not started | Mock checkout works locally with backend |
| **M4** Runtime news | ⚪ Not started | Announcements still hardcoded in React |
| **M5** Polish / Gallery | ⚪ Not started | |

Legend: ✅ Done · 🟡 In progress · ⏳ Blocked / waiting · ⚪ Not started

---

## Recent accomplishments

- **M2 deployed** — IAM service role + CDK bootstrap fixed CI; build #6 succeeded; catalog seeded
- **M2 implementation** — fullstack `amplify.yml`, `@aws-amplify/backend-cli` at root, `detailImage` on Product model
- Admin: userPool client, load/save/delete from API, expanded form, S3 image upload
- Storefront: `useProducts` via guest client + `mapAmplifyProduct`
- Docs: [docs/deploy-option-b.md](../docs/deploy-option-b.md)

---

## Blockers & decisions

| Item | Status |
|------|--------|
| AWS IAM keys | Use **rotated** keys in `.env.local` only |
| Amplify service role | ✅ `AmplifyEmperiumForgeworksBackendRole` with `AmplifyBackendDeployFullAccess` |
| Sales / PII | Prefer Stripe for payment reporting; minimal `Order` in DynamoDB |
| Gallery page | Deferred |
| Payment provider | Mock until M3 |
| Mock orders in prod | `Order` requires authenticated user — persistence optional until M3 |

---

## Next actions (recommended order)

1. **Sign in** at https://emperiumforgeworks.com/admin/login (`admin@emperiumforgeworks.com` — reset temp password in Cognito if needed)  
2. **Smoke-test** edit a product title → confirm `/shop` updates without redeploy  
3. **Commit** doc/script changes (`deploy-option-b.md`, `setup-amplify-backend-role.ps1`)  

---

## Preview & environment URLs

| Environment | URL |
|-------------|-----|
| Local | http://localhost:5173 |
| Amplify (main) | https://main.d25csy1hf0rl22.amplifyapp.com/ |
| Production domain | https://emperiumforgeworks.com |
| Production (www) | https://www.emperiumforgeworks.com |

---

## Changelog

| Date | Update |
|------|--------|
| 2026-05-23 | **M2 live** — service role + CDK bootstrap; build #6; seed + admin user |
| 2026-05-23 | **M2 code** — fullstack CI, admin CRUD + S3 upload, deploy-option-b |
| 2026-05-20 | Custom domain — Route 53 → Amplify; `VITE_SITE_URL` updated |
| 2026-05-19 | M1 live on Amplify Hosting |
| 2026-05-17 | Initial project-plans; storefront UI aligned with legacy designs |
