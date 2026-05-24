import { useEffect, useState } from "react";
import { resolveImageUrl } from "@/lib/productImageUrls";
import { normalizeImageRef } from "@/lib/productImageRefs";

interface VariantPhotoPickerProps {
  galleryImages: string[];
  value?: string;
  onChange: (imageRef: string | undefined) => void;
  disabled?: boolean;
}

export function VariantPhotoPicker({
  galleryImages,
  value,
  onChange,
  disabled = false,
}: VariantPhotoPickerProps) {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadPreviews() {
      const entries = await Promise.all(
        galleryImages.map(async (path) => {
          const url = await resolveImageUrl(path);
          return [path, url ?? path] as const;
        }),
      );
      if (!cancelled) {
        setPreviews(Object.fromEntries(entries));
      }
    }

    void loadPreviews();
    return () => {
      cancelled = true;
    };
  }, [galleryImages]);

  if (galleryImages.length === 0) {
    return (
      <p className="text-body-sm text-on-surface-variant">
        Upload photos above to link one to this option.
      </p>
    );
  }

  const selected = value ? normalizeImageRef(value) : undefined;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(undefined)}
        className={`h-10 min-w-[2.5rem] border px-2 font-label-sm uppercase transition-colors ${
          !selected
            ? "border-primary bg-primary/15 text-primary"
            : "border-outline-variant/30 text-on-surface-variant hover:border-primary/50"
        } disabled:opacity-50`}
      >
        None
      </button>
      {galleryImages.map((path, index) => {
        const normalized = normalizeImageRef(path);
        const isSelected = selected === normalized;
        const preview = previews[path] ?? path;

        return (
          <button
            key={path}
            type="button"
            disabled={disabled}
            title={`Photo ${index + 1}${index === 0 ? " (cover)" : ""}`}
            onClick={() => onChange(normalized)}
            className={`relative h-10 w-10 overflow-hidden border bg-black transition-colors ${
              isSelected
                ? "border-primary ring-1 ring-primary"
                : "border-outline-variant/30 opacity-80 hover:opacity-100"
            } disabled:opacity-50`}
          >
            <img
              src={preview}
              alt=""
              className="h-full w-full object-contain"
            />
            <span className="absolute bottom-0 right-0 bg-black/70 px-0.5 text-[9px] text-on-surface">
              {index + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}
