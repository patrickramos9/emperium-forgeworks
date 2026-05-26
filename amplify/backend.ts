import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { lookupCustomerByEmail } from "./functions/lookup-customer-by-email/resource";

const backend = defineBackend({
  auth,
  data,
  storage,
  lookupCustomerByEmail,
});

backend.lookupCustomerByEmail.addEnvironment(
  "USER_POOL_ID",
  backend.auth.resources.userPool.userPoolId,
);
