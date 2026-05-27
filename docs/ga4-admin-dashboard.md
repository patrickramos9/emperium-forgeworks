# GA4 admin dashboard

Admin traffic stats come from the **GA4 Data API** via the `getGa4Dashboard` Lambda (admin-only GraphQL query).

## Amplify environment variables (backend)

Set these in **Amplify Console → App settings → Environment variables** (all branches that deploy backend):

| Name | Value |
|------|--------|
| `GA4_PROPERTY_ID` | `539229345` |
| `GA4_CLIENT_EMAIL` | Service account email from Google Cloud JSON |
| `GA4_PRIVATE_KEY` | Full private key as **one line** with `\n` between lines (not literal line breaks) |

Redeploy the **backend** after changing these variables.

## Google Cloud setup

1. Enable **Google Analytics Data API** on the GCP project that owns the service account.
2. In **GA4 → Admin → Property access management**, add the service account email with **Viewer** (or Analyst).
3. Confirm the numeric property ID matches `GA4_PROPERTY_ID`.

## Deploy

1. Push to `main` (triggers backend `pipeline-deploy`, then frontend build).
2. Backend deploy must succeed before the admin dashboard can load GA4 data.
3. After deploy, download/commit `amplify_outputs.json` if you develop locally against cloud.

## Verify in admin

1. Sign in at `/admin/login` as a user in the **`admin`** Cognito group.
2. Open **Dashboard**.
3. Under **Traffic (GA4)**:
   - Pick a date range (defaults to last 30 days).
   - Metric cards and top lists should populate within a few seconds.
4. Reload the page — data should refresh (session cache is bypassed on reload).

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `GA4_CLIENT_EMAIL is not configured` | Env vars missing on backend build; redeploy after adding them |
| `GA4_PRIVATE_KEY is not configured` | Same, or key pasted with real newlines instead of `\n` |
| Permission denied / 403 from Google | Service account not added in GA4 property access |
| Empty metrics, no error | Date range has no traffic yet |
| Query not found (`getGa4Dashboard`) | Backend not deployed; push and wait for backend phase |

## Local sandbox

With `GA4_*` in `.env.local` (never commit):

```bash
npm run sandbox
```

Sign in as admin and open `http://localhost:5173/admin`.
