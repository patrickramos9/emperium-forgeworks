import { Link } from "react-router-dom";
import type { Product } from "@/data/seedProducts";
import { formatPrice } from "@/data/seedProducts";
import {
  orderLineItemDisplay,
  resolveOrderLineItemHref,
  type OrderLineItemSnapshot,
} from "@/lib/orderLineItems";

type OrderLineItemRowProps = {
  item: OrderLineItemSnapshot;
  products?: Product[];
  catalogLoaded?: boolean;
  showPrice?: boolean;
  compact?: boolean;
  linkToProduct?: boolean;
  className?: string;
};

export function OrderLineItemRow({
  item,
  products = [],
  catalogLoaded = false,
  showPrice = true,
  compact = false,
  linkToProduct = true,
  className = "",
}: OrderLineItemRowProps) {
  const { productTitle, variantLabel } = orderLineItemDisplay(item);
  const textClass = compact
    ? "text-label-sm text-on-surface-variant"
    : "text-body-md text-on-surface";
  const href = resolveOrderLineItemHref(item, products, catalogLoaded);
  const titleText = `${productTitle} × ${item.quantity}`;

  return (
    <div className={`flex justify-between gap-4 ${textClass} ${className}`.trim()}>
      <div className="min-w-0">
        <p>
          {linkToProduct && href ? (
            <Link
              to={href}
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
