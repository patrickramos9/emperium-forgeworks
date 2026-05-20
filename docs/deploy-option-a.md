# Deploy Option A — Amplify Hosting (frontend only)

Static hosting for the React storefront. Catalog uses **seed data** baked into the build. Admin, DynamoDB, and live checkout come later (Option B).

## Prerequisites

- AWS account with billing enabled
- GitHub repo pushed: `patrickramos9/emperium-forgeworks`
- **Rotated** IAM access keys (never use keys that were pasted in chat)

## 1. Create the Amplify app

1. Open [Amplify Console](https://console.aws.amazon.com/amplify/home) → **Create new app** → **Host web app**.
2. Connect **GitHub** → authorize → select **emperium-forgeworks** → branch **main**.
3. App name: e.g. `emperium-forgeworks`.
4. Build settings: Amplify should detect **`amplify.yml`** at the repo root. Leave as-is.
5. **Do not** enable fullstack/backend deploy for now (frontend only).

## 2. Environment variables

In Amplify → your app → **Hosting** → **Environment variables** → add:

| Name | Value (first deploy) |
|------|----------------------|
| `VITE_APP_ENV` | `local` |
| `VITE_SITE_DOMAIN` | `emperiumforgeworks.com` |
| `VITE_SITE_URL` | *(leave empty first time, or use placeholder)* |

After the first successful deploy, copy the app URL (e.g. `https://main.d1abc2def3.amplifyapp.com`), set **`VITE_SITE_URL`** to that exact URL, then **Redeploy** the branch so checkout redirects use the right host.

## 3. SPA routing (if deep links 404)

`amplify.yml` includes a catch-all redirect to `index.html`. If `/shop` still 404s on refresh:

1. **Hosting** → **Rewrites and redirects** → **Manage redirects**
2. Add rule: source `/<*>` → target `/index.html` → type **200 (Rewrite)**

## 4. Deploy

Save and run the first build. Typical build time: 3–6 minutes.

When it finishes, open the **main** branch URL and check:

- `/` — home + banner
- `/shop` — The Vault
- `/shop/eldritch-dragon` — PDP
- `/process` — Process
- `/cart` — cart (mock checkout banner)

## 5. Incremental cadence (your workflow)

```text
local change → git commit → git push main → Amplify auto-builds → preview URL updates
```

Each push to `main` triggers a new build. Use **PR previews** later if you want branch URLs before merging.

## 6. Custom domain (later)

When ready for `emperiumforgeworks.com`:

1. Amplify → **Domain management** → add domain.
2. Route 53 or your DNS: point to Amplify’s CNAME.
3. Set `VITE_SITE_URL=https://emperiumforgeworks.com` and redeploy.

## What Option A does *not* include yet

- Cognito admin login (needs backend deploy)
- DynamoDB catalog / S3 uploads
- Real or persisted mock orders in the cloud

Next step when you’re ready: **Option B** — `npm run sandbox` locally, then extend `amplify.yml` with a backend `pipeline-deploy` phase.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on `npm ci` | Confirm `package-lock.json` is committed |
| Blank page | Check build logs; open browser devtools console |
| `/shop` 404 on refresh | Add SPA rewrite (step 3) |
| Wrong checkout redirect URL | Set `VITE_SITE_URL` to the Amplify URL and redeploy |
