import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { requireVaultAccessModel } from "@/lib/dataModels";
import type { Schema } from "../../amplify/data/resource";

export type VaultAccessRecord = Schema["VaultAccess"]["type"];

export async function listAllVaultAccess(
  client: AmplifyDataClient,
): Promise<VaultAccessRecord[]> {
  const VaultAccess = requireVaultAccessModel(client);
  const rows: VaultAccessRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await VaultAccess.list({
      limit: 100,
      nextToken,
    });

    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }

    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }

    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort((a, b) =>
    (a.userEmail ?? "").localeCompare(b.userEmail ?? ""),
  );
}
