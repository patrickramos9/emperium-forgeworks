import { useState } from "react";
import { Icon } from "@/components/Icon";
import { VariantPhotoPicker } from "@/components/admin/VariantPhotoPicker";
import {
  createVariantGroup,
  createVariantOption,
  groupDisplayName,
  moveVariantOptionsInGroup,
  VARIANT_OPTION_DRAG_TYPE,
  type ProductOptionGroup,
  type ProductVariantOption,
  type VariationKind,
} from "@/lib/productVariants";
import {
  formatAdjustmentForInput,
  parsePriceAdjustmentToCents,
} from "@/lib/priceUtils";

interface AdminProductVariantsEditorProps {
  groups: ProductOptionGroup[];
  galleryImages: string[];
  onChange: (groups: ProductOptionGroup[]) => void;
  disabled?: boolean;
}

const KIND_OPTIONS: { kind: VariationKind; label: string; hint: string }[] = [
  { kind: "size", label: "Size", hint: "Defaults to 32mm, 40mm, 75mm, and 150mm" },
  { kind: "type", label: "Type", hint: "Material, finish, or style" },
  { kind: "custom", label: "Custom", hint: "Name your own variation" },
];

function updateGroup(
  groups: ProductOptionGroup[],
  groupId: string,
  patch: Partial<ProductOptionGroup>,
): ProductOptionGroup[] {
  return groups.map((group) =>
    group.id === groupId ? { ...group, ...patch } : group,
  );
}

function updateOption(
  groups: ProductOptionGroup[],
  groupId: string,
  optionId: string,
  patch: Partial<ProductVariantOption>,
): ProductOptionGroup[] {
  return groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          options: group.options.map((option) =>
            option.id === optionId ? { ...option, ...patch } : option,
          ),
        }
      : group,
  );
}

type VariantDragState = { groupId: string; index: number };

function parseVariantDragPayload(raw: string): VariantDragState | null {
  const colon = raw.indexOf(":");
  if (colon <= 0) return null;
  const groupId = raw.slice(0, colon);
  const index = Number.parseInt(raw.slice(colon + 1), 10);
  if (!groupId || Number.isNaN(index)) return null;
  return { groupId, index };
}

export function AdminProductVariantsEditor({
  groups,
  galleryImages,
  onChange,
  disabled = false,
}: AdminProductVariantsEditorProps) {
  const [dragState, setDragState] = useState<VariantDragState | null>(null);
  const [dropState, setDropState] = useState<VariantDragState | null>(null);

  function clearDragState() {
    setDragState(null);
    setDropState(null);
  }

  function handleOptionDragOver(
    e: React.DragEvent,
    groupId: string,
    index: number,
  ) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropState({ groupId, index });
  }

  function handleOptionDrop(
    e: React.DragEvent,
    groupId: string,
    toIndex: number,
  ) {
    e.preventDefault();
    setDropState(null);

    const payload = parseVariantDragPayload(
      e.dataTransfer.getData(VARIANT_OPTION_DRAG_TYPE),
    );
    if (!payload || payload.groupId !== groupId) {
      clearDragState();
      return;
    }

    onChange(
      moveVariantOptionsInGroup(
        groups,
        groupId,
        payload.index,
        toIndex,
      ),
    );
    clearDragState();
  }

  function addGroup(kind: VariationKind) {
    onChange([...groups, createVariantGroup(kind)]);
  }

  function removeGroup(groupId: string) {
    onChange(groups.filter((group) => group.id !== groupId));
  }

  function addOption(groupId: string) {
    onChange(
      updateGroup(groups, groupId, {
        options: [
          ...(groups.find((group) => group.id === groupId)?.options ?? []),
          createVariantOption(""),
        ],
      }),
    );
  }

  function removeOption(groupId: string, optionId: string) {
    onChange(
      updateGroup(groups, groupId, {
        options: (groups.find((group) => group.id === groupId)?.options ?? []).filter(
          (option) => option.id !== optionId,
        ),
      }),
    );
  }

  return (
    <div className="space-y-4 border border-outline-variant/20 bg-surface-container-lowest p-4 iron-bevel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-label-sm uppercase text-on-surface-variant">
            Variations
          </p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Offer size, type, or custom options — drag to reorder within each
            variation. Link a gallery photo so shoppers see the matching image.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {KIND_OPTIONS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              disabled={disabled}
              onClick={() => addGroup(kind)}
              className="border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 font-label-sm uppercase text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              + {label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">
          No variations yet. Add Size, Type, or Custom to create options like
          Etsy listings.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="border border-outline-variant/20 bg-surface-container-low p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-primary/15 px-2 py-0.5 font-label-sm uppercase text-primary">
                    {group.kind}
                  </span>
                  {group.kind === "custom" ? (
                    <input
                      value={group.name}
                      disabled={disabled}
                      onChange={(e) =>
                        onChange(
                          updateGroup(groups, group.id, { name: e.target.value }),
                        )
                      }
                      placeholder="Variation name (e.g. Finish)"
                      className="border border-outline-variant/30 bg-surface-container-high px-2 py-1 text-body-sm"
                    />
                  ) : (
                    <span className="font-label-md uppercase text-on-surface">
                      {groupDisplayName(group)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeGroup(group.id)}
                  className="font-label-sm uppercase text-error hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>

              <p className="mb-3 text-body-sm text-on-surface-variant">
                {KIND_OPTIONS.find((item) => item.kind === group.kind)?.hint}
              </p>

              {group.options.length === 0 ? (
                <p className="mb-3 text-body-sm text-on-surface-variant">
                  No options yet.
                </p>
              ) : (
                <div className="mb-3 space-y-3">
                  {group.options.map((option, optionIndex) => {
                    const isDragging =
                      dragState?.groupId === group.id &&
                      dragState.index === optionIndex;
                    const isDropTarget =
                      dropState?.groupId === group.id &&
                      dropState.index === optionIndex &&
                      !isDragging;

                    return (
                    <div
                      key={option.id}
                      onDragOver={(e) =>
                        handleOptionDragOver(e, group.id, optionIndex)
                      }
                      onDragLeave={() => setDropState(null)}
                      onDrop={(e) => handleOptionDrop(e, group.id, optionIndex)}
                      className={`space-y-2 border p-3 transition-colors ${
                        isDragging ? "opacity-50" : ""
                      } ${
                        isDropTarget
                          ? "border-primary ring-1 ring-primary"
                          : "border-outline-variant/10"
                      }`}
                    >
                      <div className="grid gap-2 sm:grid-cols-[auto_1fr_120px_40px]">
                        <span
                          role="button"
                          tabIndex={disabled ? -1 : 0}
                          draggable={!disabled}
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              VARIANT_OPTION_DRAG_TYPE,
                              `${group.id}:${optionIndex}`,
                            );
                            e.dataTransfer.effectAllowed = "move";
                            setDragState({
                              groupId: group.id,
                              index: optionIndex,
                            });
                          }}
                          onDragEnd={clearDragState}
                          className={`flex h-10 w-8 items-center justify-center text-on-surface-variant transition-colors ${
                            disabled
                              ? "cursor-not-allowed opacity-50"
                              : "cursor-grab hover:text-primary active:cursor-grabbing"
                          }`}
                          aria-label="Drag to reorder"
                          title="Drag to reorder"
                        >
                          <Icon name="drag_indicator" className="text-xl" />
                        </span>
                        <input
                          value={option.label}
                          disabled={disabled}
                          onChange={(e) =>
                            onChange(
                              updateOption(groups, group.id, option.id, {
                                label: e.target.value,
                              }),
                            )
                          }
                          placeholder={
                            group.kind === "size" ? "32mm" : "Option name"
                          }
                          className="border border-outline-variant/30 bg-surface-container-high px-3 py-2 text-body-sm"
                        />
                        <input
                          defaultValue={formatAdjustmentForInput(option.priceDeltaCents)}
                          key={`${option.id}-${option.priceDeltaCents}`}
                          disabled={disabled}
                          onBlur={(e) => {
                            try {
                              const priceDeltaCents = parsePriceAdjustmentToCents(
                                e.target.value,
                              );
                              onChange(
                                updateOption(groups, group.id, option.id, {
                                  priceDeltaCents,
                                }),
                              );
                            } catch {
                              e.target.value = formatAdjustmentForInput(
                                option.priceDeltaCents,
                              );
                            }
                          }}
                          placeholder="0.00"
                          className="border border-outline-variant/30 bg-surface-container-high px-3 py-2 text-body-sm"
                        />
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => removeOption(group.id, option.id)}
                          className="flex h-10 w-10 items-center justify-center text-error hover:bg-error/10 disabled:opacity-50"
                          aria-label="Remove option"
                        >
                          <Icon name="close" className="text-base" />
                        </button>
                      </div>
                      <div>
                        <p className="mb-1 font-label-sm uppercase text-on-surface-variant">
                          Linked photo
                        </p>
                        <VariantPhotoPicker
                          galleryImages={galleryImages}
                          value={option.imageRef}
                          disabled={disabled}
                          onChange={(imageRef) =>
                            onChange(
                              updateOption(groups, group.id, option.id, {
                                imageRef,
                              }),
                            )
                          }
                        />
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                disabled={disabled}
                onClick={() => addOption(group.id)}
                className="font-label-sm uppercase text-primary hover:underline disabled:opacity-50"
              >
                + Add option
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
