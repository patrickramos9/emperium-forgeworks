import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import type { ProductShippingDisplay } from "@/lib/shippingProfiles";

type ProductShippingInfoProps = {
  shipping: ProductShippingDisplay | null;
  loading?: boolean;
  emptyMessage?: string | null;
};

function ShippingReturnsLink() {
  return (
    <p className="mt-2 text-[11px] text-on-surface-variant/70">
      <Link to="/shipping-returns" className="hover:text-primary">
        Shipping &amp; returns
      </Link>
    </p>
  );
}

export function ProductShippingInfo({
  shipping,
  loading = false,
  emptyMessage = null,
}: ProductShippingInfoProps) {
  if (loading) {
    return (
      <div className="border border-outline-variant/10 bg-surface-container-high p-4 iron-bevel">
        <p className="font-label-sm text-on-surface-variant">
          Loading shipping…
        </p>
        <ShippingReturnsLink />
      </div>
    );
  }

  if (!shipping) {
    return (
      <div className="border border-outline-variant/10 bg-surface-container-high p-4 iron-bevel">
        <p className="font-body-sm text-on-surface-variant">
          {emptyMessage ?? "Shipping details are not available for this item yet."}
        </p>
        <ShippingReturnsLink />
      </div>
    );
  }

  return (
    <div className="border border-outline-variant/10 bg-surface-container-high p-4 iron-bevel">
      <div className="flex items-start gap-3">
        <Icon
          name="local_shipping"
          className="mt-0.5 text-primary"
          filled
        />
        <div className="space-y-1">
          <p className="font-label-sm uppercase tracking-wide text-on-surface">
            {shipping.profileName}
          </p>
          <p className="font-body-sm text-on-surface-variant">
            {shipping.rateLabel}
          </p>
          {shipping.readyToShipLabel && (
            <p className="font-body-sm text-on-surface-variant">
              {shipping.readyToShipLabel}
            </p>
          )}
        </div>
      </div>
      <ShippingReturnsLink />
    </div>
  );
}
