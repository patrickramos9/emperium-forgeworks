import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { listCustomers as listCustomersFn } from "../functions/list-customers/resource";
import { lookupCustomerByEmail as lookupCustomerByEmailFn } from "../functions/lookup-customer-by-email/resource";
import { getGa4Dashboard as getGa4DashboardFn } from "../functions/get-ga4-dashboard/resource";
import { createStripeCheckout as createStripeCheckoutFn } from "../functions/create-stripe-checkout/resource";
import { stripeWebhook as stripeWebhookFn } from "../functions/stripe-webhook/resource";
import { toggleProductFavorite as toggleProductFavoriteFn } from "../functions/toggle-product-favorite/resource";
import { syncCartSnapshot as syncCartSnapshotFn } from "../functions/sync-cart-snapshot/resource";

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

  CheckoutCartLine: a.customType({
    productId: a.string().required(),
    slug: a.string().required(),
    variantId: a.string(),
    quantity: a.integer().required(),
    title: a.string().required(),
    priceCents: a.integer().required(),
    imageUrl: a.string(),
  }),

  CheckoutSessionResult: a.customType({
    sessionId: a.string().required(),
    redirectUrl: a.string().required(),
    paymentProvider: a.string().required(),
  }),

  CartSnapshotLine: a.customType({
    productId: a.string().required(),
    slug: a.string().required(),
    quantity: a.integer().required(),
    priceCents: a.integer().required(),
    title: a.string(),
  }),

  ToggleFavoriteResult: a.customType({
    favorited: a.boolean().required(),
    grantIssued: a.boolean().required(),
  }),

  SyncCartSnapshotResult: a.customType({
    synced: a.boolean().required(),
    grantIssued: a.boolean().required(),
    grantsRevoked: a.boolean().required(),
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

  createStripeCheckoutSession: a
    .mutation()
    .arguments({
      lineItems: a.ref("CheckoutCartLine").array().required(),
      /** Best eligible grant for signed-in user; validated server-side. */
      promoGrantId: a.id(),
      successUrl: a.string(),
      cancelUrl: a.string(),
    })
    .returns(a.ref("CheckoutSessionResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(createStripeCheckoutFn)),

  toggleProductFavorite: a
    .mutation()
    .arguments({
      productId: a.string().required(),
      productSlug: a.string(),
      favorited: a.boolean().required(),
    })
    .returns(a.ref("ToggleFavoriteResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(toggleProductFavoriteFn)),

  syncCartSnapshot: a
    .mutation()
    .arguments({
      lineItems: a.ref("CartSnapshotLine").array().required(),
    })
    .returns(a.ref("SyncCartSnapshotResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(syncCartSnapshotFn)),

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
      /** M15 — shipping profile assigned per product (Etsy-style). Omit → store default profile. */
      shippingProfileId: a.string(),
      /** Item weight in ounces; required for weight-tier shipping profiles. */
      weightOz: a.integer(),
      /** Cached PDP shipping copy from assigned/default profile (set on admin save). */
      shippingDisplay: a.json(),
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

  ShippingProfile: a
    .model({
      name: a.string().required(),
      description: a.string(),
      kind: a.enum(["flat", "free_over_threshold", "weight_tier"]),
      /** First item shipping amount (USD cents). */
      amountCents: a.integer().required(),
      /** Additional item amount after the first item (USD cents). */
      additionalItemCents: a.integer().default(0),
      freeThresholdCents: a.integer(),
      /** For kind=weight_tier: [{ maxWeightOz, amountCents }, …] sorted by maxWeightOz. */
      weightTiers: a.json(),
      allowedCountries: a.string().array(),
      active: a.boolean().default(true),
      /** Fallback for products with no shippingProfileId (exactly one should be true). */
      isDefault: a.boolean().default(false),
      sortOrder: a.integer().default(0),
      /** Business days until order ships (profile-wide; use a separate profile for long lead times). */
      minReadyToShipDays: a.integer(),
      maxReadyToShipDays: a.integer(),
      /** Optional transit estimate for Stripe Checkout `delivery_estimate` (admin UI backlog). */
      minDeliveryDays: a.integer(),
      maxDeliveryDays: a.integer(),
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
      email: a.string(),
      customerName: a.string(),
      customerPhone: a.string(),
      /** Ship-to address from Stripe Checkout (`shipping_details`). */
      shippingAddress: a.json(),
      subtotalCents: a.integer(),
      shippingCents: a.integer(),
      shippingLabel: a.string(),
      lineItems: a.json(),
      totalCents: a.integer().required(),
      /** Merchandise discount (before shipping). */
      discountCents: a.integer(),
      promoGrantId: a.id(),
      promoSource: a.enum(["admin", "thank_you", "favorite", "abandoned_cart"]),
      promoLabel: a.string(),
      promoExpiresAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.guest().to(["create"]),
      allow.authenticated().to(["create"]),
      allow.ownerDefinedIn("userId").identityClaim("sub").to(["read"]),
      allow.group("admin").to(["read", "update"]),
    ]),

  /** Admin-defined promo rules; grants are issued per user. */
  PromoTemplate: a
    .model({
      name: a.string().required(),
      kind: a.enum(["percent", "fixed"]),
      percent: a.integer(),
      amountCents: a.integer(),
      active: a.boolean().default(true),
      /** Days until issued grants expire; omit for indefinite. */
      defaultExpiresInDays: a.integer(),
      /** When true, paid orders issue a thank-you grant from this template. */
      useForThankYou: a.boolean().default(false),
      /** When true, first favorite on a product issues a grant (M6b). */
      useForFavorite: a.boolean().default(false),
      /** When true, idle cart triggers a grant on return (M6c). */
      useForAbandonedCart: a.boolean().default(false),
      /** Hours of cart inactivity before abandon grant (M6c). Default 24 in Lambda. */
      abandonAfterHours: a.integer(),
    })
    .authorization((allow) => [
      /** Required for cart/checkout to resolve grant discount rules. */
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  /** Single-use issued offer tied to a user (M6). */
  PromoGrant: a
    .model({
      templateId: a.id().required(),
      userId: a.string().required(),
      source: a.enum(["admin", "thank_you", "favorite", "abandoned_cart"]),
      productId: a.string(),
      cartSnapshotId: a.string(),
      expiresAt: a.datetime(),
      revokedAt: a.datetime(),
      redeemedAt: a.datetime(),
      orderId: a.id(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn("userId").identityClaim("sub").to(["read"]),
      allow.group("admin"),
    ]),

  /** Saved items per customer (M6b). */
  Favorite: a
    .model({
      userId: a.string().required(),
      productId: a.string().required(),
      /** Denormalized for stale-favorite cleanup when product is deleted (M17). */
      productSlug: a.string(),
    })
    .identifier(["userId", "productId"])
    .authorization((allow) => [
      allow.ownerDefinedIn("userId").identityClaim("sub").to(["read", "create", "delete"]),
      allow.group("admin").to(["read"]),
    ]),

  /** Server-side cart for abandon detection (M6c). */
  CartSnapshot: a
    .model({
      userId: a.string().required(),
      lineItems: a.json().required(),
      updatedAt: a.datetime().required(),
      abandonedAt: a.datetime(),
    })
    .identifier(["userId"])
    .authorization((allow) => [
      allow.ownerDefinedIn("userId").identityClaim("sub").to(["read"]),
      allow.group("admin").to(["read"]),
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
      /** On-site order review vs admin-imported testimonial (e.g. from Etsy). */
      source: a.enum(["site", "etsy"]),
      /** S3 paths under `reviews/{orderId}/…` for customer product photos. */
      images: a.string().array(),
    })
    .identifier(["orderId"])
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read", "create"]),
      allow.ownerDefinedIn("userId").identityClaim("sub").to(["read", "create"]),
      allow.group("admin"),
    ]),

  Sculptor: a
    .model({
      slug: a.string().required(),
      name: a.string().required(),
      /** S3 path under `sculptors/{slug}/…` */
      logo: a.string(),
      /** Ordered S3 paths under `sculptors/{slug}/gallery/…` for the profile carousel. */
      galleryImages: a.string().array(),
      description: a.string(),
      myMiniFactoryUrl: a.url(),
      patreonUrl: a.url(),
      instagramUrl: a.url(),
      facebookUrl: a.url(),
      xUrl: a.url(),
      active: a.boolean().default(true),
      sortOrder: a.integer().default(0),
      /** Cognito sub of the user allowed to edit this profile (M8d partner portal). */
      editorUserId: a.string(),
    })
    .identifier(["slug"])
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow
        .ownerDefinedIn("editorUserId")
        .identityClaim("sub")
        .to(["read", "update"]),
      allow.group("admin"),
    ]),
})
.authorization((allow) => [
  allow.resource(createStripeCheckoutFn),
  allow.resource(stripeWebhookFn),
  allow.resource(toggleProductFavoriteFn),
  allow.resource(syncCartSnapshotFn),
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "identityPool",
  },
});
