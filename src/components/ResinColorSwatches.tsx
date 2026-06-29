import type { PrintServiceResinColor } from "@/lib/printService";

type Props = {
  colors: PrintServiceResinColor[];
  value: string;
  onChange: (colorId: string) => void;
  name?: string;
};

export function ResinColorSwatches({ colors, value, onChange, name }: Props) {
  return (
    <div
      className="mt-2 flex flex-wrap gap-4"
      role="radiogroup"
      aria-label={name ?? "Resin color"}
    >
      {colors.map((color) => {
        const selected = color.id === value;
        const swatchColor = color.hexColor ?? "#808080";
        return (
          <label
            key={color.id}
            className={`flex cursor-pointer flex-col items-center gap-2 ${
              selected ? "text-on-surface" : "text-on-surface-variant"
            }`}
          >
            <input
              type="radio"
              name={name ?? "resinColor"}
              value={color.id}
              checked={selected}
              onChange={() => onChange(color.id)}
              className="sr-only"
            />
            <span
              className={`block h-11 w-11 rounded-full border-2 shadow-inner transition-transform ${
                selected
                  ? "scale-110 border-primary ring-2 ring-primary/40"
                  : "border-outline-variant/40 hover:scale-105"
              }`}
              style={{ backgroundColor: swatchColor }}
              title={color.label}
            />
            <span className="max-w-[5rem] text-center font-label-sm leading-tight">
              {color.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
