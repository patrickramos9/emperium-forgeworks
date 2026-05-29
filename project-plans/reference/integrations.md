# Integrations

External systems and how they connect to the store.

---

## AWS Amplify (core)

| Capability | Integration point |
|------------|-------------------|
| Hosting | Git push → `amplify.yml` |
| Auth | `amplify/auth/resource.ts` |
| API + DB | `amplify/data/resource.ts` |
| Files | `amplify/storage/resource.ts` |

All runtime config flows through **`amplify_outputs.json`** after deploy.

---

## Amazon Cognito

- **Customer** accounts: self-service register, `customer` group on confirm.  
- **Admin** accounts: manual group assignment.  
- Admin Lambdas call `ListUsers` / `ListUsersInGroup` with IAM granted in `auth/resource.ts` `access()` block.

---

## Amazon S3 (`productImages`)

| Concern | Detail |
|---------|--------|
| Prefix | `products/*` |
| Public catalog read | Guest IAM via Amplify Storage `getUrl` |
| Upload | Admin product editor |
| Pitfall | Signed-in **customer** group needs explicit read rule — see [docs/storage-auth.md](../../docs/storage-auth.md) |

---

## Google Analytics 4

### Web measurement (storefront)

- gtag snippet in `index.html` (measurement ID configured in hosting).  
- SPA page views via `AnalyticsTracker` in `App.tsx`.

### Admin dashboard (server-side)

| Item | Detail |
|------|--------|
| API | GA4 Data API (`@google-analytics/data` in Lambda) |
| Auth | Service account JWT |
| Property ID | `539229345` (default in `backend.ts`) |
| Query | `getGa4Dashboard` GraphQL |
| Cache | 5 minutes in Lambda memory |
| Setup doc | [docs/ga4-admin-dashboard.md](../../docs/ga4-admin-dashboard.md) |
| Grant script | `npm run grant:ga4-access` |

**Product interest:** Parses `pagePath` for `/shop/:slug` and vault product paths to rank slugs.

---

## Payments

| Provider | Status | Package |
|----------|--------|---------|
| Mock | **Live** | `packages/shared` → `MockPaymentProvider` |
| Stripe | **Planned (M3b)** | `StripePaymentProvider` stub; blocked on EIN |

Checkout entry: `src/services/checkoutService.ts` → `createPaymentProvider(loadConfig(...))`.

**Future:** Stripe Checkout session, webhook Lambda to set `Order.status`, Google Pay via Stripe.

---

## Email

- Contact / commission: `mailto:melissa@emperiumforgeworks.com` (`CONTACT_EMAIL` in `config.ts`).  
- No transactional email integration yet (order confirm, review solicit, etc.).

---

## Newsletter

Home page form is **UI-only** (`preventDefault`) — no provider wired (M9 candidate).

---

## Hidden Vault (legacy note)

Older plans referenced a shared `VAULT_ACCESS_KEY` Lambda verify flow. **Current implementation** uses `VaultAccess` DynamoDB records only—no separate verify Lambda in `amplify/backend.ts`.

---

## Planned integrations (roadmap)

| Integration | Milestone | Notes |
|-------------|-----------|-------|
| Stripe + webhooks | M3b | Production payments |
| Sculptor partner links | M8c | MyMiniFactory, Patreon, social URLs |
| Print stage notifications | M11 | Tied to `Notification` model |
| Elegoo Saturn SDCP | M11b | Raspberry Pi on shop LAN → stage API |
| Admin–customer chat | M10 | Real-time optional v1 polling |
| Carrier tracking | Post-M11 | Shipping APIs |
| Forge Bridge B2B | Future | Pi product for other print shops |

---

## Third-party assets

- Legacy product/marketing images may load from external CDN URLs in `legacyAssets.ts` (Stitch export hosts).  
- New uploads should prefer S3 via admin for long-term control.
