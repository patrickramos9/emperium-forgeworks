# Data models

All models are defined in [`amplify/data/resource.ts`](../../amplify/data/resource.ts) and stored in **DynamoDB** behind **AWS AppSync**. The GraphQL schema is generated from the Amplify schema definition.

**Default authorization mode:** `identityPool` (see [authentication-and-authorization.md](./authentication-and-authorization.md)).

---

## Entity relationship (logical)

```text
Product ──────────────┐
                      │ (referenced in JSON snapshots)
Order ────────────────┼── Review (1:1, PK = orderId)
  └── userId ─────────┘
VaultAccess (userId → Cognito sub)
Notification ── NotificationRead (composite PK)
Announcement (standalone)
```

---

## Models

### Product

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | ID | auto | Amplify default PK |
| `slug` | string | yes | URL key `/shop/:slug` |
| `title` | string | yes | |
| `subtitle` | string | | |
| `description` | string | | PDP body |
| `lore` | string | | PDP lore section |
| `category` | string | yes | Filter on shop |
| `priceCents` | integer | yes | Base price |
| `badges` | string[] | | |
| `images` | string[] | | S3 keys or URLs |
| `detailImage` | string | | |
| `variants` | JSON | | Variation groups (Etsy-style) |
| `specs` | JSON | | HUD specs on PDP |
| `inStock` | boolean | | default `true` |
| `featured` | boolean | | default `false` |
| `sortOrder` | integer | | default `0` |
| `vaultOnly` | boolean | | Hidden from `/shop` when `true` |
| `createdAt` / `updatedAt` | datetime | auto | |

**Auth:** guest + authenticated **read**; **admin** full CRUD.

---

### Order

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | ID | auto | |
| `externalSessionId` | string | yes | Mock or Stripe session id |
| `paymentProvider` | enum | | `mock` \| `stripe` |
| `status` | enum | | `pending` \| `paid` \| `failed` |
| `userId` | string | | Cognito `sub` when signed in |
| `email` | string | | Deprecated; not collected |
| `lineItems` | JSON | | `OrderLineItemSnapshot[]` stringified |
| `totalCents` | integer | yes | |

**Line item snapshot shape** (`src/lib/orderLineItems.ts`):

```typescript
{
  productId: string;
  slug: string;
  variantId?: string;
  title: string;
  quantity: number;
  priceCents: number;
}
```

**Auth:** guest + authenticated **create**; owner **read** (`userId` = `sub`); **admin** read + update.

---

### Announcement

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | |
| `body` | string | yes | |
| `kind` | enum | | `promo` (shop card) \| `system` (site banner) |
| `pinned` | boolean | | |
| `active` | boolean | | default `true` |
| `startsAt` / `endsAt` | datetime | | Schedule window |
| `sortOrder` | integer | | |

**Auth:** guest + authenticated **read**; **admin** CRUD.

---

### Notification

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | |
| `body` | string | yes | |
| `kind` | enum | | `system` \| `order` \| `marketing` |
| `userId` | string | | If set, **targeted** inbox only |
| `active` | boolean | | default `true` |
| `startsAt` / `endsAt` | datetime | | |
| `sortOrder` | integer | | |

**Auth:** authenticated **read**; **admin** CRUD. Create via admin UI or app code (e.g. vault grant).

---

### NotificationRead

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `notificationId` | ID | yes | PK (composite) |
| `userId` | string | yes | PK (composite) |
| `readAt` | datetime | yes | |

**Auth:** owner read/create/update; admin read.

---

### Review

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `orderId` | ID | yes | **Primary key** — one review per order |
| `userId` | string | yes | Reviewer |
| `rating` | integer | yes | 1–5 |
| `text` | string | yes | min 10 chars (app validation) |
| `displayName` | string | | Public byline |
| `approved` | boolean | | default `false` — moderation |

**Auth:** guest + authenticated read; owner create; **admin** full access.

---

### VaultAccess

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `accessKey` | string | yes | **Primary key** (admin-generated token) |
| `userId` | string | yes | Cognito `sub` |
| `userEmail` | email | yes | |
| `active` | boolean | | default `true` |

**Auth:** guest read; owner read; **admin** CRUD.

---

### Sculptor

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `slug` | string | yes | Primary key — `/sculptors/:slug` |
| `name` | string | yes | |
| `logo` | string | | S3 path under `sculptors/{slug}/…` |
| `description` | string | | |
| `myMiniFactoryUrl` | url | | |
| `patreonUrl` | url | | |
| `instagramUrl` | url | | |
| `facebookUrl` | url | | |
| `xUrl` | url | | |
| `active` | boolean | | default `true`; inactive = “Coming Soon” on home |
| `sortOrder` | integer | | default `0` |

**Auth:** guest + authenticated **read**; **admin** CRUD.

---

## Custom GraphQL types (no DynamoDB table)

Used only as query return shapes — see [api-reference.md](./api-reference.md).

- `CustomerListItem`, `CustomerListResult`
- `CustomerLookupResult`
- `Ga4DashboardMetric`, `Ga4DashboardDimensionRow`, `Ga4DashboardTrendPoint`, `Ga4DashboardResult`

---

## Indexes and queries

Amplify Gen 2 generates GSIs as needed for `list` filters (e.g. `userId` on `NotificationRead`, `VaultAccess`). Client code paginates with `nextToken` where lists can grow (orders, notifications, reviews).

**Client-side filtering** (no GSI):

- Active announcements/notifications (date + `active` flag) — `src/lib/announcements.ts`, `notificationService.ts`
- Approved reviews on storefront — `reviewService.ts`

---

## Service layer mapping

| Domain | TypeScript module |
|--------|-------------------|
| Orders | `src/services/orderService.ts` |
| Notifications | `src/services/notificationService.ts` |
| Reviews | `src/services/reviewService.ts` |
| Sculptors | `src/services/sculptorService.ts` |
| Admin analytics | `src/services/adminAnalyticsService.ts` |
| Checkout | `src/services/checkoutService.ts` |
