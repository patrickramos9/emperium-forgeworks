import { useState } from "react";
import { formatPrice } from "@/data/seedProducts";
import type { PrintServiceResinType } from "@/lib/printService";
import {
  formatAdjustmentForInput,
  parsePriceAdjustmentToCents,
} from "@/lib/priceUtils";

type Props = {
  types: PrintServiceResinType[];
  onChange: (types: PrintServiceResinType[]) => void;
};

export function AdminResinTypesEditor({ types, onChange }: Props) {
  const [deltaInputs, setDeltaInputs] = useState<Record<string, string>>({});

  function deltaInputValue(type: PrintServiceResinType): string {
    const cents = type.priceDeltaCents ?? 0;
    return deltaInputs[type.id] ?? formatAdjustmentForInput(cents);
  }

  function updateType(index: number, patch: Partial<PrintServiceResinType>) {
    onChange(
      types.map((row, i) =>
        i === index ? { ...row, ...patch, sortOrder: i } : { ...row, sortOrder: i },
      ),
    );
  }

  function updateDelta(index: number, type: PrintServiceResinType, raw: string) {
    setDeltaInputs((prev) => ({ ...prev, [type.id]: raw }));
    try {
      const priceDeltaCents = parsePriceAdjustmentToCents(raw);
      updateType(index, { priceDeltaCents });
    } catch {
      /* keep typing */
    }
  }

  function addType() {
    const nextIndex = types.length;
    const id = `resin-${nextIndex + 1}`;
    onChange([
      ...types.map((row, i) => ({ ...row, sortOrder: i })),
      {
        id,
        label: "New resin",
        priceDeltaCents: 0,
        sortOrder: nextIndex,
      },
    ]);
    setDeltaInputs((prev) => ({ ...prev, [id]: formatAdjustmentForInput(0) }));
  }

  function removeType(index: number) {
    const removed = types[index];
    onChange(
      types
        .filter((_, i) => i !== index)
        .map((row, i) => ({ ...row, sortOrder: i })),
    );
    if (removed) {
      setDeltaInputs((prev) => {
        const next = { ...prev };
        delete next[removed.id];
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      {types.map((type, index) => {
        const deltaCents = type.priceDeltaCents ?? 0;
        return (
          <div
            key={`${type.id}-${index}`}
            className="space-y-3 border border-outline-variant/20 bg-surface p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-label-sm uppercase text-on-surface-variant">
                  ID
                </span>
                <input
                  value={type.id}
                  onChange={(e) => updateType(index, { id: e.target.value })}
                  className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 font-mono text-sm"
                />
              </label>
              <label className="block">
                <span className="font-label-sm uppercase text-on-surface-variant">
                  Label
                </span>
                <input
                  value={type.label}
                  onChange={(e) => updateType(index, { label: e.target.value })}
                  className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
                  placeholder="e.g. Tough"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="font-label-sm uppercase text-on-surface-variant">
                  Price adjustment (USD)
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-on-surface-variant">+$</span>
                  <input
                    value={deltaInputValue(type)}
                    onChange={(e) => updateDelta(index, type, e.target.value)}
                    onBlur={() => {
                      setDeltaInputs((prev) => {
                        const next = { ...prev };
                        delete next[type.id];
                        return next;
                      });
                    }}
                    inputMode="decimal"
                    className="w-28 border border-outline-variant/30 bg-surface-container-low px-3 py-2"
                  />
                  <span className="text-label-sm text-on-surface-variant">
                    {deltaCents > 0
                      ? `(+${formatPrice(deltaCents)} on top of size price)`
                      : "(no extra charge)"}
                  </span>
                </div>
              </label>
              <button
                type="button"
                onClick={() => removeType(index)}
                disabled={types.length <= 1}
                className="text-label-sm uppercase text-error hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addType}
        className="border border-outline-variant/30 px-4 py-2 font-label-sm uppercase tracking-widest text-on-surface hover:bg-surface-container-high"
      >
        Add resin type
      </button>

      <details className="text-body-sm text-on-surface-variant">
        <summary className="cursor-pointer font-label-sm uppercase">
          Raw JSON
        </summary>
        <pre className="mt-2 overflow-x-auto border border-outline-variant/20 bg-surface-container-lowest p-3 font-mono text-xs">
          {JSON.stringify(types, null, 2)}
        </pre>
      </details>
    </div>
  );
}
