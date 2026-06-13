import type { CustomerLabel } from "@/lib/customerAdmin";
import type { OrderRecord } from "@/services/orderService";

export type OrderCustomerDisplay = {
  email: string | null;
  checkoutName: string | null;
  accountName: string | null;
  accountEmail: string | null;
  phone: string | null;
  isRegistered: boolean;
  awaitingCheckoutDetails: boolean;
};

export function buildOrderCustomerDisplay(
  order: OrderRecord,
  label?: CustomerLabel | null,
): OrderCustomerDisplay {
  const orderEmail = order.email?.trim() || null;
  const accountEmail = label?.email?.trim() || null;
  const checkoutName = order.customerName?.trim() || null;
  const accountName =
    label?.accountName?.trim() ||
    (label?.displayName &&
    label.displayName !== accountEmail &&
    label.displayName !== orderEmail
      ? label.displayName
      : null);
  const phone = order.customerPhone?.trim() || null;
  const isRegistered = Boolean(order.userId?.trim());
  const email = orderEmail || accountEmail;
  const awaitingCheckoutDetails =
    order.status === "pending" && !orderEmail && !checkoutName && !phone;

  return {
    email,
    checkoutName,
    accountName,
    accountEmail,
    phone,
    isRegistered,
    awaitingCheckoutDetails,
  };
}

export function orderCustomerPrimaryLabel(
  display: OrderCustomerDisplay,
): string {
  if (display.email) return display.email;
  if (display.isRegistered && display.accountEmail) {
    return display.accountEmail;
  }
  if (display.awaitingCheckoutDetails) {
    return display.isRegistered
      ? "Signed-in customer (awaiting checkout)"
      : "Guest checkout (awaiting payment)";
  }
  return display.isRegistered ? "Registered customer" : "Guest checkout";
}

export function missingShippingAddressMessage(
  status: OrderRecord["status"] | null | undefined,
): string {
  if (status === "pending") {
    return "Checkout is still in progress. The shipping address is collected during payment and will appear here once the order is paid.";
  }
  if (status === "failed") {
    return "Checkout was not completed — no shipping address was collected.";
  }
  if (status === "cancelled") {
    return "This order was cancelled — shipping may not apply.";
  }
  if (status === "refunded") {
    return "This order was refunded.";
  }
  return "No shipping address recorded for this order.";
}
