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
| `deployment` + `STRIPE_SECRET_KEY` | Real Stripe Checkout (implement webhook in Lambda when ready) |

## Domain (emperiumforgeworks.com)

1. In **Amplify Hosting**, connect this repo and use `amplify.yml`.
2. In **Route 53**, point `emperiumforgeworks.com` to the Amplify app URL or add the CNAME Amplify provides.
3. Set `VITE_SITE_URL=https://emperiumforgeworks.com` for production builds.

## Project layout

- `src/` — React app (shop, PDP, cart, admin)
- `packages/shared/` — `PaymentProvider` interface + mock/Stripe implementations
- `amplify/` — Auth, DynamoDB models, S3 storage
- `legacy/stitch_export/` — Original Stitch HTML reference

## Security

Do not commit `.env.local` or AWS keys. If credentials were ever shared in chat, rotate them in IAM immediately.
