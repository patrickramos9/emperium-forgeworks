import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { SHIPPING_DISPATCH_SHORT } from "@/lib/shippingPromise";

type CheckoutTrustStripProps = {
  /** Tighter spacing for cart summary column. */
  compact?: boolean;
  className?: string;
};

/**
 * Returns / shipping / Stripe reassurance near purchase CTAs (M23a / M23b).
 * Prefer this over inventing new third-party seals — Stripe + policy links are already real.
 */
export function CheckoutTrustStrip({
  compact = false,
  className = "",
}: CheckoutTrustStripProps) {
  const gap = compact ? "gap-2" : "gap-2.5";
  const text = compact ? "text-[11px]" : "text-body-sm";

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <ul className={`space-y-2 ${text} text-on-surface-variant`}>
        <li className={`flex items-start ${gap}`}>
          <Icon
            name="lock"
            className="mt-0.5 shrink-0 text-primary"
            filled
          />
          <span>
            Secure checkout powered by{" "}
            <span className="text-on-surface">Stripe</span> — your card details
            never touch our servers. Cards, Apple Pay, and Google Pay supported.
          </span>
        </li>
        <li className={`flex items-start ${gap}`}>
          <Icon
            name="undo"
            className="mt-0.5 shrink-0 text-primary"
            filled
          />
          <span>
            <span className="text-on-surface">30-day returns</span> on new
            products — refunds to your original payment method.
          </span>
        </li>
        <li className={`flex items-start ${gap}`}>
          <Icon
            name="local_shipping"
            className="mt-0.5 shrink-0 text-primary"
            filled
          />
          <span>{SHIPPING_DISPATCH_SHORT}</span>
        </li>
      </ul>
      <p className={`${text}`}>
        <Link
          to="/shipping-returns"
          className="font-label-sm uppercase tracking-wide text-primary hover:underline"
        >
          Shipping &amp; returns
        </Link>
      </p>
    </div>
  );
}
