import * as s3 from "aws-cdk-lib/aws-s3";
import { PolicyDocument, PolicyStatement, Effect, AnyPrincipal } from "aws-cdk-lib/aws-iam";
import { defineBackend } from "@aws-amplify/backend";
import { FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { listCustomers } from "./functions/list-customers/resource";
import { lookupCustomerByEmail } from "./functions/lookup-customer-by-email/resource";
import { getGa4Dashboard } from "./functions/get-ga4-dashboard/resource";
import { createStripeCheckout } from "./functions/create-stripe-checkout/resource";
import { stripeWebhook } from "./functions/stripe-webhook/resource";
import { toggleProductFavorite } from "./functions/toggle-product-favorite/resource";
import { syncCartSnapshot } from "./functions/sync-cart-snapshot/resource";
import { notifyOrderPlaced } from "./functions/notify-order-placed/resource";
import { getStorefrontStats } from "./functions/get-storefront-stats/resource";
import { updateOrderFulfillment } from "./functions/update-order-fulfillment/resource";
import { cancelStripeCheckout } from "./functions/cancel-stripe-checkout/resource";
import { issueNewAccountGrant } from "./functions/issue-new-account-grant/resource";
import { createStripeRefund } from "./functions/create-stripe-refund/resource";
import { submitReturnRequest } from "./functions/submit-return-request/resource";
import { updateReturnRequest } from "./functions/update-return-request/resource";
import { cancelCustomerOrder } from "./functions/cancel-customer-order/resource";
import { updatePrintLineReview } from "./functions/update-print-line-review/resource";
import { submitPrintRequest } from "./functions/submit-print-request/resource";
import { adminQuotePrintRequest } from "./functions/admin-quote-print-request/resource";
import { adminDeclinePrintRequest } from "./functions/admin-decline-print-request/resource";
import { createPrintQuoteCheckout } from "./functions/create-print-quote-checkout/resource";
import { ensureGuestSession } from "./functions/ensure-guest-session/resource";
import { mergeGuestIdentity } from "./functions/merge-guest-identity/resource";
import { guestNotifications } from "./functions/guest-notifications/resource";
import { guestMessages } from "./functions/guest-messages/resource";
import { cleanupIdleCarts } from "./functions/cleanup-idle-carts/resource";

const backend = defineBackend({
  auth,
  data,
  storage,
  lookupCustomerByEmail,
  listCustomers,
  getGa4Dashboard,
  createStripeCheckout,
  stripeWebhook,
  toggleProductFavorite,
  syncCartSnapshot,
  notifyOrderPlaced,
  getStorefrontStats,
  updateOrderFulfillment,
  cancelStripeCheckout,
  issueNewAccountGrant,
  mergeGuestIdentity,
  ensureGuestSession,
  guestNotifications,
  guestMessages,
  cleanupIdleCarts,
  createStripeRefund,
  submitReturnRequest,
  updateReturnRequest,
  cancelCustomerOrder,
  updatePrintLineReview,
  submitPrintRequest,
  adminQuotePrintRequest,
  adminDeclinePrintRequest,
  createPrintQuoteCheckout,
});

const userPoolId = backend.auth.resources.userPool.userPoolId;

backend.lookupCustomerByEmail.addEnvironment("USER_POOL_ID", userPoolId);
backend.listCustomers.addEnvironment("USER_POOL_ID", userPoolId);
backend.adminQuotePrintRequest.addEnvironment("USER_POOL_ID", userPoolId);
backend.adminDeclinePrintRequest.addEnvironment("USER_POOL_ID", userPoolId);
backend.getGa4Dashboard.addEnvironment(
  "GA4_PROPERTY_ID",
  process.env.GA4_PROPERTY_ID ?? "539229345",
);
backend.getGa4Dashboard.addEnvironment(
  "GA4_CLIENT_EMAIL",
  process.env.GA4_CLIENT_EMAIL ?? "",
);
backend.getGa4Dashboard.addEnvironment(
  "GA4_PRIVATE_KEY",
  process.env.GA4_PRIVATE_KEY ?? "",
);

const siteUrl =
  process.env.VITE_SITE_URL ??
  process.env.SITE_URL ??
  "https://emperiumforgeworks.com";

backend.createStripeCheckout.addEnvironment(
  "STRIPE_SECRET_KEY",
  process.env.STRIPE_SECRET_KEY ?? "",
);
backend.createStripeCheckout.addEnvironment("SITE_URL", siteUrl);

backend.cancelStripeCheckout.addEnvironment(
  "STRIPE_SECRET_KEY",
  process.env.STRIPE_SECRET_KEY ?? "",
);

/** M20a — Resend transactional email (orders@ vs melissa@). */
const supportInboxEmail =
  process.env.SUPPORT_INBOX_EMAIL ?? "melissa@emperiumforgeworks.com";
const orderEmailFrom =
  process.env.ORDER_EMAIL_FROM ?? "orders@emperiumforgeworks.com";
const generalEmailFrom =
  process.env.GENERAL_EMAIL_FROM ?? "melissa@emperiumforgeworks.com";
const emailReplyTo =
  process.env.EMAIL_REPLY_TO ?? supportInboxEmail;
const resendApiKey = process.env.RESEND_API_KEY ?? "";

function addTransactionalEmailEnv(fn: {
  addEnvironment: (name: string, value: string) => void;
}, opts?: { supportInbox?: boolean }) {
  fn.addEnvironment("RESEND_API_KEY", resendApiKey);
  fn.addEnvironment("ORDER_EMAIL_FROM", orderEmailFrom);
  fn.addEnvironment("GENERAL_EMAIL_FROM", generalEmailFrom);
  fn.addEnvironment("EMAIL_REPLY_TO", emailReplyTo);
  if (opts?.supportInbox !== false) {
    fn.addEnvironment("SUPPORT_INBOX_EMAIL", supportInboxEmail);
  }
}

backend.stripeWebhook.addEnvironment(
  "STRIPE_SECRET_KEY",
  process.env.STRIPE_SECRET_KEY ?? "",
);
backend.stripeWebhook.addEnvironment(
  "STRIPE_WEBHOOK_SECRET",
  process.env.STRIPE_WEBHOOK_SECRET ?? "",
);
backend.stripeWebhook.addEnvironment("SITE_URL", siteUrl);
addTransactionalEmailEnv(backend.stripeWebhook);

backend.notifyOrderPlaced.addEnvironment("SITE_URL", siteUrl);
addTransactionalEmailEnv(backend.notifyOrderPlaced);

/** M6e — HMAC secret for guestToken (AppSync cannot receive Function URL HttpOnly cookies). */
const guestSessionSecret =
  process.env.GUEST_SESSION_SECRET ??
  "dev-only-guest-session-secret-change-me";
backend.ensureGuestSession.addEnvironment("SITE_URL", siteUrl);
backend.ensureGuestSession.addEnvironment(
  "GUEST_SESSION_SECRET",
  guestSessionSecret,
);
backend.mergeGuestIdentity.addEnvironment(
  "GUEST_SESSION_SECRET",
  guestSessionSecret,
);
backend.syncCartSnapshot.addEnvironment(
  "GUEST_SESSION_SECRET",
  guestSessionSecret,
);
backend.toggleProductFavorite.addEnvironment(
  "GUEST_SESSION_SECRET",
  guestSessionSecret,
);
backend.submitPrintRequest.addEnvironment(
  "GUEST_SESSION_SECRET",
  guestSessionSecret,
);
backend.createPrintQuoteCheckout.addEnvironment(
  "GUEST_SESSION_SECRET",
  guestSessionSecret,
);
backend.guestNotifications.addEnvironment(
  "GUEST_SESSION_SECRET",
  guestSessionSecret,
);
backend.guestMessages.addEnvironment(
  "GUEST_SESSION_SECRET",
  guestSessionSecret,
);
backend.guestMessages.addEnvironment("SITE_URL", siteUrl);
addTransactionalEmailEnv(backend.guestMessages, { supportInbox: false });
backend.createStripeCheckout.addEnvironment(
  "GUEST_SESSION_SECRET",
  guestSessionSecret,
);
backend.cancelCustomerOrder.addEnvironment(
  "GUEST_SESSION_SECRET",
  guestSessionSecret,
);

backend.createStripeRefund.addEnvironment(
  "STRIPE_SECRET_KEY",
  process.env.STRIPE_SECRET_KEY ?? "",
);

backend.cancelCustomerOrder.addEnvironment(
  "STRIPE_SECRET_KEY",
  process.env.STRIPE_SECRET_KEY ?? "",
);

backend.updatePrintLineReview.addEnvironment(
  "STRIPE_SECRET_KEY",
  process.env.STRIPE_SECRET_KEY ?? "",
);
backend.updatePrintLineReview.addEnvironment("SITE_URL", siteUrl);

backend.adminQuotePrintRequest.addEnvironment("SITE_URL", siteUrl);
addTransactionalEmailEnv(backend.adminQuotePrintRequest, {
  supportInbox: false,
});
backend.adminDeclinePrintRequest.addEnvironment("SITE_URL", siteUrl);
addTransactionalEmailEnv(backend.adminDeclinePrintRequest, {
  supportInbox: false,
});

backend.createPrintQuoteCheckout.addEnvironment(
  "STRIPE_SECRET_KEY",
  process.env.STRIPE_SECRET_KEY ?? "",
);
backend.createPrintQuoteCheckout.addEnvironment("SITE_URL", siteUrl);

backend.updateOrderFulfillment.addEnvironment("SITE_URL", siteUrl);
addTransactionalEmailEnv(backend.updateOrderFulfillment, {
  supportInbox: false,
});
backend.updateOrderFulfillment.addEnvironment(
  "STORAGE_BUCKET_NAME",
  backend.storage.resources.bucket.bucketName,
);

const storageBucketArn = backend.storage.resources.bucket.bucketArn;
const productImagesBucket = backend.storage.resources.bucket;

/** M13 — anonymous read for Google Merchant / Ads (products/* only; print-jobs stay private). */
const productImagesCfnBucket = productImagesBucket.node.defaultChild as s3.CfnBucket;
productImagesCfnBucket.publicAccessBlockConfiguration = {
  blockPublicAcls: true,
  ignorePublicAcls: true,
  blockPublicPolicy: false,
  restrictPublicBuckets: false,
};

new s3.BucketPolicy(productImagesBucket.stack!, "PublicProductCatalogImagesPolicy", {
  bucket: productImagesBucket,
  document: new PolicyDocument({
    statements: [
      new PolicyStatement({
        sid: "PublicReadProductCatalogImages",
        effect: Effect.ALLOW,
        principals: [new AnyPrincipal()],
        actions: ["s3:GetObject"],
        resources: [
          `${storageBucketArn}/products/*`,
          /** M23c — customer gallery photos on /gallery */
          `${storageBucketArn}/gallery/*`,
        ],
      }),
    ],
  }),
});

backend.updateOrderFulfillment.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["s3:DeleteObject"],
    resources: [`${storageBucketArn}/print-jobs/*`],
  }),
);

const sesSendPolicy = new PolicyStatement({
  actions: ["ses:SendEmail", "ses:SendRawEmail"],
  resources: ["*"],
});

backend.stripeWebhook.resources.lambda.addToRolePolicy(sesSendPolicy);
backend.notifyOrderPlaced.resources.lambda.addToRolePolicy(sesSendPolicy);
backend.updateOrderFulfillment.resources.lambda.addToRolePolicy(sesSendPolicy);
backend.adminQuotePrintRequest.resources.lambda.addToRolePolicy(sesSendPolicy);
backend.adminDeclinePrintRequest.resources.lambda.addToRolePolicy(sesSendPolicy);

const stripeWebhookUrl = backend.stripeWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

/** M6e — Set-Cookie guest session (AppSync cannot set HTTP cookies). */
const ensureGuestSessionUrl =
  backend.ensureGuestSession.resources.lambda.addFunctionUrl({
    authType: FunctionUrlAuthType.NONE,
  });

backend.addOutput({
  custom: {
    stripeWebhookUrl: stripeWebhookUrl.url,
    ensureGuestSessionUrl: ensureGuestSessionUrl.url,
    publicProductImageBaseUrl: `https://${productImagesBucket.bucketName}.s3.${productImagesBucket.stack.region}.amazonaws.com`,
  },
});
