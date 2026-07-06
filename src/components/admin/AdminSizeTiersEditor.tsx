import { useState } from "react";
import { formatPrice } from "@/data/seedProducts";
import type { PrintServiceSizeTier } from "@/lib/printService";
import {
  formatCentsForInput,
  parseDollarInputToCents,
} from "@/lib/priceUtils";

type Props = {
  tiers: PrintServiceSizeTier[];
  onChange: (tiers: PrintServiceSizeTier[]) => void;
};

export function AdminSizeTiersEditor({ tiers, onChange }: Props) {
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});

  function priceInputValue(tier: PrintServiceSizeTier): string {
    return priceInputs[tier.id] ?? formatCentsForInput(tier.priceCents);
  }

  function updateTier(index: number, patch: Partial<PrintServiceSizeTier>) {
    onChange(
      tiers.map((row, i) =>
        i === index ? { ...row, ...patch, sortOrder: i } : { ...row, sortOrder: i },
      ),
    );
  }

  function updatePrice(index: number, tier: PrintServiceSizeTier, raw: string) {
    setPriceInputs((prev) => ({ ...prev, [tier.id]: raw }));
    try {
      const priceCents = parseDollarInputToCents(raw);
      updateTier(index, { priceCents });
    } catch {
      /* keep typing */
    }
  }

  function addTier() {
    const nextIndex = tiers.length;
    const id = `size-${nextIndex + 1}`;
    onChange([
      ...tiers.map((row, i) => ({ ...row, sortOrder: i })),
      {
        id,
        label: "New size",
        priceCents: 2500,
        sortOrder: nextIndex,
      },
    ]);
    setPriceInputs((prev) => ({ ...prev, [id]: formatCentsForInput(2500) }));
  }

  function removeTier(index: number) {
    const removed = tiers[index];
    onChange(
      tiers
        .filter((_, i) => i !== index)
        .map((row, i) => ({ ...row, sortOrder: i })),
    );
    if (removed) {
      setPriceInputs((prev) => {
        const next = { ...prev };
        delete next[removed.id];
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      {tiers.map((tier, index) => (
        <div
          key={`${tier.id}-${index}`}
          className="space-y-3 border border-outline-variant/20 bg-surface p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                ID
              </span>
              <input
                value={tier.id}
                onChange={(e) => updateTier(index, { id: e.target.value })}
                className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Label
              </span>
              <input
                value={tier.label}
                onChange={(e) => updateTier(index, { label: e.target.value })}
                className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
                placeholder="e.g. 75mm"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Price (USD)
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-on-surface-variant">$</span>
                <input
                  value={priceInputValue(tier)}
                  onChange={(e) => updatePrice(index, tier, e.target.value)}
                  onBlur={() => {
                    setPriceInputs((prev) => {
                      const next = { ...prev };
                      delete next[tier.id];
                      return next;
                    });
                  }}
                  inputMode="decimal"
                  className="w-28 border border-outline-variant/30 bg-surface-container-low px-3 py-2"
                />
                <span className="text-label-sm text-on-surface-variant">
                  ({formatPrice(tier.priceCents)})
                </span>
              </div>
            </label>
            <button
              type="button"
              onClick={() => removeTier(index)}
              disabled={tiers.length <= 1}
              className="text-label-sm uppercase text-error hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addTier}
        className="border border-outline-variant/30 px-4 py-2 font-label-sm uppercase tracking-widest text-on-surface hover:bg-surface-container-high"
      >
        Add size tier
      </button>

      <details className="text-body-sm text-on-surface-variant">
        <summary className="cursor-pointer font-label-sm uppercase">
          Raw JSON
        </summary>
        <pre className="mt-2 overflow-x-auto border border-outline-variant/20 bg-surface-container-lowest p-3 font-mono text-xs">
          {JSON.stringify(tiers, null, 2)}
        </pre>
      </details>
    </div>
  );
}
