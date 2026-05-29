# Deployment and environments

## Environments

| Environment | URL | Backend |
|-------------|-----|---------|
| Local dev | http://localhost:5173 | Optional: `npm run sandbox` → `amplify_outputs.json` |
| Amplify branch | https://main.d25csy1hf0rl22.amplifyapp.com/ | Pipeline deploy on `main` |
| Production | https://emperiumforgeworks.com | Same stack as `main` |
| Production (www) | https://www.emperiumforgeworks.com | DNS alias |

---

## CI pipeline (`amplify.yml`)

### Backend phase

1. `npm ci` (root + `amplify/` + each Lambda function package)  
2. `npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID`  
3. Produces/updates `amplify_outputs.json` for the branch  

### Frontend phase

1. `npm ci`  
2. `npm run build` → runs `check:storage`, TypeScript, Vite  
3. Publishes `dist/` as static artifacts  

### SPA routing

Custom redirects rewrite non-file paths to `/index.html` (200) so deep links work.

---

## Local development workflow

```bash
# Terminal 1 — backend (optional but required for live data)
npm run sandbox

# Terminal 2 — frontend
npm run dev
```

Copy `.env.local` example values:

```env
VITE_APP_ENV=local
VITE_SITE_URL=http://localhost:5173
VITE_SITE_DOMAIN=localhost
```

After sandbox starts, `amplify_outputs.json` is written/updated at repo root.

**Seed catalog:**

```bash
npm run seed
```

Requires deployed API and admin credentials per script docs.

---

## Deploy checklist (schema change)

1. Merge/push changes including `amplify/data/resource.ts`  
2. Wait for Amplify backend build (pipeline-deploy)  
3. Verify `amplify_outputs.json` in build artifacts / local pull  
4. Run `npm run check:storage` if storage rules changed  
5. Frontend build picks up new models automatically  
6. Smoke-test: admin save, shop list, new feature (e.g. reviews)

---

## Environment-specific behavior

| `VITE_APP_ENV` | Payment | UI |
|----------------|---------|-----|
| `local` (default) | `MockPaymentProvider` | Mock checkout banner |
| `deployment` | Stripe when configured (M3b) | Production checkout |

---

## Secrets and configuration

| Secret | Where to set |
|--------|----------------|
| GA4 service account | Amplify Console → Environment variables (backend) |
| Stripe keys | Future: Amplify secrets + Lambda (M3b) |
| Cognito admin users | AWS Console / CLI — not in repo |

Never commit:

- `.env.local`  
- Service account JSON keys  
- Rotated credentials from chat/logs  

---

## Operational scripts

| Script | When to use |
|--------|-------------|
| `npm run check:storage` | After deploy; validates S3 guest/customer read in outputs |
| `npm run grant:ga4-access` | One-time GA4 property access for service account |
| `scripts/seed-products.ts` | Initial or dev catalog population |

---

## Rollback

- **Frontend:** Redeploy previous Amplify build in console.  
- **Backend:** Revert Git commit and redeploy; DynamoDB tables are retained—schema rollbacks may need manual care.  
- **Data:** No automated backup documented; use AWS point-in-time recovery if enabled on tables.
