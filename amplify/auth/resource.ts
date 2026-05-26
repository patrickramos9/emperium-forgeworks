import { defineAuth } from "@aws-amplify/backend";
import { addCustomerToGroup } from "../functions/add-customer-to-group/resource";
import { lookupCustomerByEmail } from "../functions/lookup-customer-by-email/resource";

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ["admin", "customer"],
  triggers: {
    postConfirmation: addCustomerToGroup,
  },
  access: (allow) => [
    allow.resource(addCustomerToGroup).to(["addUserToGroup"]),
    allow.resource(lookupCustomerByEmail).to(["listUsers"]),
  ],
});
