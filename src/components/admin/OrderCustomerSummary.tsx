import type { OrderCustomerDisplay } from "@/lib/adminOrderCustomer";
import { orderCustomerPrimaryLabel } from "@/lib/adminOrderCustomer";

export function OrderCustomerSummary({
  customer,
}: {
  customer: OrderCustomerDisplay;
}) {
  const primary = orderCustomerPrimaryLabel(customer);

  return (
    <div className="min-w-[10rem]">
      <div className="text-on-surface">{primary}</div>
      {customer.checkoutName && customer.checkoutName !== customer.accountName && (
        <div className="text-label-sm text-on-surface-variant">
          {customer.checkoutName}
        </div>
      )}
      {customer.accountName && (
        <div className="text-label-sm text-on-surface-variant">
          Account: {customer.accountName}
        </div>
      )}
      {customer.isRegistered && !customer.email && customer.awaitingCheckoutDetails && (
        <div className="text-label-sm text-on-surface-variant">
          Registered · details after payment
        </div>
      )}
      {!customer.isRegistered && customer.awaitingCheckoutDetails && (
        <div className="text-label-sm text-on-surface-variant">Guest</div>
      )}
    </div>
  );
}
