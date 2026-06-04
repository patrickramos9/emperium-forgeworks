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

Configure shipping in **Admin → Shipping** (profiles), then assign each product’s profile on **Admin → Products → Edit** (Etsy-style). Mark one profile as **store default** for products without an assignment. Set **ready to ship** min/max days on each profile (use a separate profile for longer lead times, e.g. large orders). No rates are hardcoded in code.

Optional **estimated arrival** at Stripe Checkout (transit after ship) is planned for a later milestone; schema fields exist but there is no admin UI yet.

**Product page shipping:** On each product save, admin copies shipping copy onto the product (`shippingDisplay`). Re-save products after changing profiles so the PDP shows shipping without relying on a second API call.

## Promo grants (M6)

**Issuance today (M6 core only):**

| Source | How it fires |
|--------|----------------|
| **admin** | On template edit → **Issue grant** with customer email |
| **thank_you** | Stripe webhook after order is **Paid**; exactly one active template with **Use for thank-you** |

**Planned later:** `favorite` (M6b), `abandoned_cart` (M6c), abandoned-cart email (M6d). The schema already has those `source` values; no triggers or UI for them yet.

- Configure templates in **Admin → Promo templates**. Mark one as **thank-you** to issue a grant after each paid order.
- Issue admin grants by customer email on the template edit page.
- Customers must **sign in**; the best eligible grant auto-applies on the cart (discount on subtotal before shipping).
- Deactivating a template stops new grants; existing unused grants remain until used, expired, or revoked.

**If cart shows no discount but admin issued a grant:** signed-in customers must be allowed to **read** `PromoTemplate` (not only `PromoGrant`). Without that, the cart cannot load discount rules and checkout stays full price. After any `amplify/data` auth change, **redeploy the backend** and hard-refresh the storefront.

**Stripe line copy** (was/now descriptions) lives in the `create-stripe-checkout` Lambda — redeploy backend after changing it, not frontend-only.

## Local development

Keep `VITE_APP_ENV=local` in `.env.local` — checkout stays **mock** (no Stripe keys required).

## Test mode

Use `sk_test_…` and Stripe test cards. Create a separate webhook endpoint in Stripe **test mode** pointing at the same Function URL (or use Stripe CLI to forward webhooks locally during sandbox testing).
