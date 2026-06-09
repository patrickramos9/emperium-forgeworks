import type { MouseEvent } from "react";
import { MAX_LINE_QTY } from "@/lib/cartConstants";

type Props = {
  value: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** Stop row click handlers (e.g. variant toggle) from firing. */
  stopPropagation?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = MAX_LINE_QTY,
  disabled = false,
  stopPropagation = false,
  size = "md",
  className = "",
}: Props) {
  const pad = size === "sm" ? "px-2 py-0.5 text-label-sm" : "px-3 py-1";
  const width = size === "sm" ? "w-7" : "w-8";

  function wrapClick(handler: () => void) {
    return (e: MouseEvent) => {
      if (stopPropagation) e.stopPropagation();
      handler();
    };
  }

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      role="group"
      aria-label="Quantity"
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={wrapClick(() => onChange(Math.max(min, value - 1)))}
        className={`border border-outline-variant/30 ${pad} hover:border-primary disabled:cursor-not-allowed disabled:opacity-40`}
      >
        −
      </button>
      <span className={`${width} text-center font-label-md tabular-nums`}>
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={wrapClick(() => onChange(Math.min(max, value + 1)))}
        className={`border border-outline-variant/30 ${pad} hover:border-primary disabled:cursor-not-allowed disabled:opacity-40`}
      >
        +
      </button>
    </div>
  );
}
