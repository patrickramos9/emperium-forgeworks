import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "productImages",
  access: (allow) => ({
    "products/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read"]),
      /** Post-confirmation adds shoppers to `customer`; they use the group IAM role for Storage. */
      allow.groups(["customer"]).to(["read"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
  }),
});
