import type { OrderSharedDataClient } from "./dataClient.js";

/** Create an in-app inbox row for a guest print shopper (no SES required). */
export async function createGuestPrintNotification(
  dataClient: OrderSharedDataClient,
  input: {
    guestId: string;
    title: string;
    body: string;
    sortOrder?: number;
  },
): Promise<boolean> {
  const model = dataClient.models.GuestNotification;
  if (!model) {
    console.warn("GuestNotification model not available");
    return false;
  }

  const result = await model.create({
    guestId: input.guestId,
    title: input.title,
    body: input.body,
    kind: "order",
    active: true,
    sortOrder: input.sortOrder ?? 86,
  });
  if (result.errors?.length) {
    console.error(
      "GuestNotification create failed",
      result.errors.map((e: { message: string }) => e.message).join("; "),
    );
    return false;
  }
  return Boolean(result.data?.id);
}
