import type {
  PrintServiceResinColor,
  PrintServiceResinType,
} from "@/lib/printService";
import { normalizeHexColor } from "@/lib/printService";

type Props = {
  colors: PrintServiceResinColor[];
  resinTypes: PrintServiceResinType[];
  onChange: (colors: PrintServiceResinColor[]) => void;
};

function pickerValue(hexColor: string | undefined): string {
  return normalizeHexColor(hexColor) ?? "#808080";
}

export function AdminResinColorsEditor({
  colors,
  resinTypes,
  onChange,
}: Props) {
  function updateColor(index: number, patch: Partial<PrintServiceResinColor>) {
    onChange(
      colors.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function toggleResinType(index: number, typeId: string, checked: boolean) {
    const row = colors[index];
    if (!row) return;
    const current = row.resinTypeIds ?? [];
    const resinTypeIds = checked
      ? [...new Set([...current, typeId])]
      : current.filter((id) => id !== typeId);
    updateColor(index, { resinTypeIds });
  }

  function addColor() {
    onChange([
      ...colors,
      {
        id: `color-${colors.length + 1}`,
        label: "New color",
        hexColor: "#808080",
        resinTypeIds: resinTypes.map((type) => type.id),
        sortOrder: colors.length,
      },
    ]);
  }

  function removeColor(index: number) {
    onChange(colors.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {colors.map((color, index) => (
        <div
          key={`${color.id}-${index}`}
          className="space-y-3 border border-outline-variant/20 bg-surface p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                ID
              </span>
              <input
                value={color.id}
                onChange={(e) => updateColor(index, { id: e.target.value })}
                className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Label
              </span>
              <input
                value={color.label}
                onChange={(e) => updateColor(index, { label: e.target.value })}
                className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Swatch color
              </span>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  value={pickerValue(color.hexColor)}
                  onChange={(e) =>
                    updateColor(index, { hexColor: e.target.value.toUpperCase() })
                  }
                  className="h-10 w-14 cursor-pointer border border-outline-variant/30 bg-surface p-1"
                  aria-label={`Color swatch for ${color.label}`}
                />
                <input
                  value={color.hexColor ?? ""}
                  onChange={(e) =>
                    updateColor(index, {
                      hexColor: normalizeHexColor(e.target.value),
                    })
                  }
                  placeholder="#RRGGBB"
                  className="w-28 border border-outline-variant/30 bg-surface-container-low px-3 py-2 font-mono text-sm"
                />
              </div>
            </label>
            <button
              type="button"
              onClick={() => removeColor(index)}
              className="text-label-sm uppercase text-error hover:underline"
            >
              Remove
            </button>
          </div>

          {resinTypes.length > 0 && (
            <fieldset>
              <legend className="font-label-sm uppercase text-on-surface-variant">
                Available for resin types
              </legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {resinTypes.map((type) => (
                  <label key={type.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={color.resinTypeIds?.includes(type.id) ?? false}
                      onChange={(e) =>
                        toggleResinType(index, type.id, e.target.checked)
                      }
                    />
                    <span className="text-body-sm text-on-surface">{type.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addColor}
        className="border border-outline-variant/30 px-4 py-2 font-label-sm uppercase tracking-widest text-on-surface hover:bg-surface-container-high"
      >
        Add resin color
      </button>

      <details className="text-body-sm text-on-surface-variant">
        <summary className="cursor-pointer font-label-sm uppercase">
          Raw JSON
        </summary>
        <pre className="mt-2 overflow-x-auto border border-outline-variant/20 bg-surface-container-lowest p-3 font-mono text-xs">
          {JSON.stringify(colors, null, 2)}
        </pre>
      </details>
    </div>
  );
}
