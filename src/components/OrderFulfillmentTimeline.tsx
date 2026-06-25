import {
  displayFulfillmentStatus,
  fulfillmentStatusLabel,
  FULFILLMENT_STAGES,
  type FulfillmentStatus,
} from "@/lib/orderFulfillment";
import { isFullyRefundedOrder } from "@/lib/orderRefunds";

type Props = {
  order: {
    fulfillmentStatus?: FulfillmentStatus | null;
    status?: string | null;
    refundedCents?: number | null;
    totalCents?: number;
    refunds?: unknown;
  };
  compact?: boolean;
};

export function OrderFulfillmentTimeline({ order, compact = false }: Props) {
  if (isFullyRefundedOrder(order)) {
    return (
      <p className="text-body-sm text-on-surface-variant">
        Fulfillment timeline reflects progress before this order was refunded or
        cancelled.
      </p>
    );
  }

  const current = displayFulfillmentStatus(order);
  const currentIndex = current
    ? FULFILLMENT_STAGES.indexOf(current)
    : -1;

  return (
    <ol
      className={
        compact
          ? "flex flex-wrap gap-2"
          : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      }
    >
      {FULFILLMENT_STAGES.map((stage, index) => {
        const isComplete = currentIndex >= index;
        const isCurrent = current === stage;
        return (
          <li
            key={stage}
            className={`border px-3 py-2 iron-bevel ${
              isCurrent
                ? "border-primary bg-primary/10"
                : isComplete
                  ? "border-outline-variant/30 bg-surface-container-low"
                  : "border-outline-variant/15 bg-surface-container-low/50 opacity-70"
            }`}
          >
            <p className="font-label-sm uppercase text-on-surface-variant">
              Step {index + 1}
            </p>
            <p
              className={`font-label-md ${
                isCurrent ? "text-primary" : "text-on-surface"
              }`}
            >
              {fulfillmentStatusLabel(stage)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
