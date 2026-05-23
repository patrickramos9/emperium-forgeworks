# Project Progress

Living status log. Update this file when milestones move or deploys land.

**Last updated:** 2026-05-23

---

## Current phase

**M2 — Backend + admin (Option B / fullstack CI)** — **Ready to deploy** (code complete; first `pipeline-deploy` + seed pending).

| Area | Status |
|------|--------|
| Local development | ✅ Works (`npm install`, `npm run dev`) |
| Production build | ✅ `npm run build` (after `npm install`) |
| GitHub | ✅ `main` on `patrickramos9/emperium-forgeworks` |
| Amplify fullstack CI | 🟡 `amplify.yml` backend + frontend phases; push to deploy |
| AWS backend (prod) | ⏳ Awaiting first successful `pipeline-deploy` on `main` |
| Catalog seed (prod) | ⏳ Run `npm run seed` after first backend deploy |
| Admin user (prod) | ⏳ Create Cognito user + `admin` group (see deploy-option-b) |
| Stripe | ⏳ Stub only |
| Custom domain | ✅ https://emperiumforgeworks.com |

---

## Phase summary

| Milestone | Status | Notes |
|-----------|--------|-------|
| **M1** Public preview | ✅ Done | Hosted UI, seed fallback, mock checkout |
| **M2** Backend + admin | 🟡 In progress | Fullstack CI, admin CRUD, S3 upload, `detailImage` schema |
| **M3** Cart & Stripe | ⚪ Not started | Mock checkout works locally with backend |
| **M4** Runtime news | ⚪ Not started | Announcements still hardcoded in React |
| **M5** Polish / Gallery | ⚪ Not started | |

Legend: ✅ Done · 🟡 In progress · ⏳ Blocked / waiting · ⚪ Not started

---

## Recent accomplishments

- **M2 implementation** — fullstack `amplify.yml`, `@aws-amplify/backend-cli` at root, `detailImage` on Product model
- Admin: userPool client, load/save/delete from API, expanded form, S3 image upload
- Storefront: `useProducts` via guest client + `mapAmplifyProduct`
- Docs: [docs/deploy-option-b.md](../docs/deploy-option-b.md)

---

## Blockers & decisions

| Item | Status |
|------|--------|
| AWS IAM keys | Use **rotated** keys in `.env.local` only |
| Amplify service role | Must allow CDK deploy for first backend build |
| Sales / PII | Prefer Stripe for payment reporting; minimal `Order` in DynamoDB |
| Gallery page | Deferred |
| Payment provider | Mock until M3 |
| Mock orders in prod | `Order` requires authenticated user — persistence optional until M3 |

---

## Next actions (recommended order)

1. **Push `main`** → verify Amplify backend phase succeeds  
2. **`npm run seed`** with production `amplify_outputs.json`  
3. **Cognito admin user** → `admin` group → test `/admin/login`  
4. **Smoke-test** edit product title → confirm shop updates without redeploy  

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
| 2026-05-23 | **M2 code** — fullstack CI, admin CRUD + S3 upload, deploy-option-b |
| 2026-05-20 | Custom domain — Route 53 → Amplify; `VITE_SITE_URL` updated |
| 2026-05-19 | M1 live on Amplify Hosting |
| 2026-05-17 | Initial project-plans; storefront UI aligned with legacy designs |
