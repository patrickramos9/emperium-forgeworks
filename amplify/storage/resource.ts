/**
 * Product image bucket. Keep in sync with docs/storage-auth.md.
 *
 * Shoppers land in the `customer` Cognito group → identity pool uses
 * groupscustomer IAM for Storage, not generic authenticated.
 * Grant read on products/* and sculptors/* for guest, authenticated, customer, and admin.
 */
import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "productImages",
  access: (allow) => ({
    "products/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read"]),
      allow.groups(["customer"]).to(["read"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
    "sculptors/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read", "write", "delete"]),
      allow.groups(["customer"]).to(["read", "write", "delete"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
    "reviews/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read"]),
      allow.groups(["customer"]).to(["read"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
    "print-jobs/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
  }),
});
