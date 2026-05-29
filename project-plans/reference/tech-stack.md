# Tech stack

## Frontend

| Layer | Technology | Notes |
|-------|------------|--------|
| UI | React 19 | Function components, hooks |
| Build | Vite 6 | `npm run dev` → port 5173 |
| Language | TypeScript 5.7 | Project references (`tsc -b`) |
| Routing | React Router 7 | SPA; Amplify redirects all paths to `index.html` |
| Styling | Tailwind CSS 3.4 | **Obsidian Forge** theme — see [design-system.md](./design-system.md) |
| AWS SDK (browser) | aws-amplify 6.x | Auth + Data + Storage |

### Monorepo workspace

| Package | Path | Role |
|---------|------|------|
| Store app | `/` (root) | Vite app, `src/` |
| Shared | `packages/shared/` | `PaymentProvider`, `MockPaymentProvider`, `StripePaymentProvider` stub |

---

## Backend (AWS Amplify Gen 2)

| Service | Amplify resource | Purpose |
|---------|------------------|---------|
| Cognito User Pool | `amplify/auth/resource.ts` | Admin + customer login |
| Cognito Identity Pool | (generated) | Guest IAM for unauthenticated GraphQL/S3 |
| AppSync + DynamoDB | `amplify/data/resource.ts` | GraphQL API and tables |
| S3 | `amplify/storage/resource.ts` | `productImages` bucket, `products/*` prefix |
| Lambda | `amplify/functions/*` | Custom queries, post-confirmation trigger |

**CLI:** `@aws-amplify/backend`, `npx ampx sandbox` (local), `npx ampx pipeline-deploy` (CI).

---

## Infrastructure & CI

| Item | Detail |
|------|--------|
| Hosting | AWS Amplify Hosting (`amplify.yml`) |
| Node | 20 (`nvm use 20` in CI) |
| Backend deploy | `pipeline-deploy` on every `main` build |
| Frontend artifact | `dist/` after `npm run build` |
| Domain | Route 53 → Amplify (see `docs/connect-custom-domain.md`) |

---

## Third-party (production)

| Service | Usage | Config location |
|---------|--------|-----------------|
| Google Analytics 4 | Page views (gtag in `index.html`) | Measurement ID in hosting |
| GA4 Data API | Admin dashboard metrics | Lambda env: `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY` |
| Stripe | Planned (M3b) | Future Amplify secrets + `VITE_APP_ENV=deployment` |

---

## Environment variables

### Frontend (Vite — prefix `VITE_`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_APP_ENV` | Recommended | `local` (default) or `deployment` — selects payment provider |
| `VITE_SITE_URL` | Recommended | Canonical site URL for checkout redirects |
| `VITE_SITE_DOMAIN` | Optional | Display / analytics domain |
| `VITE_PLAUSIBLE_DOMAIN` | Optional | Admin dashboard link to Plausible (if used) |

Loaded from `.env.local` in development (not committed).

### Backend (Amplify console / `backend.ts` defaults)

| Variable | Used by | Description |
|----------|---------|-------------|
| `USER_POOL_ID` | list-customers, lookup-customer | Injected from auth resource |
| `GA4_PROPERTY_ID` | get-ga4-dashboard | GA4 property numeric ID |
| `GA4_CLIENT_EMAIL` | get-ga4-dashboard | Service account email |
| `GA4_PRIVATE_KEY` | get-ga4-dashboard | Service account PEM (escaped newlines) |
| `GROUP_NAME` | Lambdas / post-confirmation | Default `customer` |

### Generated (do not edit manually)

| File | Purpose |
|------|---------|
| `amplify_outputs.json` | API endpoint, auth IDs, storage bucket — produced by sandbox/deploy |

---

## Developer scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local Vite server |
| `npm run build` | `check:storage` + typecheck + production bundle |
| `npm run typecheck` | `tsc -b` |
| `npm run seed` | Seed DynamoDB products (`scripts/seed-products.ts`) |
| `npm run sandbox` | Local Amplify sandbox |
| `npm run check:storage` | Validate `amplify_outputs.json` storage vs code |
| `npm run grant:ga4-access` | Grant GA4 property access to service account |

---

## What we intentionally avoid

- No Next.js / SSR — static SPA only.
- No separate REST API layer — GraphQL via Amplify Data.
- No `@aws-sdk/credential-providers` in the browser bundle (Vite build constraint).
- No payment card data in DynamoDB — Stripe when live.
