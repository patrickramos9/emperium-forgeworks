import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { ProductImage } from "@/components/ProductImage";
import { QuantityStepper } from "@/components/QuantityStepper";
import { formatPrice } from "@/data/seedProducts";
import {
  groupDisplayName,
  type ProductOptionGroup,
} from "@/lib/productVariants";

interface VariantPickerProps {
  groups: ProductOptionGroup[];
  basePriceCents: number;
  selection: Record<string, string[]>;
  quantities: Record<string, number>;
  onToggle: (groupId: string, optionId: string) => void;
  onQuantityChange: (optionId: string, quantity: number) => void;
  /** Resolve a variant option's gallery ref to a display URL. */
  imageUrlForRef?: (imageRef: string) => string | undefined;
  /** Reset open panels when the product changes. */
  resetKey?: string;
}

function selectionSummary(
  group: ProductOptionGroup,
  selectedIds: string[],
): string {
  if (selectedIds.length === 0) return "Select options";
  const labels = group.options
    .filter((option) => selectedIds.includes(option.id))
    .map((option) => option.label);
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.length} selected`;
}

export function VariantPicker({
  groups,
  basePriceCents,
  selection,
  quantities,
  onToggle,
  onQuantityChange,
  imageUrlForRef,
  resetKey,
}: VariantPickerProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpanded({});
  }, [resetKey]);

  function expandGroup(groupId: string) {
    setExpanded((current) => ({ ...current, [groupId]: true }));
  }

  function collapseGroup(groupId: string) {
    setExpanded((current) => ({ ...current, [groupId]: false }));
  }

  return (
    <div className="space-y-stack-sm">
      {groups.map((group) => {
        const isOpen = expanded[group.id] ?? false;
        const selectedIds = selection[group.id] ?? [];
        const summary = selectionSummary(group, selectedIds);

        return (
          <div
            key={group.id}
            className="border border-outline-variant/30 bg-surface-container"
          >
            <div className="flex items-stretch">
              <button
                type="button"
                onClick={() => {
                  if (!isOpen) expandGroup(group.id);
                }}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-high disabled:cursor-default"
                disabled={isOpen}
                aria-expanded={isOpen}
              >
                <span className="font-label-md text-[12px] uppercase text-on-surface-variant">
                  {groupDisplayName(group)}
                </span>
                <span
                  className={`truncate font-label-md ${
                    selectedIds.length > 0
                      ? "text-on-surface"
                      : "text-on-surface-variant"
                  }`}
                >
                  {summary}
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  isOpen ? collapseGroup(group.id) : expandGroup(group.id)
                }
                className="flex w-12 shrink-0 items-center justify-center border-l border-outline-variant/30 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                aria-label={
                  isOpen
                    ? `Done selecting ${groupDisplayName(group)}`
                    : `Choose ${groupDisplayName(group)}`
                }
              >
                <Icon
                  name={isOpen ? "check" : "expand_more"}
                  className={`text-xl transition-transform ${isOpen ? "text-primary" : ""}`}
                />
              </button>
            </div>

            {isOpen && (
              <ul
                className="max-h-64 overflow-y-auto overscroll-contain border-t border-outline-variant/20 bg-surface-container-lowest sm:max-h-72"
                aria-label={groupDisplayName(group)}
              >
                {group.options.map((option) => {
                  const selected = selectedIds.includes(option.id);
                  const optionImageUrl = option.imageRef
                    ? imageUrlForRef?.(option.imageRef)
                    : undefined;

                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onToggle(group.id, option.id)}
                        className={`flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-surface-container-high ${
                          selected ? "bg-primary/10" : ""
                        }`}
                      >
                        <Icon
                          name={selected ? "check_box" : "check_box_outline_blank"}
                          className={`text-xl ${selected ? "text-primary" : "text-on-surface-variant"}`}
                          filled={selected}
                        />
                        {optionImageUrl && (
                          <ProductImage
                            src={optionImageUrl}
                            alt=""
                            className="h-12 w-12 shrink-0 iron-bevel"
                            imageClassName="object-contain"
                          />
                        )}
                        <span
                          className={`min-w-0 flex-1 font-label-md ${
                            selected ? "text-primary" : "text-on-surface"
                          }`}
                        >
                          {option.label}
                        </span>
                        <span className="shrink-0 font-label-sm text-on-surface-variant">
                          {formatPrice(basePriceCents + option.priceDeltaCents)}
                        </span>
                        {selected && (
                          <QuantityStepper
                            size="sm"
                            stopPropagation
                            value={quantities[option.id] ?? 1}
                            onChange={(qty) => onQuantityChange(option.id, qty)}
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
