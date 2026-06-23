import { Link } from "react-router-dom";
import { formatPrice } from "@/data/seedProducts";
import {
  orderLineItemDisplay,
  type OrderLineItemSnapshot,
} from "@/lib/orderLineItems";

type OrderLineItemRowProps = {
  item: OrderLineItemSnapshot;
  showPrice?: boolean;
  compact?: boolean;
  linkToProduct?: boolean;
  className?: string;
};

export function OrderLineItemRow({
  item,
  showPrice = true,
  compact = false,
  linkToProduct = true,
  className = "",
}: OrderLineItemRowProps) {
  const { productTitle, variantLabel } = orderLineItemDisplay(item);
  const textClass = compact
    ? "text-label-sm text-on-surface-variant"
    : "text-body-md text-on-surface";
  const slug = item.slug?.trim();
  const titleText = `${productTitle} × ${item.quantity}`;

  return (
    <div className={`flex justify-between gap-4 ${textClass} ${className}`.trim()}>
      <div className="min-w-0">
        <p>
          {linkToProduct && slug ? (
            <Link
              to={`/shop/${slug}`}
              className="hover:text-primary hover:underline"
            >
              {titleText}
            </Link>
          ) : (
            titleText
          )}
        </p>
        {variantLabel && (
          <p className={compact ? "text-label-sm text-on-surface-variant/80" : "text-label-sm text-on-surface-variant"}>
            {variantLabel}
          </p>
        )}
      </div>
      {showPrice && (
        <span className={`shrink-0 ${compact ? "text-label-sm" : "text-primary"}`}>
          {formatPrice(item.priceCents * item.quantity)}
        </span>
      )}
    </div>
  );
}
