import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";
import { requireShippingProfileModel } from "@/lib/dataModels";
import type { WeightTier, InternationalShippingRate } from "@/lib/shippingProfiles";
import { toJsonField } from "@/lib/productPayload";

export type ShippingProfileRecord = Schema["ShippingProfile"]["type"];

export type ShippingProfileInput = {
  name: string;
  description?: string;
  kind: NonNullable<ShippingProfileRecord["kind"]>;
  amountCents: number;
  additionalItemCents?: number;
  freeThresholdCents?: number;
  weightTiers?: WeightTier[];
  internationalRates: InternationalShippingRate[];
  active: boolean;
  isDefault: boolean;
  sortOrder: number;
  minReadyToShipDays?: number;
  maxReadyToShipDays?: number;
};

function toMutationPayload(input: ShippingProfileInput) {
  return {
    name: input.name,
    description: input.description,
    kind: input.kind,
    amountCents: input.amountCents,
    additionalItemCents: input.additionalItemCents ?? 0,
    freeThresholdCents: input.freeThresholdCents,
    weightTiers:
      input.kind === "weight_tier"
        ? toJsonField(input.weightTiers ?? [])
        : null,
    internationalRates: toJsonField(input.internationalRates),
    allowedCountries: ["US"],
    active: input.active,
    isDefault: input.isDefault,
    sortOrder: input.sortOrder,
    minReadyToShipDays: input.minReadyToShipDays,
    maxReadyToShipDays: input.maxReadyToShipDays,
  };
}

async function clearOtherDefaultProfiles(
  client: AmplifyDataClient,
  exceptId?: string,
) {
  const ShippingProfile = requireShippingProfileModel(client);
  const rows = await listAllShippingProfiles(client);
  await Promise.all(
    rows
      .filter((row) => row.isDefault && row.id !== exceptId)
      .map((row) => ShippingProfile.update({ id: row.id, isDefault: false })),
  );
}

export async function listAllShippingProfiles(
  client: AmplifyDataClient,
): Promise<ShippingProfileRecord[]> {
  const ShippingProfile = requireShippingProfileModel(client);
  const rows: ShippingProfileRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await ShippingProfile.list({ limit: 50, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return listSortedShippingProfiles(rows);
}

export function firstShippingProfileId(
  profiles: ShippingProfileRecord[],
): string {
  return listSortedShippingProfiles(profiles)[0]?.id ?? "";
}

function listSortedShippingProfiles(
  profiles: ShippingProfileRecord[],
): ShippingProfileRecord[] {
  return [...profiles].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
  );
}

export async function getShippingProfileById(
  client: AmplifyDataClient,
  id: string,
): Promise<ShippingProfileRecord | null> {
  const ShippingProfile = requireShippingProfileModel(client);
  const { data, errors } = await ShippingProfile.get({ id });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return data ?? null;
}

export async function createShippingProfile(
  client: AmplifyDataClient,
  input: ShippingProfileInput,
): Promise<ShippingProfileRecord> {
  const ShippingProfile = requireShippingProfileModel(client);
  if (input.isDefault) {
    await clearOtherDefaultProfiles(client);
  }
  const { data, errors } = await ShippingProfile.create(toMutationPayload(input));
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Could not create shipping profile.");
  }
  return data;
}

export async function updateShippingProfile(
  client: AmplifyDataClient,
  id: string,
  input: ShippingProfileInput,
): Promise<ShippingProfileRecord> {
  const ShippingProfile = requireShippingProfileModel(client);
  if (input.isDefault) {
    await clearOtherDefaultProfiles(client, id);
  }
  const { data, errors } = await ShippingProfile.update({
    id,
    ...toMutationPayload(input),
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Could not update shipping profile.");
  }
  return data;
}

export async function deleteShippingProfile(
  client: AmplifyDataClient,
  id: string,
): Promise<void> {
  const ShippingProfile = requireShippingProfileModel(client);
  const { errors } = await ShippingProfile.delete({ id });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}
