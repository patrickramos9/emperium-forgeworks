import { formatPrice } from "@/data/seedProducts";
import {
  defaultInternationalRate,
  formatShippingProfileRate,
  parseWeightTiers,
  SHIPPING_PROFILE_KIND_LABELS,
  type InternationalShippingRate,
  type ShippingProfileKind,
  type WeightTier,
} from "@/lib/shippingProfiles";

function dollarsToCents(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

type Props = {
  rates: InternationalShippingRate[];
  onChange: (rates: InternationalShippingRate[]) => void;
};

export function AdminInternationalRatesEditor({ rates, onChange }: Props) {
  function updateRate(index: number, patch: Partial<InternationalShippingRate>) {
    const next = [...rates];
    next[index] = { ...next[index]!, ...patch };
    onChange(next);
  }

  function updateWeightTier(
    rateIndex: number,
    tierIndex: number,
    patch: Partial<WeightTier>,
  ) {
    const rate = rates[rateIndex];
    if (!rate) return;
    const tiers = [...(rate.weightTiers ?? [])];
    tiers[tierIndex] = { ...tiers[tierIndex]!, ...patch };
    updateRate(rateIndex, { weightTiers: tiers });
  }

  return (
    <div className="space-y-4 border border-outline-variant/20 bg-surface-container p-4">
      <div>
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          International rates
        </h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Required. Each rate becomes a separate option on Stripe Checkout for
          non-US addresses.
        </p>
      </div>

      {rates.map((rate, index) => (
        <div
          key={index}
          className="space-y-3 border border-outline-variant/20 bg-surface-container-low p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-label-sm uppercase text-primary">
              International rate {index + 1}
            </span>
            {rates.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(rates.filter((_, i) => i !== index))}
                className="text-label-sm text-error"
              >
                Remove
              </button>
            )}
          </div>

          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Rate type
            </span>
            <select
              value={rate.kind}
              onChange={(e) =>
                updateRate(index, {
                  kind: e.target.value as ShippingProfileKind,
                })
              }
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
            >
              {Object.entries(SHIPPING_PROFILE_KIND_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>

          {rate.kind !== "free_shipping" && rate.kind !== "weight_tier" && (
            <>
              <label className="block">
                <span className="font-label-sm uppercase text-on-surface-variant">
                  First item (USD)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={centsToDollars(rate.amountCents)}
                  onChange={(e) =>
                    updateRate(index, {
                      amountCents: dollarsToCents(e.target.value),
                    })
                  }
                  className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="font-label-sm uppercase text-on-surface-variant">
                  Additional item (USD)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={centsToDollars(rate.additionalItemCents)}
                  onChange={(e) =>
                    updateRate(index, {
                      additionalItemCents: dollarsToCents(e.target.value),
                    })
                  }
                  className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
                />
              </label>
            </>
          )}

          {rate.kind === "free_shipping" && (
            <p className="text-body-sm text-on-surface-variant">
              Free shipping for the selected international countries.
            </p>
          )}

          {rate.kind === "free_over_threshold" && (
            <label className="block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Free when subtotal is at least (USD)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={centsToDollars(rate.freeThresholdCents ?? 0)}
                onChange={(e) =>
                  updateRate(index, {
                    freeThresholdCents: dollarsToCents(e.target.value),
                  })
                }
                className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
              />
            </label>
          )}

          {rate.kind === "weight_tier" && (
            <div className="space-y-2">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Weight tiers (oz → USD)
              </span>
              {(rate.weightTiers ?? []).map((tier, tierIndex) => (
                <div key={tierIndex} className="flex flex-wrap items-end gap-2">
                  <label className="text-label-sm text-on-surface-variant">
                    Up to (oz)
                    <input
                      type="number"
                      min="1"
                      value={tier.maxWeightOz}
                      onChange={(e) =>
                        updateWeightTier(index, tierIndex, {
                          maxWeightOz: Number.parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="mt-1 block w-28 border border-outline-variant/30 bg-surface-container px-2 py-1"
                    />
                  </label>
                  <label className="text-label-sm text-on-surface-variant">
                    Rate ($)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={centsToDollars(tier.amountCents)}
                      onChange={(e) =>
                        updateWeightTier(index, tierIndex, {
                          amountCents: dollarsToCents(e.target.value),
                        })
                      }
                      className="mt-1 block w-28 border border-outline-variant/30 bg-surface-container px-2 py-1"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateRate(index, {
                        weightTiers: (rate.weightTiers ?? []).filter(
                          (_, i) => i !== tierIndex,
                        ),
                      })
                    }
                    className="px-2 py-1 text-label-sm text-error"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateRate(index, {
                    weightTiers: [
                      ...(rate.weightTiers ?? []),
                      {
                        maxWeightOz:
                          (rate.weightTiers?.[rate.weightTiers.length - 1]
                            ?.maxWeightOz ?? 0) + 16,
                        amountCents: 0,
                      },
                    ],
                  })
                }
                className="font-label-sm uppercase text-primary"
              >
                + Add tier
              </button>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="font-label-sm uppercase text-on-surface-variant">
              Countries
            </legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`intl-countries-${index}`}
                checked={rate.countriesMode === "all"}
                onChange={() =>
                  updateRate(index, { countriesMode: "all", countries: [] })
                }
              />
              <span className="text-body-sm">All international countries</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`intl-countries-${index}`}
                checked={rate.countriesMode === "list"}
                onChange={() =>
                  updateRate(index, { countriesMode: "list" })
                }
              />
              <span className="text-body-sm">Specific countries</span>
            </label>
            {rate.countriesMode === "list" && (
              <input
                value={(rate.countries ?? []).join(", ")}
                onChange={(e) =>
                  updateRate(index, {
                    countries: e.target.value
                      .split(/[,;\s]+/)
                      .map((code) => code.trim().toUpperCase())
                      .filter((code) => /^[A-Z]{2}$/.test(code)),
                  })
                }
                placeholder="CA, GB, AU"
                className="w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
              />
            )}
          </fieldset>

          <p className="text-label-sm text-on-surface-variant">
            Preview:{" "}
            {formatShippingProfileRate(
              rate.kind,
              rate.amountCents,
              rate.additionalItemCents,
              rate.freeThresholdCents,
              formatPrice,
              rate.weightTiers,
            )}
          </p>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...rates, defaultInternationalRate()])}
        className="font-label-sm uppercase text-primary"
      >
        + Add international rate
      </button>
    </div>
  );
}
