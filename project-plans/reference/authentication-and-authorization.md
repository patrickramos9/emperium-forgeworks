# Authentication and authorization

## Cognito user pool

| Setting | Value |
|---------|--------|
| Login | Email + password |
| Groups | `admin`, `customer` |
| Post-confirmation | Lambda adds new users to **`customer`** |

Admins are created manually in Cognito and assigned to the **`admin`** group (not auto-assigned on sign-up).

---

## Identity pool (guest access)

Amplify Data default mode is **`identityPool`**. Unauthenticated visitors receive **guest IAM credentials** that map to GraphQL authorization rules using `allow.guest()`.

Signed-in users should use **`userPool`** mode so owner-based rules (`ownerDefinedIn("userId")`) apply correctly.

### M6e guest shopper identity (cookie + token)

Separate from Cognito IAM “guest” auth mode: a **stable shopper `guestId`** for carts/favorites/prints before sign-in.

| Piece | Role |
|-------|------|
| **`ensure-guest-session`** Function URL | Sets HttpOnly `efw_guest_id` cookie; returns `{ guestId, guestToken }` |
| **`guestToken`** | HMAC of `guestId` (`GUEST_SESSION_SECRET`) so AppSync mutations can verify identity (Function URL cookies are not sent to AppSync) |
| **`mergeGuestIdentity`** mutation | Authenticated; verifies token; merges guest rows into Cognito `sub` (stub until models have `guestId`) |
| **SPA** | Calls ensure on bootstrap; stores id/token in `localStorage`; merge on login/register |

Set **`GUEST_SESSION_SECRET`** in Amplify Hosting / pipeline env for production (do not rely on the dev fallback).

**Foundation verified** 2026-08-06 (ensure session + merge stub). **Guest cart sync** in repo 2026-08-06 (`GuestCartSnapshot` + guest `syncCartSnapshot`); verify after deploy.

---

## Frontend client selection

Implemented in [`src/lib/amplifyDataClient.ts`](../../src/lib/amplifyDataClient.ts):

### `getGuestDataClient()`

- If **signed in** (any user): returns `userPool` client.  
  Avoids IAM role mismatch on `/shop` when an admin or customer is logged in.
- If **signed out**: returns `iam` (guest) client.

Used for: catalog, announcements, guest checkout, public reviews list.

### `getCustomerDataClient()`

- Requires valid Cognito session (access token).
- **userPool** only.

Used for: order history, notifications, review submission, vault grant check.

### `getAdminDataClient()`

- Requires session **and** `admin` group membership (`src/lib/adminAuth.ts`).
- **userPool** only.

Used for: all `/admin/*` CRUD and custom queries.

### Session guards

| Helper | Behavior |
|--------|----------|
| `requireCustomerSession(navigate, returnTo?)` | Redirect to `/account/login` if no client |
| `requireAdminSession(navigate)` | Redirect to `/admin/login` if not admin |

---

## Authorization matrix (summary)

| Resource | Guest | Customer (auth) | Owner | Admin |
|----------|-------|-----------------|-------|-------|
| Product | read | read | — | CRUD |
| Announcement | read | read | — | CRUD |
| Order | create | create | read own | read, update |
| Notification | — | read | — | CRUD |
| NotificationRead | — | read/create/update own | own | read |
| Review | read | read, create | create own | CRUD |
| VaultAccess | read | read own grant | read own | CRUD |
| `listCustomers` | — | — | — | query |
| `lookupCustomerByEmail` | — | — | — | query |
| `getGa4Dashboard` | — | — | — | query |
| S3 `products/*` | read | read (via guest URL helper) | — | read/write/delete |

---

## Admin session policy

[`src/lib/adminSessionPolicy.ts`](../../src/lib/adminSessionPolicy.ts):

- **8-hour idle timeout** — activity tracked on click/keydown; expired sessions sign out and redirect with `?error=session_expired`.
- Cognito tokens still refresh (~1h access token); idle policy is app-level.

---

## Hidden Vault

**Current model:** permission-based, not a shared site password.

1. Admin creates `VaultAccess` row linking `userId` + `accessKey` + `active: true`.
2. Customer must be **signed in**; `userHasActiveVaultGrant()` lists active grants for their `sub`.
3. `useVaultGate` / `useVaultNavAccess` control `/vault` routes and nav link visibility.
4. Grant/re-enable triggers targeted **Notification** (`createVaultAccessGrantedNotification`).

Products with `vaultOnly: true` are excluded from public shop queries (`catalogFilter.ts`).

---

## Security notes

- Do not commit `amplify_outputs.json` secrets or `.env.local`.
- GA4 private key lives in Amplify environment variables only.
- Review model allows guest **read** — pending reviews are filterable client-side; do not expose `orderId` in public UI.
- Vault `accessKey` is an admin-managed identifier stored in DynamoDB; treat as sensitive operational data.

---

## Password policy (customer)

Validated in `src/lib/customerAuth.ts` to match Cognito:

- Minimum 8 characters  
- Upper, lower, number, symbol required  
