import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import {
  GALLERY_DRAG_TYPE,
  MAX_GALLERY_IMAGES,
  insertGalleryImages,
  moveGalleryImage,
  removeGalleryImage,
} from "@/lib/productGallery";
import { uploadProductImages } from "@/lib/productImageUpload";
import { resolveImageUrl } from "@/lib/productImageUrls";
import { validateProductSlug } from "@/lib/productSlug";

interface AdminProductGalleryEditorProps {
  images: string[];
  onChange: (images: string[]) => void;
  productSlug: string;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
  onError?: (message: string) => void;
}

function imageFilesFromDataTransfer(data: DataTransfer): File[] {
  return [...data.files].filter((file) => file.type.startsWith("image/"));
}

export function AdminProductGalleryEditor({
  images,
  onChange,
  productSlug,
  disabled = false,
  onUploadingChange,
  onError,
}: AdminProductGalleryEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [zoneActive, setZoneActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const slugError = validateProductSlug(productSlug);
  const canUpload = !slugError && !disabled && !uploading;

  useEffect(() => {
    let cancelled = false;

    async function loadPreviews() {
      const entries = await Promise.all(
        images.map(async (path) => {
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
  }, [images]);

  const setUploadState = useCallback(
    (value: boolean) => {
      setUploading(value);
      onUploadingChange?.(value);
    },
    [onUploadingChange],
  );

  const uploadAtIndex = useCallback(
    async (files: File[], index: number) => {
      const validationError = validateProductSlug(productSlug);
      if (validationError) {
        setUploadError(validationError);
        onError?.(validationError);
        return;
      }
      if (files.length === 0) return;

      const remaining = MAX_GALLERY_IMAGES - images.length;
      if (remaining <= 0) {
        const message = `Maximum ${MAX_GALLERY_IMAGES} photos per product.`;
        setUploadError(message);
        onError?.(message);
        return;
      }

      const batch = files.slice(0, remaining);
      setUploadError(null);
      setUploadState(true);
      try {
        const paths = await uploadProductImages(productSlug, batch);
        onChange(insertGalleryImages(images, paths, index));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setUploadError(message);
        onError?.(message);
      } finally {
        setUploadState(false);
      }
    },
    [images, onChange, onError, productSlug, setUploadState],
  );

  function handleSlotDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleSlotDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIndex(index);
  }

  function handleSlotDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDropIndex(null);

    const files = imageFilesFromDataTransfer(e.dataTransfer);
    if (files.length > 0) {
      void uploadAtIndex(files, index);
      return;
    }

    const raw = e.dataTransfer.getData(GALLERY_DRAG_TYPE);
    if (!raw) return;
    const fromIndex = Number.parseInt(raw, 10);
    if (Number.isNaN(fromIndex)) return;
    onChange(moveGalleryImage(images, fromIndex, index));
    setDragIndex(null);
  }

  function handleZoneDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (imageFilesFromDataTransfer(e.dataTransfer).length > 0) {
      e.dataTransfer.dropEffect = "copy";
      setZoneActive(true);
    }
  }

  function handleZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setZoneActive(false);
    const files = imageFilesFromDataTransfer(e.dataTransfer);
    if (files.length > 0) {
      void uploadAtIndex(files, images.length);
    }
  }

  const visibleSlots =
    images.length < MAX_GALLERY_IMAGES ? images.length + 1 : images.length;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-label-sm uppercase text-on-surface-variant">
            Product photos
          </p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Drag photos between cards to reorder. The first photo is the shop
            cover.
          </p>
        </div>
        <span className="font-label-sm text-on-surface-variant">
          {images.length}/{MAX_GALLERY_IMAGES}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: visibleSlots }, (_, index) => {
          const path = images[index] ?? null;
          const isPrimary = index === 0;
          const isLarge = index === 0;
          const isDragging = dragIndex === index;
          const isDropTarget = dropIndex === index && dragIndex !== index;

          if (!path) {
            return (
              <button
                key={`slot-add-${index}`}
                type="button"
                disabled={!canUpload}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => handleSlotDragOver(e, index)}
                onDragLeave={() => setDropIndex(null)}
                onDrop={(e) => handleSlotDrop(e, index)}
                className={`flex aspect-square flex-col items-center justify-center border-2 border-dashed transition-colors ${
                  isLarge ? "col-span-2 row-span-2 sm:col-span-2 sm:row-span-2" : ""
                } ${
                  isDropTarget
                    ? "border-primary bg-primary/10"
                    : "border-outline-variant/40 bg-surface-container-low hover:border-primary/50"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <Icon
                  name="add_photo_alternate"
                  className="text-2xl text-on-surface-variant"
                />
                <span className="mt-1 font-label-sm uppercase text-on-surface-variant">
                  {index === 0 ? "Add cover" : "Add photo"}
                </span>
              </button>
            );
          }

          const preview = previews[path] ?? path;

          return (
            <div
              key={`${path}-${index}`}
              draggable={!disabled && !uploading}
              onDragStart={(e) => {
                e.dataTransfer.setData(GALLERY_DRAG_TYPE, String(index));
                e.dataTransfer.effectAllowed = "move";
                setDragIndex(index);
              }}
              onDragEnd={handleSlotDragEnd}
              onDragOver={(e) => handleSlotDragOver(e, index)}
              onDragLeave={() => setDropIndex(null)}
              onDrop={(e) => handleSlotDrop(e, index)}
              className={`group relative aspect-square overflow-hidden border bg-black iron-bevel ${
                isLarge ? "col-span-2 row-span-2 sm:col-span-2 sm:row-span-2" : ""
              } ${isDragging ? "opacity-40" : ""} ${
                isDropTarget ? "ring-2 ring-primary" : "border-outline-variant/30"
              }`}
            >
              <img
                src={preview}
                alt={`Product photo ${index + 1}`}
                className="h-full w-full object-contain"
                draggable={false}
              />

              {isPrimary && (
                <span className="absolute left-2 top-2 bg-primary px-2 py-0.5 font-label-sm uppercase text-on-primary">
                  Cover
                </span>
              )}

              <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 font-label-sm text-on-surface">
                {index + 1}
              </span>

              <div className="absolute inset-x-0 top-0 flex justify-end gap-1 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <span
                  className="flex h-8 w-8 cursor-grab items-center justify-center bg-black/70 text-on-surface active:cursor-grabbing"
                  title="Drag to reorder"
                >
                  <Icon name="drag_indicator" className="text-base" />
                </span>
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => onChange(removeGalleryImage(images, index))}
                  className="flex h-8 w-8 items-center justify-center bg-black/70 text-error hover:bg-error/20 disabled:opacity-50"
                  title="Remove photo"
                >
                  <Icon name="delete" className="text-base" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {images.length < MAX_GALLERY_IMAGES && (
        <div
          onDragOver={canUpload ? handleZoneDragOver : undefined}
          onDragLeave={() => setZoneActive(false)}
          onDrop={canUpload ? handleZoneDrop : undefined}
          className={`rounded border-2 border-dashed px-4 py-6 text-center transition-colors ${
            !canUpload
              ? "border-outline-variant/20 bg-surface-container-lowest opacity-70"
              : zoneActive
                ? "border-primary bg-primary/10"
                : "border-outline-variant/30 bg-surface-container-lowest"
          }`}
        >
          <Icon name="upload_file" className="text-3xl text-on-surface-variant" />
          <p className="mt-2 font-body-md text-on-surface">
            Drop photos here or{" "}
            <button
              type="button"
              disabled={!canUpload}
              onClick={() => fileInputRef.current?.click()}
              className="text-primary underline hover:text-plasma-glow disabled:opacity-50"
            >
              browse files
            </button>
          </p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Select or drop multiple images at once
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={!canUpload}
        onChange={(e) => {
          const files = e.target.files ? [...e.target.files] : [];
          if (files.length > 0) {
            void uploadAtIndex(files, images.length);
          }
          e.target.value = "";
        }}
      />

      {uploading && (
        <p className="text-body-sm text-on-surface-variant">Uploading photos…</p>
      )}
      {slugError && (
        <p className="text-body-sm text-on-surface-variant" role="status">
          {slugError} Fill in the slug field above (auto-filled from title on new
          products).
        </p>
      )}
      {uploadError && (
        <p className="text-body-sm text-error" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
}
