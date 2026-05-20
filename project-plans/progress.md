# Project Progress

Living status log. Update this file when milestones move or deploys land.

**Last updated:** 2026-05-19

---

## Current phase

**M1 — Public preview (Option A)** — **Live** on Amplify Hosting.

| Area | Status |
|------|--------|
| Local development | ✅ Works (`npm install` on local disk, `npm run dev`) |
| Production build | ✅ `npm run build` passes |
| GitHub | ✅ `main` on `patrickramos9/emperium-forgeworks` |
| Amplify Hosting deploy | ✅ [https://main.d25csy1hf0rl22.amplifyapp.com/](https://main.d25csy1hf0rl22.amplifyapp.com/) |
| AWS backend (sandbox/prod) | ⏳ Schema defined; `amplify_outputs.json` empty |
| Stripe | ⏳ Stub only |
| Custom domain | ⏳ Not connected |

---

## Phase summary

| Milestone | Status | Notes |
|-----------|--------|-------|
| **M1** Public preview | ✅ Done | Amplify URL live; seed catalog, mock checkout UI |
| **M2** Backend + admin | ⚪ Not started | Sandbox locally optional before CI backend |
| **M3** Cart & Stripe | ⚪ Not started | Mock checkout works locally with backend |
| **M4** Runtime news | ⚪ Not started | Announcements still hardcoded in React |
| **M5** Polish / Gallery | ⚪ Not started | |

Legend: ✅ Done · 🟡 In progress · ⏳ Blocked / waiting · ⚪ Not started

---

## Recent accomplishments

- **M1 deployed** — storefront accessible on Amplify (`main` branch)
- Migrated project off Google Drive; clean `npm install` and dev server
- Aligned UI with Stitch exports (home banner, shop, PDP, process)
- Prepared Amplify Hosting (`amplify.yml`, SPA redirects, deploy guide)
- Removed AWS credentials from git; redacted transcript
- Added `project-plans/` documentation

---

## Blockers & decisions

| Item | Status |
|------|--------|
| AWS IAM keys | Use **rotated** keys in `.env.local` only |
| Sales / PII | **Decision:** Prefer Stripe for payment + sales reporting; minimal `Order` fields in DynamoDB |
| Gallery page | Deferred; nav shows disabled placeholder |
| Payment provider | Mock for preview; Stripe when M3 starts |
| `VITE_SITE_URL` | Set in Amplify env to preview URL if checkout redirects need it |

---

## Next actions (recommended order)

1. **Smoke-test** preview URL: `/`, `/shop`, `/shop/eldritch-dragon`, `/process`, `/cart`  
2. **Amplify env** — confirm `VITE_APP_ENV=local`, `VITE_SITE_DOMAIN=emperiumforgeworks.com`, `VITE_SITE_URL=https://main.d25csy1hf0rl22.amplifyapp.com` (redeploy if changed)  
3. **Start M2** — `npm run sandbox`, seed DB, wire catalog + admin to DynamoDB/S3  
4. Custom domain when ready (`emperiumforgeworks.com`)

---

## Preview & environment URLs

| Environment | URL |
|-------------|-----|
| Local | http://localhost:5173 |
| Amplify (main) | https://main.d25csy1hf0rl22.amplifyapp.com/ |
| Production domain | https://emperiumforgeworks.com *(not wired yet)* |

---

## Changelog

| Date | Update |
|------|--------|
| 2026-05-19 | **M1 live** — Amplify preview deployed at `main.d25csy1hf0rl22.amplifyapp.com` |
| 2026-05-17 | Initial `project-plans/` docs; M1 prep complete; storefront UI aligned with legacy designs |
| 2026-05-17 | Repo pushed to GitHub; push protection resolved (transcript removed) |
