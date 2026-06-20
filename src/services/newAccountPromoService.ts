import { getCustomerDataClient } from "@/lib/amplifyDataClient";

/** Idempotent welcome grant after email verification / sign-in. */
export async function ensureNewAccountWelcomeGrant(): Promise<boolean> {
  const client = await getCustomerDataClient();
  if (!client?.mutations.issueNewAccountWelcomeGrant) {
    return false;
  }

  const { data, errors } =
    await client.mutations.issueNewAccountWelcomeGrant({});
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  return data?.issued ?? false;
}
