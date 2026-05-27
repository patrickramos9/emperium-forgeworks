import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "productImages",
  access: (allow) => ({
    "products/*": [
      allow.guest.to(["read"]),
      /** Signed-in customers/admins browse the shop with userPool credentials. */
      allow.authenticated.to(["read"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
  }),
});
