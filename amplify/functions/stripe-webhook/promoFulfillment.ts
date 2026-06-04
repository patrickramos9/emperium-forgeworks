import type { Schema } from "../../data/resource";
import {
  createPromoGrantWithNotification,
  findActiveTemplate,
  listAllTemplates,
  reissueFavoriteGrantsAfterOrder,
} from "../promo-shared/grantIssuance.js";

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
  const templates = await listAllTemplates(client);
  const template = findActiveTemplate(templates, "useForThankYou");
  if (!template) return;

  await createPromoGrantWithNotification(client, {
    template,
    userId,
    source: "thank_you",
    notification: {
      title: "Thank you for your order",
      bodyPrefix: "Your next-order offer is ready —",
    },
  });
}

export { reissueFavoriteGrantsAfterOrder };
