import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";
import { requirePromoTemplateModel } from "@/lib/dataModels";
import { isGrantActive } from "@/lib/promoGrants";
import { listAllPromoGrants } from "@/services/promoGrantService";

export type PromoTemplateRecord = Schema["PromoTemplate"]["type"];

export type PromoTemplateInput = {
  name: string;
  kind: NonNullable<PromoTemplateRecord["kind"]>;
  percent?: number;
  amountCents?: number;
  active: boolean;
  defaultExpiresInDays?: number;
  useForThankYou: boolean;
  useForFavorite: boolean;
  useForAbandonedCart: boolean;
  useForNewAccount: boolean;
  abandonAfterHours?: number;
};

function toPayload(input: PromoTemplateInput) {
  return {
    name: input.name.trim(),
    kind: input.kind,
    percent: input.kind === "percent" ? (input.percent ?? 0) : null,
    amountCents: input.kind === "fixed" ? (input.amountCents ?? 0) : null,
    active: input.active,
    defaultExpiresInDays: input.defaultExpiresInDays ?? null,
    useForThankYou: input.useForThankYou,
    useForFavorite: input.useForFavorite,
    useForAbandonedCart: input.useForAbandonedCart,
    useForNewAccount: input.useForNewAccount,
    abandonAfterHours: input.useForAbandonedCart
      ? (input.abandonAfterHours ?? 24)
      : null,
  };
}

async function clearExclusiveTemplateFlag(
  client: AmplifyDataClient,
  flag:
    | "useForThankYou"
    | "useForFavorite"
    | "useForAbandonedCart"
    | "useForNewAccount",
  exceptId?: string,
) {
  const PromoTemplate = requirePromoTemplateModel(client);
  const rows = await listAllPromoTemplates(client);
  await Promise.all(
    rows
      .filter((row) => row[flag] && row.id !== exceptId)
      .map((row) => PromoTemplate.update({ id: row.id, [flag]: false })),
  );
}

export async function listAllPromoTemplates(
  client: AmplifyDataClient,
): Promise<PromoTemplateRecord[]> {
  const PromoTemplate = requirePromoTemplateModel(client);
  const rows: PromoTemplateRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await PromoTemplate.list({ limit: 50, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPromoTemplateById(
  client: AmplifyDataClient,
  id: string,
): Promise<PromoTemplateRecord | null> {
  const PromoTemplate = requirePromoTemplateModel(client);
  const { data, errors } = await PromoTemplate.get({ id });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return data ?? null;
}

/** Every grant templateId maps to its template, or null when the template was deleted. */
export async function resolveTemplatesForGrants(
  client: AmplifyDataClient,
  grantTemplateIds: string[],
  templates?: PromoTemplateRecord[],
): Promise<Map<string, PromoTemplateRecord | null>> {
  const allTemplates = templates ?? (await listAllPromoTemplates(client));
  const map = new Map<string, PromoTemplateRecord | null>(
    allTemplates.map((row) => [row.id, row]),
  );

  const missingIds = [
    ...new Set(grantTemplateIds.filter((id) => id && !map.has(id))),
  ];

  await Promise.all(
    missingIds.map(async (id) => {
      map.set(id, await getPromoTemplateById(client, id));
    }),
  );

  return map;
}

export async function grantCountsForTemplate(
  client: AmplifyDataClient,
  templateId: string,
): Promise<{ total: number; open: number }> {
  const grants = await listAllPromoGrants(client);
  const matching = grants.filter((grant) => grant.templateId === templateId);
  return {
    total: matching.length,
    open: matching.filter((grant) => isGrantActive(grant)).length,
  };
}

export async function createPromoTemplate(
  client: AmplifyDataClient,
  input: PromoTemplateInput,
): Promise<PromoTemplateRecord> {
  const PromoTemplate = requirePromoTemplateModel(client);
  if (input.useForThankYou) {
    await clearExclusiveTemplateFlag(client, "useForThankYou");
  }
  if (input.useForFavorite) {
    await clearExclusiveTemplateFlag(client, "useForFavorite");
  }
  if (input.useForAbandonedCart) {
    await clearExclusiveTemplateFlag(client, "useForAbandonedCart");
  }
  if (input.useForNewAccount) {
    await clearExclusiveTemplateFlag(client, "useForNewAccount");
  }
  const { data, errors } = await PromoTemplate.create(toPayload(input));
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) throw new Error("Could not create promo template.");
  return data;
}

export async function updatePromoTemplate(
  client: AmplifyDataClient,
  id: string,
  input: PromoTemplateInput,
): Promise<PromoTemplateRecord> {
  const PromoTemplate = requirePromoTemplateModel(client);
  if (input.useForThankYou) {
    await clearExclusiveTemplateFlag(client, "useForThankYou", id);
  }
  if (input.useForFavorite) {
    await clearExclusiveTemplateFlag(client, "useForFavorite", id);
  }
  if (input.useForAbandonedCart) {
    await clearExclusiveTemplateFlag(client, "useForAbandonedCart", id);
  }
  if (input.useForNewAccount) {
    await clearExclusiveTemplateFlag(client, "useForNewAccount", id);
  }
  const { data, errors } = await PromoTemplate.update({
    id,
    ...toPayload(input),
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) throw new Error("Could not update promo template.");
  return data;
}

export async function deletePromoTemplate(
  client: AmplifyDataClient,
  id: string,
): Promise<void> {
  const { open } = await grantCountsForTemplate(client, id);
  if (open > 0) {
    throw new Error(
      `Cannot delete: ${open} open grant${open === 1 ? "" : "s"} still reference this template. Revoke them in Issued grants first.`,
    );
  }

  const PromoTemplate = requirePromoTemplateModel(client);
  const { errors } = await PromoTemplate.delete({ id });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}
