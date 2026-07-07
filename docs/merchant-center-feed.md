# Google Merchant Center feed (M13a)

**Status:** **Production verified** 2026-07-07 — public `products/*` URLs work in storefront and for feed export.

Product images for **Google Ads / Merchant Center** must be **stable, anonymously readable URLs**. Presigned S3 links expire and will be rejected.

## How it works

1. **Backend** (`amplify/backend.ts`) — S3 bucket policy allows anonymous `s3:GetObject` on **`products/*` only**.  
   `print-jobs/`, customer uploads, and admin-only prefixes stay private.

2. **Stable URLs** — `src/lib/publicProductImageUrl.ts` builds:
   ```
   https://{bucket}.s3.{region}.amazonaws.com/products/{slug}/{filename}.jpg
   ```

3. **Storefront** — catalog images under `products/*` use these public URLs (no presigning).

4. **Feed export** — `npm run export:merchant-feed` → `docs/merchant-center-feed.csv`

## Deploy (required once)

Push and let Amplify **backend** `pipeline-deploy` finish. The bucket policy is applied on deploy — not frontend-only.

After deploy, verify a product image opens in a **private/incognito** browser window (no login).

## Generate the feed

```bash
npm run export:merchant-feed
```

Upload `docs/merchant-center-feed.csv` to Merchant Center (Products → Feeds), or paste one row into Google's template sheet.

Append a single product to an existing Google template:

```bash
npx tsx scripts/append-merchant-feed-product.ts "C:\path\to\feed.csv"
```

## Excluded from feed

- `vaultOnly` products
- `printing-as-a-service` (print service backing SKU)
- Products without a `products/*` image path

## Later (M13 remainder)

- Merchant Center **Product API** sync on admin save (no manual CSV)
- GA4 / pixel hardening, newsletter, UTM on orders

See `project-plans/cursor-roadmap.md` § M13.
