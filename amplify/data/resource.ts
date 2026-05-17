import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
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
      variants: a.json(),
      specs: a.json(),
      inStock: a.boolean().default(true),
      featured: a.boolean().default(false),
      sortOrder: a.integer().default(0),
    })
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.group("admin"),
    ]),

  Order: a
    .model({
      externalSessionId: a.string().required(),
      paymentProvider: a.enum(["mock", "stripe"]),
      status: a.enum(["pending", "paid", "failed"]),
      email: a.string(),
      lineItems: a.json(),
      totalCents: a.integer().required(),
    })
    .authorization((allow) => [
      allow.group("admin").to(["read"]),
      allow.authenticated().to(["create", "read"]),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "identityPool",
  },
});
