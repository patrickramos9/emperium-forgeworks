import { getCustomerDataClient } from "@/lib/amplifyDataClient";
import { hasVaultAccessModel, requireVaultAccessModel } from "@/lib/dataModels";

export type VaultEntryStatus = "authorized" | "denied";

/** True when the signed-in customer has an active vault grant in the database. */
export async function userHasActiveVaultGrant(): Promise<boolean> {
  const client = await getCustomerDataClient();
  if (!client || !hasVaultAccessModel(client)) return false;

  try {
    const { getCurrentUser } = await import("aws-amplify/auth");
    const { userId } = await getCurrentUser();
    const VaultAccess = requireVaultAccessModel(client);
    const { data, errors } = await VaultAccess.list({
      filter: { userId: { eq: userId }, active: { eq: true } },
    });
    if (errors?.length) return false;
    return Boolean(data?.length);
  } catch {
    return false;
  }
}

export async function resolveVaultEntry(): Promise<VaultEntryStatus> {
  const hasGrant = await userHasActiveVaultGrant();
  return hasGrant ? "authorized" : "denied";
}
