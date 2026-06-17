import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { requirePromoGrantModel, requirePromoTemplateModel } from "@/lib/dataModels";
import {
  buildPromoLabel,
  computeGrantDiscountCents,
  expiresAtFromTemplateDays,
  formatPromoExpiry,
  isGrantActive,
  pickBestGrant,
  type AppliedPromo,
  type CartLineForPromo,
  type PromoGrantRecord,
  type PromoGrantSource,
  type PromoTemplateRecord,
} from "@/lib/promoGrants";
import { formatPrice } from "@/data/seedProducts";
import { createPromoGrantNotification } from "@/services/notificationService";

export type { PromoGrantRecord, PromoTemplateRecord };

export async function listGrantsForUser(
  client: AmplifyDataClient,
  userId: string,
): Promise<PromoGrantRecord[]> {
  const PromoGrant = requirePromoGrantModel(client);
  const rows: PromoGrantRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await PromoGrant.list({
      limit: 100,
      nextToken,
      filter: { userId: { eq: userId } },
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows;
}

export async function listAllPromoGrants(
  client: AmplifyDataClient,
): Promise<PromoGrantRecord[]> {
  const PromoGrant = requirePromoGrantModel(client);
  const rows: PromoGrantRecord[] = [];
  let nextToken: string | undefined;

  do {
    const response = await PromoGrant.list({ limit: 100, nextToken });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) rows.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  return rows.sort(
    (a, b) =>
      Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""),
  );
}

export async function issuePromoGrant(
  client: AmplifyDataClient,
  input: {
    templateId: string;
    userId: string;
    source: PromoGrantSource;
    productId?: string;
    expiresAt?: string;
    notify?: boolean;
  },
): Promise<PromoGrantRecord> {
  const PromoGrant = requirePromoGrantModel(client);
  const template = await requirePromoTemplateModel(client).get({
    id: input.templateId,
  });
  if (template.errors?.length || !template.data) {
    throw new Error("Promo template not found.");
  }
  if (!template.data.active) {
    throw new Error("Promo template is inactive.");
  }

  const expiresAt =
    input.expiresAt ??
    expiresAtFromTemplateDays(template.data.defaultExpiresInDays);

  const { data, errors } = await PromoGrant.create({
    templateId: input.templateId,
    userId: input.userId,
    source: input.source,
    expiresAt,
    ...(input.productId ? { productId: input.productId } : {}),
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) throw new Error("Could not issue promo grant.");

  if (input.notify !== false) {
    const discountPreview =
      template.data.kind === "percent"
        ? `${template.data.percent}% off`
        : formatPrice(template.data.amountCents ?? 0);
    await createPromoGrantNotification(client, {
      userId: input.userId,
      title: "New offer on your account",
      body: `${template.data.name}: ${discountPreview}. Expires ${formatPromoExpiry(expiresAt)}. Applies automatically at checkout.`,
    });
  }

  return data;
}

export async function revokePromoGrant(
  client: AmplifyDataClient,
  grantId: string,
): Promise<void> {
  const PromoGrant = requirePromoGrantModel(client);
  const { errors } = await PromoGrant.update({
    id: grantId,
    revokedAt: new Date().toISOString(),
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

export async function resolveBestAppliedPromo(
  client: AmplifyDataClient,
  userId: string,
  lines: CartLineForPromo[],
  catalog?: { id: string; slug: string }[],
  options?: { preferSource?: PromoGrantSource },
): Promise<AppliedPromo | null> {
  const grants = await listGrantsForUser(client, userId);
  const active = grants.filter((grant) => isGrantActive(grant));
  if (!active.length) return null;

  const templateIds = [...new Set(active.map((g) => g.templateId))];
  const templateById = new Map<string, PromoTemplateRecord>();

  await Promise.all(
    templateIds.map(async (id) => {
      const result = await requirePromoTemplateModel(client).get({ id });
      if (result.errors?.length) {
        console.error(
          "[promo] template load failed",
          id,
          result.errors.map((e) => e.message).join("; "),
        );
        return;
      }
      // Inactive templates still honor already-issued grants at checkout.
      if (result.data) templateById.set(id, result.data);
    }),
  );

  const candidates = active
    .map((grant) => {
      const template = templateById.get(grant.templateId);
      if (!template) return null;
      const discountCents = computeGrantDiscountCents(
        grant,
        template,
        lines,
        catalog,
      );
      if (discountCents <= 0) return null;
      return { grant, template, discountCents };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  const winner = pickBestGrant(candidates, options?.preferSource);
  if (!winner) return null;

  const expiresAt = winner.grant.expiresAt ?? null;
  return {
    grantId: winner.grant.id,
    source: winner.grant.source!,
    label: buildPromoLabel(winner.template, winner.discountCents, formatPrice),
    discountCents: winner.discountCents,
    expiresAt: expiresAt ?? "",
    expiresLabel: formatPromoExpiry(expiresAt),
  };
}
