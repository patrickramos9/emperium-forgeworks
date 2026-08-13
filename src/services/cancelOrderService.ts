import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import { getStoredGuestSession } from "@/services/guestSessionService";

export type CancelCustomerOrderResult = {
  success: boolean;
  refundId?: string | null;
  refundedCents: number;
  orderStatus: string;
};

export async function cancelCustomerOrder(
  client: AmplifyDataClient,
  orderId: string,
  options?: { asGuest?: boolean },
): Promise<CancelCustomerOrderResult> {
  if (!client.mutations.cancelCustomerOrder) {
    throw new Error(
      "Order cancellation is not deployed. Redeploy the Amplify backend.",
    );
  }

  let guestArgs: { guestId: string; guestToken: string } | undefined;
  if (options?.asGuest) {
    const session = getStoredGuestSession();
    if (!session) {
      throw new Error("Guest session not ready — reload and try again.");
    }
    guestArgs = session;
  }

  const { data, errors } = await client.mutations.cancelCustomerOrder({
    orderId,
    ...(guestArgs
      ? { guestId: guestArgs.guestId, guestToken: guestArgs.guestToken }
      : {}),
  });

  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!data) {
    throw new Error("Cancellation failed.");
  }

  return data;
}
