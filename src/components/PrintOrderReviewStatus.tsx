import type { OrderLineItemSnapshot } from "@/lib/orderLineItems";
import {
  effectivePrintReviewStatus,
  orderHasPendingPrintReview,
  orderHasRejectedPrintReview,
  orderLineHasPrintService,
  printPayloadFromOrderLine,
} from "@/lib/printService";
import { formatPrice } from "@/data/seedProducts";
import type { OrderRecord } from "@/services/orderService";

type PrintOrderReviewStatusProps = {
  items: OrderLineItemSnapshot[];
  order: Pick<OrderRecord, "refundedCents" | "totalCents">;
};

export function orderHasPrintLines(items: OrderLineItemSnapshot[]): boolean {
  return items.some((item) => orderLineHasPrintService(item));
}

export function PrintOrderReviewStatus({ items, order }: PrintOrderReviewStatusProps) {
  if (!orderHasPrintLines(items)) return null;

  const pending = orderHasPendingPrintReview(items);
  const rejected = orderHasRejectedPrintReview(items);
  const approved = items.some((item) => {
    const payload = printPayloadFromOrderLine(item);
    return payload && effectivePrintReviewStatus(payload) === "approved";
  });
  const hasCatalogLines = items.some((item) => !orderLineHasPrintService(item));

  if (pending) {
    return (
      <section className="mt-stack-lg border border-primary/30 bg-surface-container-low p-4 iron-bevel">
        <h2 className="font-headline-md text-headline-md uppercase text-primary">
          Print file review
        </h2>
        <p className="mt-2 text-body-sm text-on-surface">
          We are reviewing your uploaded file before printing begins. You will
          receive an in-app notification when the review is complete.
        </p>
      </section>
    );
  }

  if (rejected) {
    const rejectedLines = items.filter((item) => {
      const payload = printPayloadFromOrderLine(item);
      return payload && effectivePrintReviewStatus(payload) === "rejected";
    });

    return (
      <section className="mt-stack-lg border border-error/30 bg-surface-container-low p-4 iron-bevel">
        <h2 className="font-headline-md text-headline-md uppercase text-error">
          Print file not accepted
        </h2>
        {rejectedLines.map((item) => {
          const payload = printPayloadFromOrderLine(item);
          if (!payload) return null;
          return (
            <div key={payload.uploadId} className="mt-2 text-body-sm text-on-surface">
              <p>
                <strong>{payload.originalFileName}</strong> did not meet our print
                requirements.
              </p>
              {payload.reviewNotes && (
                <p className="mt-1 text-on-surface-variant">{payload.reviewNotes}</p>
              )}
            </div>
          );
        })}
        <p className="mt-3 text-body-sm text-on-surface-variant">
          {(order.refundedCents ?? 0) > 0
            ? `${formatPrice(order.refundedCents ?? 0)} has been refunded to your original payment method (timing depends on your bank or card issuer).`
            : "A refund for the print portion of your order has been issued."}
          {hasCatalogLines
            ? " Other items on this order are unaffected and will ship as usual."
            : ""}
        </p>
      </section>
    );
  }

  if (approved) {
    return (
      <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          Print file approved
        </h2>
        <p className="mt-2 text-body-sm text-on-surface-variant">
          Your uploaded file was approved. Printing will begin as your order moves
          through fulfillment.
        </p>
      </section>
    );
  }

  return null;
}
