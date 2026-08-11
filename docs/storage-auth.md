# Storage auth (product images)

This issue has broken signed-in catalog images more than once. Use this doc when touching S3, Cognito groups, or product images.

## Two different auth systems

| Layer | Signed-out | Signed-in shopper | Admin |
|-------|------------|-------------------|-------|
| **AppSync / Product** | IAM guest | **userPool** | userPool + `admin` group |
| **S3 / product images** | IAM guest role | **customer group IAM role** | **admin group IAM role** |

Shoppers are added to the **`customer`** Cognito group on sign-up (`postConfirmation` Lambda). For Storage, that means the **customer group identity-pool role** — not a generic “authenticated” role.

If `products/*` only allows `guest` + `admin`, signed-in customers load products but **`getUrl()` fails** for images.

## Permanent frontend rule

**All storefront reads** of `products/*` go through `getPublicCatalogImageUrl()` in `src/lib/storefrontStorage.ts` (wraps Amplify `getUrl`). Do **not** import `@aws-sdk/credential-providers` in the frontend — it is Node-only and breaks the Vite build.

Admin **uploads** still use `uploadData()` in `productImageUpload.ts` (admin group needs `write` on `products/*`). Gallery uploads use `galleryImageUpload.ts` (`gallery/*`, admin write).

---

## Path summary

| Prefix | Guest / customer read | Admin write |
|--------|----------------------|-------------|
| `products/*` | yes (+ public bucket policy URLs) | yes |
| `sculptors/*` | yes | yes |
| `reviews/*` | yes | yes |
| `gallery/*` | yes (+ public bucket policy URLs) | yes |
| `print-jobs/{entity_id}/*` | yes (also guest write for uploads) | yes |

Partner sculptor uploads use `uploadData()` under `sculptors/{slug}/…` — **`customer`** and **`authenticated`** roles need `write` on `sculptors/*` (see `amplify/storage/resource.ts`).

Print service STL/ZIP uploads use `uploadData()` under `print-jobs/{identityId}/…` — the **`customer`** group role needs **`write`** on `print-jobs/{entity_id}/*`. `allow.entity("identity")` alone is **not** enough for signed-in shoppers (same group-role precedence as product images). **Guests** also need **`write`** on that path for M6e guest print uploads (unauthenticated identity pool `identityId`).

## Public catalog images (M13 — Google Merchant / Ads)

**`products/*`** and **`gallery/*`** objects are anonymously readable via S3 bucket policy (see `amplify/backend.ts`). Stable URL shape:

```
https://{bucket}.s3.{region}.amazonaws.com/products/{slug}/{file}.jpg
https://{bucket}.s3.{region}.amazonaws.com/gallery/{file}.jpg
```

Built in `src/lib/publicProductImageUrl.ts`. Used by the storefront, customer Gallery, and `npm run export:merchant-feed`.

**Not public:** `print-jobs/*`, `reviews/*`, `sculptors/*` (still IAM/presigned as before).

See [merchant-center-feed.md](./merchant-center-feed.md).

## Backend rules (`amplify/storage/resource.ts`)

`products/*` must grant read to every role that might call Storage:

- `guest` — signed-out shoppers
- `authenticated` — users not yet in a group
- `customer` group — normal signed-in shoppers (**required**)
- `admin` group — admin gallery upload/delete

After changing storage, **redeploy the Amplify backend** and commit the updated `amplify_outputs.json`.

## CI guard

`npm run check:storage` compares `amplify/storage/resource.ts` to `amplify_outputs.json` and fails the build if they drift. This runs as part of `npm run build`.

## Checklist when images break again

1. Signed in as a **customer** (not only guest)?
2. Does `amplify_outputs.json` → `storage.buckets[0].paths["products/*"]` include `groupscustomer` with `get`/`list`?
3. Was the backend deployed after the last storage change?
4. Did the latest deploy include an updated `amplify_outputs.json` with `groupscustomer` read?
