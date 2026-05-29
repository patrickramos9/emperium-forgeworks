# API reference

There is **no standalone REST API**. The application uses:

1. **AWS AppSync GraphQL** (Amplify Data) — models + custom queries  
2. **Amazon Cognito** — authentication APIs (via Amplify Auth)  
3. **Amazon S3** — product image upload/download (Amplify Storage)  

The frontend calls GraphQL through `generateClient<Schema>()` from `aws-amplify/data`.

---

## GraphQL access modes

| Mode | When used |
|------|-----------|
| `iam` | Guest catalog, guest checkout, public reads |
| `userPool` | Signed-in customer or admin (JWT) |

Helper: [`src/lib/amplifyDataClient.ts`](../../src/lib/amplifyDataClient.ts).

---

## Custom queries (Lambda-backed)

Defined in [`amplify/data/resource.ts`](../../amplify/data/resource.ts). **Admin group only.**

### `listCustomers`

Paginated list of users in the Cognito **`customer`** group.

**Arguments**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `emailFilter` | string | no | — | Substring match on email (case-insensitive) |
| `nextToken` | string | no | — | Cognito pagination token |
| `limit` | integer | no | 25 | Max items (1–60) |

**Returns:** `CustomerListResult`

```typescript
{
  items: { userId: string; email: string }[];
  nextToken?: string;
}
```

**Errors:** `USER_POOL_ID` missing; Cognito API failures.

**Frontend:** `src/lib/customerAdmin.ts` — admin vault customer picker.

---

### `lookupCustomerByEmail`

Resolve a single customer by exact email.

**Arguments**

| Name | Type | Required |
|------|------|----------|
| `email` | AWSEmail | yes |

**Returns:** `CustomerLookupResult`

```typescript
{ userId: string; email: string }
```

**Errors:** Email required; no user found.

---

### `getGa4Dashboard`

Fetch GA4 analytics for the admin dashboard (5-minute Lambda cache).

**Arguments**

| Name | Type | Required | Format |
|------|------|----------|--------|
| `startDate` | string | yes | `YYYY-MM-DD` |
| `endDate` | string | yes | `YYYY-MM-DD` |

**Returns:** `Ga4DashboardResult`

```typescript
{
  startDate: string;
  endDate: string;
  metrics: { key: string; label: string; value: string }[];
  trend: { date: string; sessions: number; users: number; pageViews: number }[];
  topProducts: { name: string; value: string }[];   // slug → view count
  lowProducts: { name: string; value: string }[];
  topPages: { name: string; value: string }[];
  topSources: { name: string; value: string }[];
  topDevices: { name: string; value: string }[];
  topCountries: { name: string; value: string }[];
  fetchedAt: string;  // ISO datetime
}
```

**Metric keys (examples):** `activeUsers`, `sessions`, `bounceRate`, `averageSessionDuration`, `screenPageViews`, `conversions`.

**Errors:** Invalid date format; missing GA4 env vars; `PERMISSION_DENIED` (service account not on property).

**Frontend:** `src/services/adminAnalyticsService.ts`.

---

## Model operations (generated)

Standard Amplify Data operations per model: `create`, `get`, `update`, `delete`, `list`. Exact GraphQL operation names are generated at deploy time.

### Common patterns

**Create order (checkout)**

```typescript
client.models.Order.create({
  externalSessionId: string,
  paymentProvider: "mock",
  status: "paid",
  lineItems: JSON.stringify(snapshots),
  totalCents: number,
  userId?: string,  // if signed in
});
```

**List customer orders**

```typescript
client.models.Order.list({ limit: 50, nextToken });
// Owner auth filters to current user's orders when using userPool
```

**Create review**

```typescript
client.models.Review.create({
  orderId: string,      // PK
  userId: string,
  rating: 1..5,
  text: string,
  displayName?: string,
  approved: false,
});
```

**Approve review (admin)**

```typescript
client.models.Review.update({ orderId, approved: true });
```

**Grant vault access (admin)**

```typescript
client.models.VaultAccess.create({
  accessKey: string,
  userId: string,
  userEmail: string,
  active: true,
});
```

---

## Cognito trigger (not GraphQL)

### `postConfirmation` — `add-customer-to-group`

| | |
|--|--|
| **Trigger** | Post-confirmation sign-up |
| **Action** | `AdminAddUserToGroup` → `customer` |
| **Handler** | `amplify/functions/add-customer-to-group/handler.ts` |

---

## Frontend routes (SPA)

All routes are client-side (`react-router-dom`). No server-side rendering.

### Storefront (with `Layout` + header/footer)

| Method | Path | Page | Auth |
|--------|------|------|------|
| GET | `/` | Home | Public |
| GET | `/shop` | Shop catalog | Public |
| GET | `/shop/:slug` | Product detail | Public |
| GET | `/vault` | Hidden Vault catalog | Signed-in + `VaultAccess` |
| GET | `/vault/:slug` | Vault PDP | Same |
| GET | `/about` | About / process story | Public |
| GET | `/process` | Redirect → `/about` | — |
| GET | `/shipping-returns` | Policies | Public |
| GET | `/reviews` | All approved reviews | Public |
| GET | `/cart` | Cart | Public |
| GET | `/account` | Account hub | Customer |
| GET | `/account/orders` | Order history | Customer |
| GET | `/account/orders/:orderId/review` | Submit review | Customer |
| GET | `/account/notifications` | Notification inbox | Customer |

### Auth pages (no main layout)

| Path | Page |
|------|------|
| `/account/login` | Sign in |
| `/account/register` | Sign up |
| `/account/forgot-password` | Password reset |
| `/admin/login` | Admin sign in |

### Checkout

| Path | Page |
|------|------|
| `/checkout/success` | Order confirmation |
| `/checkout/cancel` | Cancelled checkout |

### Admin (`AdminLayout`)

| Path | Page |
|------|------|
| `/admin` | Dashboard + GA4 |
| `/admin/products` | Product list |
| `/admin/products/:slug` | Product edit (`new` = create) |
| `/admin/orders` | Order list |
| `/admin/orders/:id` | Order detail |
| `/admin/announcements` | Announcement list |
| `/admin/announcements/:id` | Edit (`new` = create) |
| `/admin/notifications` | Notification list |
| `/admin/notifications/:id` | Edit (`new` = create) |
| `/admin/reviews` | Review moderation |
| `/admin/vault` | Vault grants |
| `/admin/promos` | Coming soon (M6) |
| `/admin/settings` | Coming soon |

---

## Storage API (S3)

| Operation | Path pattern | Auth |
|-----------|--------------|------|
| Read (catalog URLs) | `products/*` | Guest IAM via `getPublicCatalogImageUrl()` |
| Upload / delete | `products/*` | Admin group (product editor) |

Bucket name from `amplify_outputs.json` → `storage.productImages.bucket`.

---

## Payment provider interface (client-only)

Not HTTP — implemented in `packages/shared`:

```typescript
interface PaymentProvider {
  name: "mock" | "stripe";
  createCheckoutSession(
    items: CheckoutLineItem[],
    options?: { customerEmail?: string },
  ): Promise<{ sessionId: string; redirectUrl: string; paymentProvider: "mock" | "stripe" }>;
}
```

**Mock:** Immediate redirect to `/checkout/success`; `checkoutService` persists `Order`.  
**Stripe (planned):** Redirect to Stripe Checkout; webhook updates order (M3b).

---

## Error handling convention

Services throw `Error` with joined AppSync `errors[].message` strings. Pages catch and display in UI. Admin/data model missing → `dataModels.ts` deploy hint message.
