import { defineAuth } from "@aws-amplify/backend";
import { addCustomerToGroup } from "../functions/add-customer-to-group/resource";
import { listCustomers } from "../functions/list-customers/resource";
import { lookupCustomerByEmail } from "../functions/lookup-customer-by-email/resource";
import { adminQuotePrintRequest } from "../functions/admin-quote-print-request/resource";
import { adminDeclinePrintRequest } from "../functions/admin-decline-print-request/resource";
import { updateOrderFulfillment } from "../functions/update-order-fulfillment/resource";
import { stripeWebhook } from "../functions/stripe-webhook/resource";
import { guestMessages } from "../functions/guest-messages/resource";
import { createStripeCheckout } from "../functions/create-stripe-checkout/resource";
import { createPrintQuoteCheckout } from "../functions/create-print-quote-checkout/resource";
import { mergeGuestIdentity } from "../functions/merge-guest-identity/resource";
import { notifyOrderPlaced } from "../functions/notify-order-placed/resource";

const siteUrl = (
  process.env.SITE_URL ??
  process.env.VITE_SITE_URL ??
  "https://emperiumforgeworks.com"
).replace(/\/$/, "");

const verifyAccountUrl = `${siteUrl}/account/register/verify`;

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: "Verify your Emperium Forgeworks account",
      verificationEmailBody: (createCode) =>
        [
          "Welcome to Emperium Forgeworks.",
          "",
          `Your verification code is: ${createCode()}`,
          "",
          `Enter this code at ${verifyAccountUrl} to finish creating your account.`,
          "",
          "You can complete verification at any time using that link and the code above.",
          "",
          "If you did not sign up, you can ignore this email.",
        ].join("\n"),
    },
  },
  groups: ["admin", "customer"],
  triggers: {
    postConfirmation: addCustomerToGroup,
  },
  access: (allow) => [
    allow.resource(addCustomerToGroup).to(["addUserToGroup"]),
    allow.resource(lookupCustomerByEmail).to(["listUsers"]),
    allow.resource(listCustomers).to(["listUsersInGroup"]),
    allow.resource(adminQuotePrintRequest).to(["getUser"]),
    allow.resource(adminDeclinePrintRequest).to(["getUser"]),
    allow.resource(updateOrderFulfillment).to(["getUser"]),
    allow.resource(stripeWebhook).to(["getUser"]),
    allow.resource(guestMessages).to(["getUser"]),
    allow.resource(createStripeCheckout).to(["getUser"]),
    allow.resource(createPrintQuoteCheckout).to(["getUser"]),
    allow.resource(mergeGuestIdentity).to(["getUser"]),
    allow.resource(notifyOrderPlaced).to(["getUser"]),
  ],
});
