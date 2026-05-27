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

**All storefront reads** of `products/*` go through `getPublicCatalogImageUrl()` in `src/lib/storefrontStorage.ts`. It always uses the identity pool **guest** role, which is allowed to read the public catalog regardless of sign-in.

Do **not** call `getUrl()` directly for catalog images elsewhere.

Admin **uploads** still use `uploadData()` in `productImageUpload.ts` (admin group needs `write` on `products/*`).

## Backend rules (`amplify/storage/resource.ts`)

`products/*` must grant read to every role that might call Storage:

- `guest` — storefront image URLs (via guest IAM helper)
- `authenticated` — users not yet in a group
- `customer` group — normal signed-in shoppers (default `getUrl` if used)
- `admin` group — admin gallery upload/delete

After changing storage, **redeploy the Amplify backend** and commit the updated `amplify_outputs.json`.

## CI guard

`npm run check:storage` compares `amplify/storage/resource.ts` to `amplify_outputs.json` and fails the build if they drift. This runs as part of `npm run build`.

## Checklist when images break again

1. Signed in as a **customer** (not only guest)?
2. Does `amplify_outputs.json` → `storage.buckets[0].paths["products/*"]` include `groupscustomer` with `get`/`list`?
3. Was the backend deployed after the last storage change?
4. Is the site build using current `storefrontStorage.ts` (guest `getUrl`)?
