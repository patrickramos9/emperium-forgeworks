import type { Schema } from "../../data/resource";
import {
  computeGrantDiscountCents,
  isGrantActive,
  pickBestGrant,
  type CatalogRefForPromo,
  type LineForPromo,
  type PromoGrantLike,
  type PromoTemplateLike,
} from "./promoCalc.js";

type DataClient = {
  models: {
    PromoGrant: {
      list: (args: {
        filter: { userId: { eq: string } };
        limit?: number;
      }) => Promise<{
        data?: Schema["PromoGrant"]["type"][] | null;
        errors?: { message: string }[];
      }>;
      get: (args: { id: string }) => Promise<{
        data?: Schema["PromoGrant"]["type"] | null;
        errors?: { message: string }[];
      }>;
    };
    PromoTemplate: {
      get: (args: { id: string }) => Promise<{
        data?: Schema["PromoTemplate"]["type"] | null;
        errors?: { message: string }[];
      }>;
    };
  };
};

export type ResolvedPromo = {
  grantId: string;
  source: NonNullable<Schema["PromoGrant"]["type"]["source"]>;
  label: string;
  discountCents: number;
  expiresAt: string | null;
};

function buildLabel(
  template: PromoTemplateLike,
  discountCents: number,
): string {
  const name = template.name ?? "Promo";
  if (template.kind === "percent" && template.percent) {
    return `${name} (${template.percent}% off)`;
  }
  return `${name} (−$${(discountCents / 100).toFixed(2)})`;
}

export async function resolvePromoForCheckout(
  client: DataClient,
  userId: string,
  lines: LineForPromo[],
  requestedGrantId?: string | null,
  catalog?: CatalogRefForPromo[],
): Promise<ResolvedPromo | null> {
  const listResult = await client.models.PromoGrant.list({
    filter: { userId: { eq: userId } },
    limit: 100,
  });
  if (listResult.errors?.length) {
    throw new Error(listResult.errors.map((e) => e.message).join("; "));
  }

  const grants = (listResult.data ?? []).filter(
    (row): row is Schema["PromoGrant"]["type"] => row != null,
  );
  const active = grants.filter((grant) =>
    isGrantActive(grant as PromoGrantLike),
  );
  if (!active.length) return null;

  const templateById = new Map<string, PromoTemplateLike>();
  const templateIds = [...new Set(active.map((g) => g.templateId))];
  await Promise.all(
    templateIds.map(async (id) => {
      const { data, errors } = await client.models.PromoTemplate.get({ id });
      if (errors?.length) return;
      if (data?.active) templateById.set(id, data);
    }),
  );

  const candidates = active
    .map((grant) => {
      const template = templateById.get(grant.templateId);
      if (!template) return null;
      const discountCents = computeGrantDiscountCents(
        grant as PromoGrantLike,
        template,
        lines,
        catalog,
      );
      if (discountCents <= 0) return null;
      return { grant: grant as PromoGrantLike, template, discountCents };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  const winner = pickBestGrant(
    candidates.map((row) => ({
      grant: row.grant,
      discountCents: row.discountCents,
    })),
  );
  if (!winner) return null;

  const full = candidates.find((c) => c.grant.id === winner.grant.id);
  if (!full) return null;

  if (requestedGrantId && requestedGrantId !== full.grant.id) {
    throw new Error("Promo offer is no longer valid. Refresh your cart.");
  }

  const grantRow = active.find((g) => g.id === full.grant.id);
  return {
    grantId: full.grant.id,
    source: grantRow?.source ?? "admin",
    label: buildLabel(full.template, full.discountCents),
    discountCents: full.discountCents,
    expiresAt: grantRow?.expiresAt ?? null,
  };
}
