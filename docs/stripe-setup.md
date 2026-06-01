# Stripe checkout (M3b)

Live payments use **Stripe Checkout** (hosted page). Card, Apple Pay, and Google Pay are enabled via Stripe `automatic_payment_methods`.

## Amplify environment variables

Set these in **Amplify Console → App settings → Environment variables** (branch `main`), then redeploy the **backend** phase.

| Name | Where used | Notes |
|------|------------|--------|
| `STRIPE_SECRET_KEY` | `create-stripe-checkout`, `stripe-webhook` Lambdas | Stripe Dashboard → Developers → API keys → **Secret key** (`sk_live_…` or `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` Lambda | From the webhook endpoint signing secret (`whsec_…`) |
| `VITE_APP_ENV` | Frontend build | Set to `deployment` to use Stripe (not mock checkout) |
| `VITE_SITE_URL` | Checkout success/cancel URLs | e.g. `https://emperiumforgeworks.com` |

`SITE_URL` for Lambdas is taken from `VITE_SITE_URL` at backend deploy time (see `amplify/backend.ts`).

## Webhook endpoint

After the first backend deploy with Stripe functions:

1. Open the deploy output or Amplify **Backend environments** → look for custom output **`stripeWebhookUrl`** (Function URL).
2. In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks), **Add endpoint**.
3. URL: the `stripeWebhookUrl` value.
4. Events: **`checkout.session.completed`** (and optionally `checkout.session.expired`).
5. Copy the **Signing secret** into Amplify as `STRIPE_WEBHOOK_SECRET`.
6. Redeploy backend if you added the secret after the first deploy.

## Flow

1. Customer checks out → frontend calls `createStripeCheckoutSession` mutation.
2. Lambda creates a **pending** `Order`, opens Stripe Checkout, stores `externalSessionId` = Stripe session id.
3. Customer pays on Stripe.
4. Stripe calls the webhook → order `status` set to **`paid`**, plus shipping and fulfillment fields.

## Shipping rates (M15)

Configure shipping in **Admin → Shipping** (profiles), then assign each product’s profile on **Admin → Products → Edit** (Etsy-style). Mark one profile as **store default** for products without an assignment. No rates are hardcoded in code.

## Local development

Keep `VITE_APP_ENV=local` in `.env.local` — checkout stays **mock** (no Stripe keys required).

## Test mode

Use `sk_test_…` and Stripe test cards. Create a separate webhook endpoint in Stripe **test mode** pointing at the same Function URL (or use Stripe CLI to forward webhooks locally during sandbox testing).
