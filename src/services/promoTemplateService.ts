import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";
import { requirePromoTemplateModel } from "@/lib/dataModels";

export type PromoTemplateRecord = Schema["PromoTemplate"]["type"];

export type PromoTemplateInput = {
  name: string;
  kind: NonNullable<PromoTemplateRecord["kind"]>;
  percent?: number;
  amountCents?: number;
  active: boolean;
  defaultExpiresInDays?: number;
  useForThankYou: boolean;
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
  };
}

async function clearOtherThankYouTemplates(
  client: AmplifyDataClient,
  exceptId?: string,
) {
  const PromoTemplate = requirePromoTemplateModel(client);
  const rows = await listAllPromoTemplates(client);
  await Promise.all(
    rows
      .filter((row) => row.useForThankYou && row.id !== exceptId)
      .map((row) =>
        PromoTemplate.update({ id: row.id, useForThankYou: false }),
      ),
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

export async function createPromoTemplate(
  client: AmplifyDataClient,
  input: PromoTemplateInput,
): Promise<PromoTemplateRecord> {
  const PromoTemplate = requirePromoTemplateModel(client);
  if (input.useForThankYou) {
    await clearOtherThankYouTemplates(client);
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
    await clearOtherThankYouTemplates(client, id);
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
  const PromoTemplate = requirePromoTemplateModel(client);
  const { errors } = await PromoTemplate.delete({ id });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}
