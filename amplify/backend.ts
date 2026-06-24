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
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

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

backend.updateOrderFulfillment.addEnvironment("SITE_URL", siteUrl);
backend.updateOrderFulfillment.addEnvironment(
  "ORDER_NOTIFICATION_FROM_EMAIL",
  process.env.ORDER_NOTIFICATION_FROM_EMAIL ??
    "melissa@emperiumforgeworks.com",
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
  },
});
