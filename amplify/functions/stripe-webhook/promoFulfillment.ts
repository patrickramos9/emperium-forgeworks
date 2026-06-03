import type { Schema } from "../../data/resource";
import { expiresAtFromTemplateDays } from "./promoTemplateUtils.js";

type DataClient = ReturnType<
  typeof import("aws-amplify/data").generateClient<Schema>
>;

export async function redeemPromoGrantForOrder(
  client: DataClient,
  order: Schema["Order"]["type"],
): Promise<void> {
  const grantId = order.promoGrantId;
  if (!grantId) return;

  const { errors } = await client.models.PromoGrant.update({
    id: grantId,
    redeemedAt: new Date().toISOString(),
    orderId: order.id,
  });
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

export async function issueThankYouGrant(
  client: DataClient,
  userId: string,
): Promise<void> {
  const templates: Schema["PromoTemplate"]["type"][] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.models.PromoTemplate.list({
      limit: 50,
      nextToken,
    });
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join("; "));
    }
    for (const row of response.data ?? []) {
      if (row) templates.push(row);
    }
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);

  const template = templates.find((t) => t.active && t.useForThankYou);
  if (!template) return;

  const expiresAt = expiresAtFromTemplateDays(template.defaultExpiresInDays);
  const discountLabel =
    template.kind === "percent"
      ? `${template.percent}% off your next order`
      : `$${((template.amountCents ?? 0) / 100).toFixed(2)} off your next order`;

  const grantResult = await client.models.PromoGrant.create({
    templateId: template.id,
    userId,
    source: "thank_you",
    expiresAt,
  });
  if (grantResult.errors?.length) {
    throw new Error(grantResult.errors.map((e) => e.message).join("; "));
  }

  const expiryText =
    template.defaultExpiresInDays != null && template.defaultExpiresInDays > 0
      ? ` Expires ${new Date(expiresAt).toLocaleDateString("en-US")}.`
      : "";

  await client.models.Notification.create({
    title: "Thank you for your order",
    body: `${template.name}: ${discountLabel}.${expiryText} It will apply automatically at checkout when signed in.`,
    kind: "marketing",
    userId,
    active: true,
    sortOrder: 60,
  });
}
