import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { listCustomers as listCustomersFn } from "../functions/list-customers/resource";
import { lookupCustomerByEmail as lookupCustomerByEmailFn } from "../functions/lookup-customer-by-email/resource";

const schema = a.schema({
  CustomerListItem: a.customType({
    userId: a.string().required(),
    email: a.string().required(),
  }),

  CustomerListResult: a.customType({
    items: a.ref("CustomerListItem").array().required(),
    nextToken: a.string(),
  }),

  CustomerLookupResult: a.customType({
    userId: a.string().required(),
    email: a.string().required(),
  }),

  listCustomers: a
    .query()
    .arguments({
      emailFilter: a.string(),
      nextToken: a.string(),
      limit: a.integer(),
    })
    .returns(a.ref("CustomerListResult"))
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(listCustomersFn)),

  lookupCustomerByEmail: a
    .query()
    .arguments({ email: a.email().required() })
    .returns(a.ref("CustomerLookupResult"))
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(lookupCustomerByEmailFn)),

  VaultAccess: a
    .model({
      /** Primary key — admin-defined, alphanumeric, max 20 chars. */
      accessKey: a.string().required(),
      userId: a.string().required(),
      userEmail: a.email().required(),
      active: a.boolean().default(true),
    })
    .identifier(["accessKey"])
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.ownerDefinedIn("userId").identityClaim("sub").to(["read"]),
      allow.group("admin"),
    ]),

  Product: a
    .model({
      slug: a.string().required(),
      title: a.string().required(),
      subtitle: a.string(),
      description: a.string(),
      lore: a.string(),
      category: a.string().required(),
      priceCents: a.integer().required(),
      badges: a.string().array(),
      images: a.string().array(),
      detailImage: a.string(),
      variants: a.json(),
      specs: a.json(),
      inStock: a.boolean().default(true),
      featured: a.boolean().default(false),
      sortOrder: a.integer().default(0),
      /** When true, product appears only in the Hidden Vault (not public /shop). */
      vaultOnly: a.boolean().default(false),
    })
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  Announcement: a
    .model({
      title: a.string().required(),
      body: a.string().required(),
      pinned: a.boolean().default(false),
      active: a.boolean().default(true),
      startsAt: a.datetime(),
      endsAt: a.datetime(),
      sortOrder: a.integer().default(0),
    })
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  Order: a
    .model({
      externalSessionId: a.string().required(),
      paymentProvider: a.enum(["mock", "stripe"]),
      status: a.enum(["pending", "paid", "failed"]),
      userId: a.string(),
      /** Deprecated — not collected; kept for schema compatibility. */
      email: a.string(),
      lineItems: a.json(),
      totalCents: a.integer().required(),
    })
    .authorization((allow) => [
      allow.guest().to(["create"]),
      allow.authenticated().to(["create"]),
      allow.ownerDefinedIn("userId").identityClaim("sub").to(["read"]),
      allow.group("admin").to(["read", "update"]),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "identityPool",
  },
});
