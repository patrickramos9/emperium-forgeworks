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

backend.stripeWebhook.addEnvironment(
  "STRIPE_SECRET_KEY",
  process.env.STRIPE_SECRET_KEY ?? "",
);
backend.stripeWebhook.addEnvironment(
  "STRIPE_WEBHOOK_SECRET",
  process.env.STRIPE_WEBHOOK_SECRET ?? "",
);

const stripeWebhookUrl = backend.stripeWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

backend.addOutput({
  custom: {
    stripeWebhookUrl: stripeWebhookUrl.url,
  },
});
