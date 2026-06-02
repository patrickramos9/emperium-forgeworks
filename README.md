# Emperium Forgeworks Store

React storefront for [emperiumforgeworks.com](https://emperiumforgeworks.com) with AWS Amplify Gen 2 (catalog, admin, S3 images) and swappable checkout (`MockPaymentProvider` locally, Stripe when configured).

## Quick start

> **Note:** If the project lives on Google Drive, `npm install` may fail or corrupt `node_modules`. Clone or copy the folder to a local disk (e.g. `C:\dev\emperium-store`) before installing.

```bash
npm install
cp .env.example .env.local
# Add AWS credentials to .env.local (never commit this file)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The catalog runs from seed data until Amplify sandbox is deployed.

## AWS Amplify sandbox

```bash
# Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY in .env.local or shell
npm run sandbox
```

After sandbox finishes, `amplify_outputs.json` is generated. Seed products:

```bash
npm run seed
```

### First admin user

1. Open the Cognito user pool created by sandbox (AWS Console).
2. Create a user with email/password.
3. Add the user to the `admin` group.
4. Sign in at `/admin/login`.

## Payments

| `VITE_APP_ENV` | Behavior |
|----------------|----------|
| `local` (default) | Mock checkout — creates order when Amplify is connected, no Stripe |
| `deployment` | Stripe Checkout via `createStripeCheckoutSession` Lambda + webhook |

See [docs/stripe-setup.md](docs/stripe-setup.md).

## QA

Manual regression checklist: **[docs/qa-test-plan.md](docs/qa-test-plan.md)** — feature-by-feature steps for production and local testing.

## Deploy

| Mode | Guide |
|------|--------|
| **Option A** — hosting only (seed catalog) | [docs/deploy-option-a.md](docs/deploy-option-a.md) |
| **Option B** — fullstack CI (DynamoDB + admin + S3) | [docs/deploy-option-b.md](docs/deploy-option-b.md) |

Production uses **Option B**: `amplify.yml` deploys the Gen 2 backend on each `main` build, then the Vite frontend.

```text
git push main  →  Amplify auto-builds from amplify.yml  →  https://main.<id>.amplifyapp.com
```

## Domain (emperiumforgeworks.com)

Production URL: **https://emperiumforgeworks.com**

Setup details: **[docs/connect-custom-domain.md](docs/connect-custom-domain.md)**

## Project plans

Planning docs live in **[project-plans/](project-plans/)**:

- [cursor-roadmap.md](project-plans/cursor-roadmap.md) — **authoritative** roadmap, current status, AI dev rules
- [reference/](project-plans/reference/) — architecture, API, data models, deployment
- [archive/](project-plans/archive/) — historical plans (not used for active development)

## Project layout

- `src/` — React app (shop, PDP, cart, admin)
- `packages/shared/` — `PaymentProvider` interface + mock/Stripe implementations
- `amplify/` — Auth, DynamoDB models, S3 storage
- `legacy/stitch_export/` — Original Stitch HTML reference

## Security

Do not commit `.env.local` or AWS keys. If credentials were ever shared in chat, rotate them in IAM immediately.
