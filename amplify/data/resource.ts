import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { listCustomers as listCustomersFn } from "../functions/list-customers/resource";
import { lookupCustomerByEmail as lookupCustomerByEmailFn } from "../functions/lookup-customer-by-email/resource";
import { getGa4Dashboard as getGa4DashboardFn } from "../functions/get-ga4-dashboard/resource";

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

  Ga4DashboardMetric: a.customType({
    key: a.string().required(),
    label: a.string().required(),
    value: a.string().required(),
  }),

  Ga4DashboardDimensionRow: a.customType({
    name: a.string().required(),
    value: a.string().required(),
  }),

  Ga4DashboardTrendPoint: a.customType({
    date: a.string().required(),
    sessions: a.integer().required(),
    users: a.integer().required(),
    pageViews: a.integer().required(),
  }),

  Ga4DashboardResult: a.customType({
    startDate: a.string().required(),
    endDate: a.string().required(),
    metrics: a.ref("Ga4DashboardMetric").array().required(),
    trend: a.ref("Ga4DashboardTrendPoint").array().required(),
    topProducts: a.ref("Ga4DashboardDimensionRow").array().required(),
    lowProducts: a.ref("Ga4DashboardDimensionRow").array().required(),
    topPages: a.ref("Ga4DashboardDimensionRow").array().required(),
    topSources: a.ref("Ga4DashboardDimensionRow").array().required(),
    topDevices: a.ref("Ga4DashboardDimensionRow").array().required(),
    topCountries: a.ref("Ga4DashboardDimensionRow").array().required(),
    fetchedAt: a.datetime().required(),
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

  getGa4Dashboard: a
    .query()
    .arguments({
      startDate: a.string().required(),
      endDate: a.string().required(),
    })
    .returns(a.ref("Ga4DashboardResult"))
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(getGa4DashboardFn)),

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
      /** promo = shop card; system = site-wide top banner */
      kind: a.enum(["promo", "system"]),
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

  Notification: a
    .model({
      title: a.string().required(),
      body: a.string().required(),
      kind: a.enum(["system", "order", "marketing"]),
      /** When set, only this Cognito user (`sub`) sees the notification. Omit for broadcast. */
      userId: a.string(),
      active: a.boolean().default(true),
      startsAt: a.datetime(),
      endsAt: a.datetime(),
      sortOrder: a.integer().default(0),
    })
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  NotificationRead: a
    .model({
      notificationId: a.id().required(),
      userId: a.string().required(),
      readAt: a.datetime().required(),
    })
    .identifier(["notificationId", "userId"])
    .authorization((allow) => [
      allow.ownerDefinedIn("userId").identityClaim("sub").to(["read", "create", "update"]),
      allow.group("admin").to(["read"]),
    ]),

  /** One review per order; `orderId` is the primary key. */
  Review: a
    .model({
      orderId: a.id().required(),
      userId: a.string().required(),
      rating: a.integer().required(),
      text: a.string().required(),
      /** Public byline; omit to show a generic label. */
      displayName: a.string(),
      /** Admin must approve before the review appears on the storefront. */
      approved: a.boolean().default(false),
    })
    .identifier(["orderId"])
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read", "create"]),
      allow.ownerDefinedIn("userId").identityClaim("sub").to(["read", "create"]),
      allow.group("admin"),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "identityPool",
  },
});
