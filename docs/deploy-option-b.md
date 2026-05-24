# Deploy Option B — Fullstack Amplify Gen 2 (backend + hosting)

Catalog, admin, and S3 product images backed by **DynamoDB**, **Cognito**, and **S3**. Every push to `main` runs `pipeline-deploy` then builds the React app with a fresh `amplify_outputs.json`.

Option A (frontend-only) is documented in [deploy-option-a.md](deploy-option-a.md).

## Prerequisites

- AWS account with billing enabled
- GitHub repo: `patrickramos9/emperium-forgeworks`
- Amplify app connected to `main` with **[`amplify.yml`](../amplify.yml)** (backend + frontend phases)
- **Rotated** IAM keys only in `.env.local` (never commit)

## 1. Amplify Console — fullstack app

1. [Amplify Console](https://console.aws.amazon.com/amplify/home) → your app → **App settings**.
2. Confirm **Gen 2** fullstack: build spec includes a `backend:` section (see repo `amplify.yml`).
3. **Service role** (required for backend deploy):
   - Amplify Console → **App settings** → **General** → **Service role** must **not** be empty.
   - Attach AWS managed policy **`AmplifyBackendDeployFullAccess`** (`arn:aws:iam::aws:policy/service-role/AmplifyBackendDeployFullAccess`).
   - Optionally add **`AdministratorAccess-Amplify`** if the first deploy hits further permission errors.
   - Or run the setup script (uses AWS CLI): see [scripts/setup-amplify-backend-role.ps1](../scripts/setup-amplify-backend-role.ps1).

## 2. Environment variables

| Name | Value |
|------|--------|
| `VITE_APP_ENV` | `local` (mock checkout until M3 Stripe) |
| `VITE_SITE_DOMAIN` | `emperiumforgeworks.com` |
| `VITE_SITE_URL` | `https://emperiumforgeworks.com` |

Redeploy after changing env vars.

## 3. First deploy

1. Push to `main` (or trigger **Redeploy this version**).
2. Backend phase: `npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID` (5–15+ minutes first time).
3. Frontend phase: `npm run build` bundles `amplify_outputs.json` from the backend step.

Watch build logs for backend errors before debugging the frontend.

## 4. Seed the catalog (one-time per environment)

After the first successful backend deploy:

1. Download `amplify_outputs.json` from the build artifacts (or copy from Amplify Console → **Backend environments**).
2. Place it at the repo root (overwrite local stub).
3. Locally:

```bash
npm install
npm run seed
```

This upserts all 8 products from `src/data/seedProducts.ts` into DynamoDB.

Re-run `npm run seed` anytime you need to reset catalog fields from seed data (idempotent by slug).

## 5. Create the first admin user

1. AWS Console → **Cognito** → user pool created by Amplify (name includes your app/branch).
2. **Create user** with email + temporary password (or invite).
3. **Groups** → open the **`admin`** group → add the user.
4. Sign in at `https://emperiumforgeworks.com/admin/login` (or your Amplify URL).

Admin mutations use Cognito **userPool** auth; the user must be in the `admin` group.

## 6. Verify exit criteria

| Check | Expected |
|-------|----------|
| `/shop` | Lists products from DynamoDB (after seed) |
| `/admin/products` | Lists same products; empty state prompts seed if none |
| Edit title in admin → Save | `/shop` and PDP show new title without redeploying frontend |
| Upload image on edit form | New URL on PDP (S3 signed/public URL) |

## 7. Local development

**With cloud sandbox:**

```bash
npm run sandbox   # writes amplify_outputs.json
npm run seed
npm run dev
```

**Without backend:** `npm run dev` still works using seed data in the storefront.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **`BootstrapDetectionError`** — `ssm:GetParameter` denied on `/cdk-bootstrap/hnb659fds/version` | App **service role** is missing or lacks `AmplifyBackendDeployFullAccess`. Assign a role (see §1 step 3) and redeploy. See [amplify-hosting#4038](https://github.com/aws/amplify/amplify-hosting/issues/4038). |
| **CDKToolkit stack does not exist** | Bootstrap once: `npx aws-cdk@latest bootstrap aws://YOUR_ACCOUNT_ID/us-east-1` |
| Backend build: other IAM / AccessDenied | Add `AdministratorAccess-Amplify` to the service role |
| `ampx` not found | Root `package.json` includes `@aws-amplify/backend-cli` |
| Admin save fails / not authorized | User must be in Cognito `admin` group; use `/admin/login` |
| Admin save **400** / `variants` or `specs` invalid | AppSync **AWSJSON** fields must be sent as JSON **strings**, not raw objects/arrays. Empty arrays → `null`. See `toJsonField()` in `src/lib/productPayload.ts`. Redeploy frontend after fix. |
| Shop still shows seed only | Run `npm run seed`; confirm `Product.list()` returns rows in browser network tab |
| Image upload fails | Sign in as admin; set slug before upload; check S3 path `products/{slug}/…` |
| Empty `amplify_outputs.json` in prod | Backend phase must succeed before frontend build |
| **`/admin/login` or `/shop` returns 404** | SPA rewrite missing or wrong type. Use **200 rewrite** (not only `404-200`). Apply [`scripts/amplify-custom-rules.json`](../scripts/amplify-custom-rules.json) via `aws amplify update-app --custom-rules file://scripts/amplify-custom-rules.json` |

## What Option B does not include yet

- Stripe live checkout (**M3**)
- Customer accounts (**M4**)
- Admin dashboard + stats (**M5**)
- Promo codes (**M6**)
- Hidden Vault (**M7**)
- Runtime announcements (**M8**)
- Gallery page (**M9**)

See [project-plans/milestones.md](../project-plans/milestones.md).
