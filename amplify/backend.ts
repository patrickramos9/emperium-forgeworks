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

backend.stripeWebhook.addEnvironment(
  "STRIPE_SECRET_KEY",
  process.env.STRIPE_SECRET_KEY ?? "",
);
backend.stripeWebhook.addEnvironment(
  "STRIPE_WEBHOOK_SECRET",
  process.env.STRIPE_WEBHOOK_SECRET ?? "",
);
backend.stripeWebhook.addEnvironment("SITE_URL", siteUrl);
backend.stripeWebhook.addEnvironment(
  "SUPPORT_INBOX_EMAIL",
  process.env.SUPPORT_INBOX_EMAIL ?? "melissa@emperiumforgeworks.com",
);
backend.stripeWebhook.addEnvironment(
  "ORDER_NOTIFICATION_FROM_EMAIL",
  process.env.ORDER_NOTIFICATION_FROM_EMAIL ??
    "melissa@emperiumforgeworks.com",
);

backend.notifyOrderPlaced.addEnvironment("SITE_URL", siteUrl);
backend.notifyOrderPlaced.addEnvironment(
  "SUPPORT_INBOX_EMAIL",
  process.env.SUPPORT_INBOX_EMAIL ?? "melissa@emperiumforgeworks.com",
);
backend.notifyOrderPlaced.addEnvironment(
  "ORDER_NOTIFICATION_FROM_EMAIL",
  process.env.ORDER_NOTIFICATION_FROM_EMAIL ??
    "melissa@emperiumforgeworks.com",
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
backend.adminDeclinePrintRequest.addEnvironment("SITE_URL", siteUrl);

backend.createPrintQuoteCheckout.addEnvironment(
  "STRIPE_SECRET_KEY",
  process.env.STRIPE_SECRET_KEY ?? "",
);
backend.createPrintQuoteCheckout.addEnvironment("SITE_URL", siteUrl);

backend.updateOrderFulfillment.addEnvironment("SITE_URL", siteUrl);
backend.updateOrderFulfillment.addEnvironment(
  "ORDER_NOTIFICATION_FROM_EMAIL",
  process.env.ORDER_NOTIFICATION_FROM_EMAIL ??
    "melissa@emperiumforgeworks.com",
);
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
        resources: [`${storageBucketArn}/products/*`],
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

const stripeWebhookUrl = backend.stripeWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

backend.addOutput({
  custom: {
    stripeWebhookUrl: stripeWebhookUrl.url,
    publicProductImageBaseUrl: `https://${productImagesBucket.bucketName}.s3.${productImagesBucket.stack.region}.amazonaws.com`,
  },
});
