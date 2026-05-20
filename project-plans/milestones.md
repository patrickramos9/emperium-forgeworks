# Upcoming Milestones

Roadmap in rough priority order. Each milestone should be shippable independently where possible (incremental deploys).

---

## M1 — Public preview (Option A) 🎯 *current*

**Goal:** Site reachable on HTTPS with correct UI.

| Task | Notes |
|------|--------|
| Connect GitHub → Amplify Hosting | Branch `main`, use `amplify.yml` |
| Set build env vars | `VITE_APP_ENV=local`, `VITE_SITE_DOMAIN`, then `VITE_SITE_URL` after first URL |
| Verify routes | `/`, `/shop`, PDP, `/process`, `/cart` |
| Optional: custom domain later | Route 53 + Amplify domain management |

**Exit criteria:** Stakeholders can review the storefront on an Amplify URL without running locally.

---

## M2 — Backend in the cloud (Option B)

**Goal:** Catalog and admin backed by DynamoDB + S3; no redeploy to change products.

| Task | Notes |
|------|--------|
| Run `npm run sandbox` (or pipeline-deploy in CI) | Generate real `amplify_outputs.json` |
| Extend `amplify.yml` with backend build phase | Per Amplify Gen 2 fullstack docs |
| `npm run seed` against deployed API | 8 products → DynamoDB |
| Wire storefront to live `Product.list()` | Remove seed-only dependency in prod |
| Create Cognito admin user + `admin` group | `/admin/login` works |
| Admin: product CRUD + image upload to S3 | List, create, edit, delete |
| Inventory flags | `inStock` (and variants) editable in admin |

**Exit criteria:** Change a product title in admin → shop updates without frontend redeploy.

---

## M3 — Cart & checkout (production-ready)

**Goal:** Reliable purchase flow with minimal PII on our side.

| Task | Notes |
|------|--------|
| Harden cart UX | persistence, empty states, quantity limits |
| Stripe account + `StripePaymentProvider` | Implement `createCheckoutSession` |
| Lambda checkout + webhook | Confirm payment, update `Order.status` |
| Order model privacy review | Drop or minimize stored email; rely on Stripe for receipts where possible |
| Fulfillment workflow | Admin view of paid orders (or Stripe Dashboard as primary) |
| Production env | `VITE_APP_ENV=deployment`, secrets in Amplify/Lambda |

**Exit criteria:** Test purchase end-to-end; order visible in Stripe; fulfillment data only as needed.

---

## M4 — Runtime content & operations

**Goal:** News and announcements without code changes.

| Task | Notes |
|------|--------|
| Data model for **Announcement** / **News** | Title, body, dates, pinned, active flag |
| Admin UI to publish/edit | Forge announcement, home hero copy (optional) |
| Shop + home consume API | Replace hardcoded announcement blocks |
| Featured collections (optional) | DB-driven or tagged products |

**Exit criteria:** Post a “new sculpt drop” from admin; appears on site immediately.

---

## M5 — Polish & growth

| Task | Notes |
|------|--------|
| **Gallery** page | If still desired; separate from shop catalog |
| SEO / meta tags | Per route, OG images |
| Email capture (newsletter) | Integrate provider; avoid storing raw emails in DynamoDB if possible |
| Analytics | Privacy-conscious (Plausible, GA4, etc.) |
| Performance | Image optimization, CDN for S3 |
| Etsy sync (optional) | Out of scope unless requested |

---

## Dependency sketch

```text
M1 (hosted UI) → M2 (database admin) → M3 (Stripe) → M4 (news) → M5 (polish)
```

M1 and local backend work (sandbox on a dev machine) can overlap before M2 is in CI.
