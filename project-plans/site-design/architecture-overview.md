# Architecture overview

## System context

Emperium Forgeworks is a **single-page application (SPA)** hosted on **AWS Amplify Hosting**. All business data lives in **AWS** (Cognito, DynamoDB via AppSync, S3). There is no custom Node/Express server in production—the browser talks directly to Amplify-managed services.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         Browser (React SPA)                              │
│  Storefront │ Account │ Cart/Checkout │ Admin portal                    │
└──────┬──────────────────┬─────────────────────┬─────────────────────────┘
       │                  │                     │
       │ GraphQL          │ Cognito Auth        │ S3 (images)
       ▼                  ▼                     ▼
┌──────────────┐   ┌──────────────┐      ┌──────────────┐
│ AppSync      │   │ User Pool    │      │ productImages│
│ (Amplify     │   │ + Identity   │      │ bucket       │
│  Data)       │   │ Pool         │      └──────────────┘
└──────┬───────┘   └──────────────┘
       │
       ▼
┌──────────────┐      ┌──────────────────────────────────┐
│ DynamoDB     │      │ Lambda (custom GraphQL resolvers)   │
│ tables       │◄─────│ listCustomers, lookupCustomer,    │
│              │      │ getGa4Dashboard, postConfirmation   │
└──────────────┘      └──────────────────────────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │ GA4 Data API │
                      │ (admin only) │
                      └──────────────┘
```

---

## Major subsystems

### Storefront

- Public catalog (`/shop`, PDP), marketing pages (`/`, `/about`, `/reviews`).
- **Cart** in React context (`localStorage` persistence).
- **Checkout** via `PaymentProvider` abstraction (`packages/shared`); mock flow creates `Order` records.
- **Hidden Vault** (`/vault`) — extra catalog gated by per-user `VaultAccess` grants (not a shared password in current code).

### Customer accounts

- Cognito email/password sign-up and sign-in.
- Post-confirmation Lambda adds users to the **`customer`** group.
- Signed-in users: order history, notification inbox, order reviews (paid orders).

### Admin portal (`/admin/*`)

- Separate login; user must be in Cognito **`admin`** group.
- CRUD for products, announcements, notifications, reviews moderation, vault grants, order status.
- Dashboard analytics from **GA4 Data API** (custom query + Lambda).

### Content runtime

Products, announcements, notifications, and reviews are **database-driven**—no frontend redeploy required for catalog or messaging changes.

---

## Data access patterns

The frontend uses **three Amplify Data clients** (see [authentication-and-authorization.md](./authentication-and-authorization.md)):

| Client helper | Auth mode | Typical use |
|---------------|-----------|-------------|
| `getGuestDataClient()` | IAM (guest) or userPool if signed in | Shop catalog, guest checkout, public reads |
| `getCustomerDataClient()` | userPool | Account orders, notifications, reviews |
| `getAdminDataClient()` | userPool + `admin` group | Admin CRUD, custom queries |

**Product images** use a dedicated path: `storefrontStorage.ts` resolves URLs via **guest IAM** so signed-in customers are not blocked by group-specific S3 policies. See [docs/storage-auth.md](../../docs/storage-auth.md).

---

## Key user flows

### Browse and purchase (mock)

```text
Shop → PDP → Add to cart → /cart → Checkout
  → MockPaymentProvider.createCheckoutSession()
  → Order.create (status: paid, lineItems JSON snapshot)
  → Redirect /checkout/success
```

### Customer sign-up

```text
/account/register → Cognito signUp → email confirm
  → postConfirmation Lambda → AdminAddUserToGroup("customer")
  → User can sign in and see owner-scoped orders
```

### Vault access

```text
Admin grants VaultAccess (userId + accessKey) on /admin/vault
  → createVaultAccessGrantedNotification() (targeted Notification)
Customer signs in → VaultAccess.list(active) → /vault unlocked in nav
```

### Review publication

```text
Paid order → /account/orders/:id/review → Review.create (approved: false)
Admin /admin/reviews → Approve
  → Home + /reviews show approved reviews only
```

---

## Repository layout (high level)

```text
emperiumforgeworks-store/
├── amplify/           # Gen 2 backend (auth, data, storage, Lambdas)
├── src/               # React application
├── packages/shared/   # PaymentProvider contracts + mock/Stripe stubs
├── scripts/           # seed, storage check, GA4 grant helper
├── docs/              # operational runbooks
├── project-plans/     # roadmap + this site-design folder
└── legacy/            # Stitch HTML design reference (not runtime)
```

---

## Planned architecture (roadmap)

| Milestone | Addition |
|-----------|----------|
| M3b | Stripe Checkout + webhooks → `Order.status` |
| M8c | `Sculptor` model + public `/sculptors/:slug` |
| M10 | Admin–customer chat (Conversation / Message models) |
| M11 | Print progress tracker (`PrintJob` + stage enum) |
| M11b | Raspberry Pi SDCP bridge → stage API (shop LAN) |
| M12 | Per-user notification preferences |

See [milestones.md](../milestones.md).
