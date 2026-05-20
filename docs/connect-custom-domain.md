# Custom domain — emperiumforgeworks.com

The production site should be served at **https://emperiumforgeworks.com** (and **https://www.emperiumforgeworks.com**), not the default `*.amplifyapp.com` URL.

## What was configured (AWS)

| Step | Detail |
|------|--------|
| Amplify app | `d25csy1hf0rl22` (`emperium-forgeworks`) |
| Domain association | `emperiumforgeworks.com` + `www` → branch `main` |
| Route 53 zone | `Z01957413DFKOH609IFJ` |
| DNS | Apex **A (ALIAS)** + `www` **CNAME** → CloudFront (`d3pwibyhitk2ab.cloudfront.net`) |
| SSL | Amplify-managed certificate (ACM validation CNAME added) |
| Build env | `VITE_SITE_URL=https://emperiumforgeworks.com` |

Scripts used (for reference): `scripts/amplify-domain-input.json`, `scripts/route53-amplify-dns.json`, `scripts/amplify-env-update.json`.

## DNS propagation

After Route 53 changes, allow **5–30 minutes** (sometimes up to 48h globally) for:

1. Certificate status → **Available**
2. Domain association status → **AVAILABLE**
3. https://emperiumforgeworks.com/ loads the storefront

Check status:

```bash
aws amplify get-domain-association --app-id d25csy1hf0rl22 --domain-name emperiumforgeworks.com --region us-east-1 --query "domainAssociation.domainStatus"
```

## Amplify Console (optional checks)

1. [Amplify Console](https://console.aws.amazon.com/amplify/home) → **emperium-forgeworks** → **Hosting** → **Custom domains**
2. Confirm **emperiumforgeworks.com** shows **Available** (green)
3. **Environment variables** — `VITE_SITE_URL` = `https://emperiumforgeworks.com`

## Redirect old Amplify URL (optional)

The branch URL (`https://main.d25csy1hf0rl22.amplifyapp.com`) may still work until you add a redirect:

1. **Hosting** → **Rewrites and redirects** → add:
   - Source: `https://main.d25csy1hf0rl22.amplifyapp.com/<*>`
   - Target: `https://emperiumforgeworks.com/<*>`
   - Type: **302**

Or enable “Redirect to custom domain” if shown in the Custom domains UI.

## Email / Google Workspace

Existing **MX** and **TXT** records for Google were **not** changed. Only website (A/CNAME) and certificate validation records were added.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Certificate pending | Wait; confirm ACM validation CNAME exists in Route 53 |
| SSL error | Domain association must reach `AVAILABLE` |
| Wrong site / old build | Redeploy `main` after changing `VITE_SITE_URL` |
| www works but apex doesn’t | Confirm ALIAS A record on apex (not CNAME) |
