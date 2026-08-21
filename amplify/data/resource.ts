import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { listCustomers as listCustomersFn } from "../functions/list-customers/resource";
import { lookupCustomerByEmail as lookupCustomerByEmailFn } from "../functions/lookup-customer-by-email/resource";
import { getGa4Dashboard as getGa4DashboardFn } from "../functions/get-ga4-dashboard/resource";
import { createStripeCheckout as createStripeCheckoutFn } from "../functions/create-stripe-checkout/resource";
import { stripeWebhook as stripeWebhookFn } from "../functions/stripe-webhook/resource";
import { toggleProductFavorite as toggleProductFavoriteFn } from "../functions/toggle-product-favorite/resource";
import { syncCartSnapshot as syncCartSnapshotFn } from "../functions/sync-cart-snapshot/resource";
import { notifyOrderPlaced as notifyOrderPlacedFn } from "../functions/notify-order-placed/resource";
import { getStorefrontStats as getStorefrontStatsFn } from "../functions/get-storefront-stats/resource";
import { updateOrderFulfillment as updateOrderFulfillmentFn } from "../functions/update-order-fulfillment/resource";
import { cancelStripeCheckout as cancelStripeCheckoutFn } from "../functions/cancel-stripe-checkout/resource";
import { issueNewAccountGrant as issueNewAccountGrantFn } from "../functions/issue-new-account-grant/resource";
import { createStripeRefund as createStripeRefundFn } from "../functions/create-stripe-refund/resource";
import { submitReturnRequest as submitReturnRequestFn } from "../functions/submit-return-request/resource";
import { updateReturnRequest as updateReturnRequestFn } from "../functions/update-return-request/resource";
import { cancelCustomerOrder as cancelCustomerOrderFn } from "../functions/cancel-customer-order/resource";
import { updatePrintLineReview as updatePrintLineReviewFn } from "../functions/update-print-line-review/resource";
import { submitPrintRequest as submitPrintRequestFn } from "../functions/submit-print-request/resource";
import { adminQuotePrintRequest as adminQuotePrintRequestFn } from "../functions/admin-quote-print-request/resource";
import { adminDeclinePrintRequest as adminDeclinePrintRequestFn } from "../functions/admin-decline-print-request/resource";
import { createPrintQuoteCheckout as createPrintQuoteCheckoutFn } from "../functions/create-print-quote-checkout/resource";
import { mergeGuestIdentity as mergeGuestIdentityFn } from "../functions/merge-guest-identity/resource";
import { guestNotifications as guestNotificationsFn } from "../functions/guest-notifications/resource";
import { guestMessages as guestMessagesFn } from "../functions/guest-messages/resource";
import { cleanupIdleCarts as cleanupIdleCartsFn } from "../functions/cleanup-idle-carts/resource";

const schema = a.schema({
  CustomerListItem: a.customType({
    userId: a.string().required(),
    email: a.string().required(),
    /** Cognito profile name when set (given + family, name, or preferred_username). */
    name: a.string(),
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
    variantLabel: a.string(),
    quantity: a.integer().required(),
    title: a.string().required(),
    priceCents: a.integer().required(),
    imageUrl: a.string(),
    /** JSON-encoded PrintServiceLinePayload (M21). */
    printServiceJson: a.string(),
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

  GuestFavoriteListItem: a.customType({
    productId: a.string().required(),
    productSlug: a.string(),
  }),

  GuestFavoriteListResult: a.customType({
    favorites: a.ref("GuestFavoriteListItem").array().required(),
  }),

  IssueNewAccountGrantResult: a.customType({
    issued: a.boolean().required(),
  }),

  /** M6e — merge guest-owned rows into Cognito user after sign-in. */
  MergeGuestIdentityResult: a.customType({
    merged: a.boolean().required(),
    guestId: a.string().required(),
    userId: a.string().required(),
    cartsMerged: a.integer().required(),
    favoritesMerged: a.integer().required(),
    printRequestsMerged: a.integer().required(),
    notificationsMerged: a.integer().required(),
    ordersMerged: a.integer().required(),
    conversationsMerged: a.integer().required(),
  }),

  GuestNotificationItem: a.customType({
    id: a.id().required(),
    guestId: a.string().required(),
    title: a.string().required(),
    body: a.string().required(),
    kind: a.string().required(),
    readAt: a.datetime(),
    createdAt: a.datetime(),
    sortOrder: a.integer(),
  }),

  GuestNotificationListResult: a.customType({
    notifications: a.ref("GuestNotificationItem").array().required(),
  }),

  MarkGuestNotificationReadResult: a.customType({
    success: a.boolean().required(),
  }),

  /** M10 — guest message inbox (HMAC guest session). */
  GuestConversationItem: a.customType({
    id: a.id().required(),
    guestId: a.string(),
    subject: a.string().required(),
    orderId: a.id(),
    customerEmail: a.email(),
    lastMessageAt: a.datetime().required(),
    unreadForCustomer: a.boolean(),
    unreadForAdmin: a.boolean(),
  }),

  GuestConversationListResult: a.customType({
    conversations: a.ref("GuestConversationItem").array().required(),
  }),

  GuestMessageItem: a.customType({
    id: a.id().required(),
    conversationId: a.id().required(),
    senderRole: a.string().required(),
    body: a.string().required(),
    imagePaths: a.string().array(),
    createdAt: a.datetime(),
  }),

  GuestMessageListResult: a.customType({
    messages: a.ref("GuestMessageItem").array().required(),
  }),

  StartGuestConversationResult: a.customType({
    conversation: a.ref("GuestConversationItem").required(),
  }),

  ReplyGuestConversationResult: a.customType({
    success: a.boolean().required(),
  }),

  MarkGuestConversationReadResult: a.customType({
    success: a.boolean().required(),
  }),

  DeleteGuestConversationResult: a.customType({
    success: a.boolean().required(),
  }),

  SyncCartSnapshotResult: a.customType({
    synced: a.boolean().required(),
    grantIssued: a.boolean().required(),
    grantsRevoked: a.boolean().required(),
  }),

  IdleCartCleanupResult: a.customType({
    ran: a.boolean().required(),
    skipped: a.boolean().required(),
    guestDeleted: a.integer().required(),
    signedInDeleted: a.integer().required(),
    grantsRevoked: a.integer().required(),
    message: a.string().required(),
  }),

  /** M6e — restore guest cart UI from server when localStorage is empty. */
  GuestCartSnapshotResult: a.customType({
    found: a.boolean().required(),
    lineItems: a.ref("CartSnapshotLine").array().required(),
    updatedAt: a.datetime(),
  }),

  NotifyOrderPlacedResult: a.customType({
    notified: a.boolean().required(),
  }),

  StorefrontStatsResult: a.customType({
    paidSalesCount: a.integer().required(),
  }),

  UpdateOrderFulfillmentResult: a.customType({
    success: a.boolean().required(),
    fulfillmentStatus: a.string().required(),
    notificationSent: a.boolean().required(),
    emailSent: a.boolean().required(),
  }),

  CancelStripeCheckoutResult: a.customType({
    cancelled: a.boolean().required(),
    status: a.string(),
  }),

  CreateStripeRefundResult: a.customType({
    success: a.boolean().required(),
    refundId: a.string(),
    refundedCents: a.integer().required(),
    orderStatus: a.string().required(),
  }),

  CancelCustomerOrderResult: a.customType({
    success: a.boolean().required(),
    refundId: a.string(),
    refundedCents: a.integer().required(),
    orderStatus: a.string().required(),
  }),

  /** M16e — guest-safe order fields (Order owner rules are Cognito-only). */
  GuestOrderItem: a.customType({
    id: a.id().required(),
    guestId: a.string(),
    externalSessionId: a.string().required(),
    paymentProvider: a.string(),
    status: a.string().required(),
    email: a.string(),
    customerName: a.string(),
    shippingAddress: a.json(),
    subtotalCents: a.integer(),
    shippingCents: a.integer(),
    shippingLabel: a.string(),
    taxCents: a.integer(),
    lineItems: a.json(),
    totalCents: a.integer().required(),
    discountCents: a.integer(),
    promoLabel: a.string(),
    fulfillmentStatus: a.string(),
    fulfillmentUpdatedAt: a.datetime(),
    carrier: a.string(),
    trackingNumber: a.string(),
    trackingUrl: a.string(),
    shippedAt: a.datetime(),
    deliveredAt: a.datetime(),
    refundedCents: a.integer(),
    refundNotes: a.string(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  }),

  GuestOrderListResult: a.customType({
    orders: a.ref("GuestOrderItem").array().required(),
  }),

  SubmitReturnRequestResult: a.customType({
    success: a.boolean().required(),
    returnRequestId: a.id().required(),
  }),

  UpdateReturnRequestResult: a.customType({
    success: a.boolean().required(),
    status: a.string().required(),
  }),

  UpdatePrintLineReviewResult: a.customType({
    success: a.boolean().required(),
    reviewStatus: a.string().required(),
    notificationSent: a.boolean().required(),
    refundedCents: a.integer().required(),
    orderStatus: a.string().required(),
  }),

  SubmitPrintRequestResult: a.customType({
    success: a.boolean().required(),
    printRequestId: a.id().required(),
  }),

  /** M6e — guest-safe print request fields (no direct GuestFavorite-style model list). */
  GuestPrintRequestItem: a.customType({
    id: a.id().required(),
    guestId: a.string(),
    email: a.string(),
    status: a.string().required(),
    uploadId: a.string().required(),
    storagePath: a.string().required(),
    originalFileName: a.string().required(),
    resinTypeId: a.string().required(),
    resinTypeLabel: a.string().required(),
    resinColorId: a.string().required(),
    resinColorLabel: a.string().required(),
    /** `absolute` (mm) or `scale` (%); omit when customer left sizing blank. */
    sizingMode: a.enum(["absolute", "scale"]),
    /** Target finished height in millimeters when sizingMode is absolute. */
    desiredSizeMm: a.float(),
    /** Uniform scale percent when sizingMode is scale (e.g. 125 = 125%). */
    desiredScalePercent: a.float(),
    customerNotes: a.string(),
    adminNotes: a.string(),
    figureLines: a.json(),
    quoteCents: a.integer(),
    quotedAt: a.datetime(),
    orderId: a.id(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  }),

  GuestPrintRequestListResult: a.customType({
    requests: a.ref("GuestPrintRequestItem").array().required(),
  }),

  AdminQuotePrintRequestResult: a.customType({
    success: a.boolean().required(),
    quoteCents: a.integer().required(),
    notificationSent: a.boolean().required(),
  }),

  AdminDeclinePrintRequestResult: a.customType({
    success: a.boolean().required(),
    notificationSent: a.boolean().required(),
  }),

  PrintFigureLineInput: a.customType({
    sizeTierId: a.string().required(),
    quantity: a.integer().required(),
  }),

  ReturnRequestLineItem: a.customType({
    productId: a.string().required(),
    slug: a.string().required(),
    title: a.string().required(),
    quantity: a.integer().required(),
    variantLabel: a.string(),
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
      /** M16e — required with guestToken when calling as guest (IAM). Ignored when Cognito `sub` is present. */
      guestId: a.string(),
      guestToken: a.string(),
    })
    .returns(a.ref("CheckoutSessionResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(createStripeCheckoutFn)),

  cancelStripeCheckoutSession: a
    .mutation()
    .arguments({ checkoutSessionId: a.string().required() })
    .returns(a.ref("CancelStripeCheckoutResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(cancelStripeCheckoutFn)),

  toggleProductFavorite: a
    .mutation()
    .arguments({
      productId: a.string().required(),
      productSlug: a.string(),
      favorited: a.boolean().required(),
      /** M6e — required with guestToken when calling as guest (IAM). Ignored when Cognito `sub` is present. */
      guestId: a.string(),
      guestToken: a.string(),
    })
    .returns(a.ref("ToggleFavoriteResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(toggleProductFavoriteFn)),

  /** M6e — list favorites for a verified guest session (GuestFavorite is not client-readable). */
  getGuestFavorites: a
    .query()
    .arguments({
      guestId: a.string().required(),
      guestToken: a.string().required(),
    })
    .returns(a.ref("GuestFavoriteListResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(toggleProductFavoriteFn)),

  /**
   * M6e — guest inbox (GuestNotification is not client-readable).
   * Named getGuestNotifications to avoid colliding with auto listGuestNotifications.
   */
  getGuestNotifications: a
    .query()
    .arguments({
      guestId: a.string().required(),
      guestToken: a.string().required(),
    })
    .returns(a.ref("GuestNotificationListResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(guestNotificationsFn)),

  markGuestNotificationRead: a
    .mutation()
    .arguments({
      guestId: a.string().required(),
      guestToken: a.string().required(),
      notificationId: a.id().required(),
    })
    .returns(a.ref("MarkGuestNotificationReadResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(guestNotificationsFn)),

  /** M10 — guest message inbox (Conversation/Message not client-writable for guests). */
  getGuestConversations: a
    .query()
    .arguments({
      guestId: a.string().required(),
      guestToken: a.string().required(),
    })
    .returns(a.ref("GuestConversationListResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(guestMessagesFn)),

  getGuestConversationMessages: a
    .query()
    .arguments({
      guestId: a.string().required(),
      guestToken: a.string().required(),
      conversationId: a.id().required(),
    })
    .returns(a.ref("GuestMessageListResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(guestMessagesFn)),

  startGuestConversation: a
    .mutation()
    .arguments({
      guestId: a.string().required(),
      guestToken: a.string().required(),
      subject: a.string().required(),
      body: a.string().required(),
      email: a.email().required(),
      orderId: a.id(),
      imagePaths: a.string().array(),
    })
    .returns(a.ref("StartGuestConversationResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(guestMessagesFn)),

  replyGuestConversation: a
    .mutation()
    .arguments({
      guestId: a.string().required(),
      guestToken: a.string().required(),
      conversationId: a.id().required(),
      body: a.string().required(),
      imagePaths: a.string().array(),
    })
    .returns(a.ref("ReplyGuestConversationResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(guestMessagesFn)),

  markGuestConversationRead: a
    .mutation()
    .arguments({
      guestId: a.string().required(),
      guestToken: a.string().required(),
      conversationId: a.id().required(),
    })
    .returns(a.ref("MarkGuestConversationReadResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(guestMessagesFn)),

  deleteGuestConversation: a
    .mutation()
    .arguments({
      guestId: a.string().required(),
      guestToken: a.string().required(),
      conversationId: a.id().required(),
    })
    .returns(a.ref("DeleteGuestConversationResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(guestMessagesFn)),

  issueNewAccountWelcomeGrant: a
    .mutation()
    .returns(a.ref("IssueNewAccountGrantResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(issueNewAccountGrantFn)),

  /** M6e — verify HMAC guestToken + merge guest data into signed-in user (stub until guest rows exist). */
  mergeGuestIdentity: a
    .mutation()
    .arguments({
      guestId: a.string().required(),
      guestToken: a.string().required(),
    })
    .returns(a.ref("MergeGuestIdentityResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(mergeGuestIdentityFn)),

  syncCartSnapshot: a
    .mutation()
    .arguments({
      lineItems: a.ref("CartSnapshotLine").array().required(),
      /** M6e — required with guestToken when calling as guest (IAM). Ignored when Cognito `sub` is present. */
      guestId: a.string(),
      guestToken: a.string(),
    })
    .returns(a.ref("SyncCartSnapshotResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(syncCartSnapshotFn)),

  /**
   * M6e — read guest cart for UI hydrate (GuestCartSnapshot is not client-readable).
   * Named `loadGuestCartSnapshot` to avoid colliding with the model auto-query `getGuestCartSnapshot`.
   */
  loadGuestCartSnapshot: a
    .query()
    .arguments({
      guestId: a.string().required(),
      guestToken: a.string().required(),
    })
    .returns(a.ref("GuestCartSnapshotResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(syncCartSnapshotFn)),

  /**
   * M6e — delete idle CartSnapshot / GuestCartSnapshot rows older than N days.
   * Optional args override saved CatalogSettings for a one-off admin run.
   * Daily schedule uses saved settings and skips when cartCleanupEnabled is false.
   */
  runIdleCartCleanup: a
    .mutation()
    .arguments({
      idleDays: a.integer(),
      scope: a.enum(["guest", "signed_in", "both"]),
    })
    .returns(a.ref("IdleCartCleanupResult"))
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(cleanupIdleCartsFn)),

  notifyOrderPlaced: a
    .mutation()
    .arguments({ orderId: a.id().required() })
    .returns(a.ref("NotifyOrderPlacedResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(notifyOrderPlacedFn)),

  getStorefrontStats: a
    .query()
    .returns(a.ref("StorefrontStatsResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(getStorefrontStatsFn)),

  updateOrderFulfillment: a
    .mutation()
    .arguments({
      orderId: a.id().required(),
      fulfillmentStatus: a.enum(["paid", "received", "processing", "shipped"]),
      carrier: a.string(),
      trackingNumber: a.string(),
      trackingUrl: a.string(),
    })
    .returns(a.ref("UpdateOrderFulfillmentResult"))
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(updateOrderFulfillmentFn)),

  createStripeRefund: a
    .mutation()
    .arguments({
      orderId: a.id().required(),
      /** Omit for full remaining refundable balance. */
      amountCents: a.integer(),
      reason: a.enum(["requested_by_customer", "duplicate", "fraudulent"]),
      refundNotes: a.string(),
    })
    .returns(a.ref("CreateStripeRefundResult"))
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(createStripeRefundFn)),

  updatePrintLineReview: a
    .mutation()
    .arguments({
      orderId: a.id().required(),
      uploadId: a.string().required(),
      reviewStatus: a.enum(["approved", "rejected"]),
      reviewNotes: a.string(),
    })
    .returns(a.ref("UpdatePrintLineReviewResult"))
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(updatePrintLineReviewFn)),

  submitPrintRequest: a
    .mutation()
    .arguments({
      uploadId: a.string().required(),
      storagePath: a.string().required(),
      originalFileName: a.string().required(),
      resinTypeId: a.string().required(),
      resinColorId: a.string().required(),
      /**
       * Optional either/or sizing:
       * - absolute + desiredSizeMm
       * - scale + desiredScalePercent
       * Omit both when leaving sizing blank.
       */
      sizingMode: a.enum(["absolute", "scale"]),
      desiredSizeMm: a.float(),
      desiredScalePercent: a.float(),
      customerNotes: a.string(),
      /** M6e — guest path (with guestToken + email). Ignored when Cognito `sub` is present. */
      guestId: a.string(),
      guestToken: a.string(),
      email: a.email(),
    })
    .returns(a.ref("SubmitPrintRequestResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(submitPrintRequestFn)),

  /** M6e — list/get guest print requests (PrintRequest owner rules are Cognito-only). */
  getGuestPrintRequests: a
    .query()
    .arguments({
      guestId: a.string().required(),
      guestToken: a.string().required(),
      /** When set, return only this request (still must belong to guestId). */
      printRequestId: a.id(),
    })
    .returns(a.ref("GuestPrintRequestListResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(submitPrintRequestFn)),

  adminQuotePrintRequest: a
    .mutation()
    .arguments({
      printRequestId: a.id().required(),
      figureLines: a.ref("PrintFigureLineInput").array().required(),
      adminNotes: a.string(),
    })
    .returns(a.ref("AdminQuotePrintRequestResult"))
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(adminQuotePrintRequestFn)),

  adminDeclinePrintRequest: a
    .mutation()
    .arguments({
      printRequestId: a.id().required(),
      adminNotes: a.string(),
    })
    .returns(a.ref("AdminDeclinePrintRequestResult"))
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(adminDeclinePrintRequestFn)),

  createPrintQuoteCheckoutSession: a
    .mutation()
    .arguments({
      printRequestId: a.id().required(),
      successUrl: a.string(),
      cancelUrl: a.string(),
      /** M6e — guest pay path. Ignored when Cognito `sub` is present. */
      guestId: a.string(),
      guestToken: a.string(),
    })
    .returns(a.ref("CheckoutSessionResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(createPrintQuoteCheckoutFn)),

  cancelCustomerOrder: a
    .mutation()
    .arguments({
      orderId: a.id().required(),
      /** M16e — required with guestToken when calling as guest (IAM). Ignored when Cognito `sub` is present. */
      guestId: a.string(),
      guestToken: a.string(),
    })
    .returns(a.ref("CancelCustomerOrderResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(cancelCustomerOrderFn)),

  /** M16e — list/get guest orders (Order owner rules are Cognito-only). */
  getGuestOrders: a
    .query()
    .arguments({
      guestId: a.string().required(),
      guestToken: a.string().required(),
      /** When set, return only this order (still must belong to guestId). */
      orderId: a.id(),
    })
    .returns(a.ref("GuestOrderListResult"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(cancelCustomerOrderFn)),

  submitReturnRequest: a
    .mutation()
    .arguments({
      orderId: a.id().required(),
      reason: a.enum([
        "defective",
        "not_as_described",
        "changed_mind",
        "exchange",
        "other",
      ]),
      customerNotes: a.string(),
      lineItems: a.ref("ReturnRequestLineItem").array().required(),
    })
    .returns(a.ref("SubmitReturnRequestResult"))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(submitReturnRequestFn)),

  adminUpdateReturnRequest: a
    .mutation()
    .arguments({
      returnRequestId: a.id().required(),
      status: a.enum([
        "requested",
        "approved",
        "denied",
        "received",
        "closed",
      ]),
      adminNotes: a.string(),
    })
    .returns(a.ref("UpdateReturnRequestResult"))
    .authorization((allow) => [allow.group("admin")])
    .handler(a.handler.function(updateReturnRequestFn)),

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
      /** Storefront star rating (1–5) when no approved reviews are linked to this product. */
      displayRating: a.integer(),
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
      /** Signed-in carts currently containing this product (updated via syncCartSnapshot). Guest carts via GuestCartSnapshot — **M6e**. */
      activeCartCount: a.integer().default(0),
      /** Signed-in users who favorited this product (updated via toggleProductFavorite). Guests via GuestFavorite — **M6e**. */
      favoriteCount: a.integer().default(0),
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

  /**
   * Customer-painted work for the public Gallery (trust / social proof).
   * Admin-curated; image under `gallery/*` storage.
   */
  GalleryEntry: a
    .model({
      /** S3 path under `gallery/…`. */
      imagePath: a.string().required(),
      /** Display name (typically Etsy shop / account name). */
      artistName: a.string().required(),
      /** Optional link to the artist's other work (Etsy shop, portfolio, etc.). */
      artistUrl: a.url(),
      /** Catalog product that was painted (`/shop/:slug`). */
      productSlug: a.string().required(),
      /** When the photo was received (for display + sort). */
      receivedAt: a.datetime().required(),
      active: a.boolean().default(true),
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
      kind: a.enum([
        "flat",
        "free_over_threshold",
        "weight_tier",
        "free_shipping",
      ]),
      /** US first-item shipping amount (USD cents). */
      amountCents: a.integer().required(),
      /** Additional item amount after the first item (USD cents). */
      additionalItemCents: a.integer().default(0),
      freeThresholdCents: a.integer(),
      /** For kind=weight_tier: [{ maxWeightOz, amountCents }, …] sorted by maxWeightOz. */
      weightTiers: a.json(),
      /** International sub-rates: [{ kind, amountCents, countriesMode, countries?, … }]. Required at checkout. */
      internationalRates: a.json(),
      /** US only — set automatically; international countries come from internationalRates. */
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
      status: a.enum(["pending", "paid", "failed", "cancelled", "refunded"]),
      userId: a.string(),
      /** M16e — opaque guest id; exactly one of userId | guestId for storefront-owned orders. */
      guestId: a.string(),
      email: a.string(),
      customerName: a.string(),
      customerPhone: a.string(),
      /** Ship-to address from Stripe Checkout (`shipping_details`). */
      shippingAddress: a.json(),
      subtotalCents: a.integer(),
      shippingCents: a.integer(),
      shippingLabel: a.string(),
      /** Sales tax from Stripe Tax (`total_details.amount_tax`). */
      taxCents: a.integer(),
      lineItems: a.json(),
      totalCents: a.integer().required(),
      /** Merchandise discount (before shipping). */
      discountCents: a.integer(),
      promoGrantId: a.id(),
      promoSource: a.enum([
        "admin",
        "thank_you",
        "favorite",
        "abandoned_cart",
        "new_account",
      ]),
      promoLabel: a.string(),
      promoExpiresAt: a.datetime(),
      /** When support inbox email was sent for this order. */
      supportNotifiedAt: a.datetime(),
      /** Stripe PaymentIntent id (set on paid checkout) for refund correlation. */
      stripePaymentIntentId: a.string(),
      /** When an admin marked the order as seen on the dashboard. */
      adminAcknowledgedAt: a.datetime(),
      /** M11 — customer-facing fulfillment timeline (separate from payment status). */
      fulfillmentStatus: a.enum(["paid", "received", "processing", "shipped"]),
      fulfillmentUpdatedAt: a.datetime(),
      carrier: a.string(),
      trackingNumber: a.string(),
      trackingUrl: a.string(),
      shippedAt: a.datetime(),
      deliveredAt: a.datetime(),
      /** Cumulative amount refunded via Stripe (M16). */
      refundedCents: a.integer().default(0),
      /** Admin notes on refunds / returns handling. */
      refundNotes: a.string(),
      /** Stripe refund ledger mirrored on the order (M16). */
      refunds: a.json(),
    })
    .authorization((allow) => [
      allow.guest().to(["create"]),
      allow.authenticated().to(["create"]),
      allow.ownerDefinedIn("userId").identityClaim("sub").to(["read"]),
      allow.group("admin").to(["read", "update"]),
    ]),

  /** Customer return workflow (M16). */
  ReturnRequest: a
    .model({
      orderId: a.id().required(),
      userId: a.string().required(),
      email: a.email(),
      status: a.enum([
        "requested",
        "approved",
        "denied",
        "received",
        "closed",
      ]),
      reason: a.enum([
        "defective",
        "not_as_described",
        "changed_mind",
        "exchange",
        "other",
      ]),
      customerNotes: a.string(),
      adminNotes: a.string(),
      lineItems: a.json(),
      requestedAt: a.datetime().required(),
      resolvedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn("userId").identityClaim("sub").to(["read"]),
      allow.group("admin").to(["read", "update", "create"]),
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
      /** When true, new customer accounts receive a welcome grant on email confirm. */
      useForNewAccount: a.boolean().default(false),
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
      source: a.enum(["admin", "thank_you", "favorite", "abandoned_cart", "new_account"]),
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

  /**
   * M6e — guest favorites (parallel to Favorite; Amplify PK cannot share userId|guestId).
   * Written via toggleProductFavorite / mergeGuestIdentity; listed via getGuestFavorites.
   */
  GuestFavorite: a
    .model({
      guestId: a.string().required(),
      productId: a.string().required(),
      productSlug: a.string(),
    })
    .identifier(["guestId", "productId"])
    .authorization((allow) => [allow.group("admin").to(["read"])]),

  /** Server-side cart for abandon detection (M6c). PK = Cognito sub. */
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

  /**
   * M6e — server-side guest cart (parallel to CartSnapshot; Amplify PK cannot be userId|guestId).
   * Written only via syncCartSnapshot / mergeGuestIdentity Lambdas.
   */
  GuestCartSnapshot: a
    .model({
      guestId: a.string().required(),
      lineItems: a.json().required(),
      updatedAt: a.datetime().required(),
      abandonedAt: a.datetime(),
    })
    .identifier(["guestId"])
    .authorization((allow) => [allow.group("admin").to(["read"])]),

  /**
   * M6e — guest inbox (parallel to Notification; Cognito owner auth cannot target guests).
   * Written via admin quote/decline (+ merge); listed via getGuestNotifications.
   */
  GuestNotification: a
    .model({
      guestId: a.string().required(),
      title: a.string().required(),
      body: a.string().required(),
      kind: a.enum(["system", "order", "marketing"]),
      active: a.boolean().default(true),
      sortOrder: a.integer().default(0),
      /** Set when guest marks the message read (no separate read table). */
      readAt: a.datetime(),
    })
    .authorization((allow) => [allow.group("admin").to(["read"])]),

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
      /** Optional outbound link (usually Etsy). Falls back to shop reviews URL for `source: etsy`. */
      sourceUrl: a.string(),
      /** When set, review appears on that product's PDP and counts toward its star average. Admin can assign any review to a product. */
      productSlug: a.string(),
      /** Public review date (Etsy original date, or when the customer submitted). Falls back to createdAt when omitted. */
      reviewedAt: a.datetime(),
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

  /** Singleton store catalog + ops config (category filters, idle cart TTL). */
  CatalogSettings: a
    .model({
      /** Always `store`. */
      settingsKey: a.string().required(),
      /** Ordered category filters (excludes reserved `All`). */
      categoryFilters: a.string().array(),
      /** Shared HTML template for new product descriptions (admin). */
      productDescriptionTemplate: a.string(),
      /** When true, daily cleanup deletes idle cart snapshots past cartCleanupIdleDays. */
      cartCleanupEnabled: a.boolean().default(false),
      /** Idle threshold in days (based on snapshot updatedAt). Default 90 when unset. */
      cartCleanupIdleDays: a.integer(),
      /** Which snapshots the cleanup job targets. */
      cartCleanupScope: a.enum(["guest", "signed_in", "both"]),
    })
    .identifier(["settingsKey"])
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  /** M21 — Printing as a Service pricing + policy (singleton row). */
  PrintServiceConfig: a
    .model({
      configKey: a.string().required(),
      active: a.boolean().default(false),
      /** Hidden catalog product slug for shipping profile + checkout title. */
      catalogProductSlug: a.string(),
      policyMarkdown: a.string(),
      maxFileBytes: a.integer(),
      sizeTiers: a.json(),
      resinTypes: a.json(),
      resinColors: a.json(),
    })
    .identifier(["configKey"])
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  /** M21c — Quote-first print job (upload → review → quote → pay). */
  PrintRequest: a
    .model({
      /** Cognito sub when signed in; omit for guest rows (M6e). */
      userId: a.string(),
      /** M6e — opaque guest id; exactly one of userId | guestId. */
      guestId: a.string(),
      /** Contact email — required for guest submits; optional for accounts. */
      email: a.email(),
      status: a.enum([
        "submitted",
        "in_review",
        "quoted",
        "paid",
        "declined",
        "cancelled",
      ]),
      uploadId: a.string().required(),
      storagePath: a.string().required(),
      originalFileName: a.string().required(),
      resinTypeId: a.string().required(),
      resinTypeLabel: a.string().required(),
      resinColorId: a.string().required(),
      resinColorLabel: a.string().required(),
      /** `absolute` (mm) or `scale` (%); omit when customer left sizing blank. */
      sizingMode: a.enum(["absolute", "scale"]),
      /** Target finished height in millimeters when sizingMode is absolute. */
      desiredSizeMm: a.float(),
      /** Uniform scale percent when sizingMode is scale (e.g. 125 = 125%). */
      desiredScalePercent: a.float(),
      customerNotes: a.string(),
      adminNotes: a.string(),
      /** JSON PrintFigureLine[] */
      figureLines: a.json(),
      quoteCents: a.integer(),
      quotedAt: a.datetime(),
      orderId: a.id(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn("userId").identityClaim("sub").to(["read"]),
      allow.group("admin").to(["read", "update", "delete"]),
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

  /** M10 — Etsy-style shop ↔ customer message thread (signed-in + guest via Lambda). */
  Conversation: a
    .model({
      /** Cognito sub when signed in; omit for guest rows. */
      userId: a.string(),
      /** Opaque guest id; exactly one of userId | guestId. */
      guestId: a.string(),
      subject: a.string().required(),
      orderId: a.id(),
      /** Snapshot at thread open — helps admin when Cognito email is unavailable. */
      customerEmail: a.email(),
      lastMessageAt: a.datetime().required(),
      unreadForCustomer: a.boolean().default(false),
      unreadForAdmin: a.boolean().default(true),
    })
    .authorization((allow) => [
      allow
        .ownerDefinedIn("userId")
        .identityClaim("sub")
        .to(["create", "read", "update", "delete"]),
      allow.group("admin").to(["read", "update", "delete"]),
    ]),

  /** M10 — message within a Conversation. */
  Message: a
    .model({
      conversationId: a.id().required(),
      /**
       * Owner key for signed-in threads (Cognito sub). For guest threads this is
       * the guestId (no Cognito owner match — guests read/write via Lambda).
       */
      conversationUserId: a.string().required(),
      senderRole: a.enum(["customer", "admin"]),
      /** Text and/or caption; may be empty when imagePaths are set. */
      body: a.string().required(),
      /** S3 paths under message-attachments/{entity_id}/… */
      imagePaths: a.string().array(),
    })
    .authorization((allow) => [
      allow
        .ownerDefinedIn("conversationUserId")
        .identityClaim("sub")
        .to(["create", "read", "delete"]),
      allow.group("admin").to(["create", "read", "update", "delete"]),
    ]),
})
.authorization((allow) => [
  allow.resource(createStripeCheckoutFn),
  allow.resource(stripeWebhookFn),
  allow.resource(toggleProductFavoriteFn),
  allow.resource(syncCartSnapshotFn),
  allow.resource(notifyOrderPlacedFn),
  allow.resource(getStorefrontStatsFn),
  allow.resource(updateOrderFulfillmentFn),
  allow.resource(cancelStripeCheckoutFn),
  allow.resource(issueNewAccountGrantFn),
  allow.resource(mergeGuestIdentityFn),
  allow.resource(createStripeRefundFn),
  allow.resource(submitReturnRequestFn),
  allow.resource(updateReturnRequestFn),
  allow.resource(cancelCustomerOrderFn),
  allow.resource(updatePrintLineReviewFn),
  allow.resource(submitPrintRequestFn),
  allow.resource(adminQuotePrintRequestFn),
  allow.resource(adminDeclinePrintRequestFn),
  allow.resource(createPrintQuoteCheckoutFn),
  allow.resource(guestNotificationsFn),
  allow.resource(guestMessagesFn),
  allow.resource(cleanupIdleCartsFn),
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "identityPool",
  },
});
