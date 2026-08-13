import { useEffect, useId, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import {
  MESSAGE_IMAGE_MAX_BYTES,
  MESSAGE_IMAGE_MAX_COUNT,
  assertMessageImageFile,
} from "@/lib/messageAttachmentUpload";

export function MessageImagePicker({
  files,
  onChange,
  disabled = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [localError, setLocalError] = useState<string | null>(null);
  const previews = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => {
    return () => {
      for (const url of previews) URL.revokeObjectURL(url);
    };
  }, [previews]);

  function handlePick(list: FileList | null) {
    setLocalError(null);
    if (!list?.length) return;
    try {
      const next = [...files];
      for (const file of Array.from(list)) {
        assertMessageImageFile(file);
        if (next.length >= MESSAGE_IMAGE_MAX_COUNT) {
          throw new Error(`Attach up to ${MESSAGE_IMAGE_MAX_COUNT} images.`);
        }
        next.push(file);
      }
      onChange(next);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not add image.");
    }
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={inputId}
          className={`inline-flex cursor-pointer items-center gap-2 border border-outline-variant/30 bg-surface-container px-3 py-2 font-label-sm uppercase text-on-surface hover:border-primary ${
            disabled || files.length >= MESSAGE_IMAGE_MAX_COUNT
              ? "pointer-events-none opacity-50"
              : ""
          }`}
        >
          <Icon name="add_photo_alternate" className="text-xl" />
          Add photos
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={disabled || files.length >= MESSAGE_IMAGE_MAX_COUNT}
          className="sr-only"
          onChange={(e) => {
            handlePick(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="text-label-sm text-on-surface-variant">
          Up to {MESSAGE_IMAGE_MAX_COUNT} · JPEG/PNG/WebP/GIF ·{" "}
          {Math.round(MESSAGE_IMAGE_MAX_BYTES / (1024 * 1024))} MB each
        </span>
      </div>

      {localError && <p className="mt-2 text-error">{localError}</p>}

      {files.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="relative w-24"
            >
              <img
                src={previews[index]}
                alt={file.name}
                className="h-24 w-24 border border-outline-variant/30 object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(index)}
                disabled={disabled}
                className="absolute -right-2 -top-2 bg-surface-container-high px-1.5 py-0.5 font-label-sm text-on-surface hover:text-error"
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
