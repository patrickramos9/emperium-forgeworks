import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { listCustomers } from "./functions/list-customers/resource";
import { lookupCustomerByEmail } from "./functions/lookup-customer-by-email/resource";
import { getGa4Dashboard } from "./functions/get-ga4-dashboard/resource";

const backend = defineBackend({
  auth,
  data,
  storage,
  lookupCustomerByEmail,
  listCustomers,
  getGa4Dashboard,
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
