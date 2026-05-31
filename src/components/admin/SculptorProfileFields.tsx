import { useEffect, useState } from "react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { AdminSculptorGalleryEditor } from "@/components/admin/AdminSculptorGalleryEditor";
import { resolveImageUrl } from "@/lib/productImageUrls";
import { uploadSculptorLogo } from "@/lib/sculptorImageUpload";
import { validateSculptorSlug } from "@/lib/sculptorSlug";

export type SculptorProfileFormState = {
  name: string;
  description: string;
  logo: string;
  galleryImages: string[];
  myMiniFactoryUrl: string;
  patreonUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  xUrl: string;
};

type SculptorProfileFieldsProps = {
  sculptorSlug: string;
  value: SculptorProfileFormState;
  onChange: (patch: Partial<SculptorProfileFormState>) => void;
  disabled?: boolean;
  onLogoUploadingChange?: (uploading: boolean) => void;
  onGalleryUploadingChange?: (uploading: boolean) => void;
  onError?: (message: string) => void;
};

export function emptySculptorProfileFormState(): SculptorProfileFormState {
  return {
    name: "",
    description: "",
    logo: "",
    galleryImages: [],
    myMiniFactoryUrl: "",
    patreonUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    xUrl: "",
  };
}

export function SculptorProfileFields({
  sculptorSlug,
  value,
  onChange,
  disabled = false,
  onLogoUploadingChange,
  onGalleryUploadingChange,
  onError,
}: SculptorProfileFieldsProps) {
  const [logoPreview, setLogoPreview] = useState<string | undefined>();
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPreview() {
      if (!value.logo) {
        setLogoPreview(undefined);
        return;
      }
      const url = await resolveImageUrl(value.logo);
      if (!cancelled) setLogoPreview(url);
    }
    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [value.logo]);

  async function handleLogoUpload(file: File) {
    const slugError = validateSculptorSlug(sculptorSlug);
    if (slugError) {
      onError?.(`Valid sculptor slug required before upload: ${slugError}`);
      return;
    }

    setLogoUploading(true);
    onLogoUploadingChange?.(true);
    try {
      const path = await uploadSculptorLogo(sculptorSlug, file);
      onChange({ logo: path });
      setLogoPreview(await resolveImageUrl(path));
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
      onLogoUploadingChange?.(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="font-label-sm uppercase text-on-surface-variant">Name</span>
        <input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          required
          disabled={disabled}
          className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 disabled:opacity-50"
        />
      </label>

      <div>
        <span className="font-label-sm uppercase text-on-surface-variant">
          Description
        </span>
        <div className="mt-1">
          <RichTextEditor
            value={value.description}
            onChange={(html) => onChange({ description: html })}
          />
        </div>
      </div>

      <div>
        <span className="font-label-sm uppercase text-on-surface-variant">Logo</span>
        {logoPreview && (
          <img
            src={logoPreview}
            alt=""
            className="mt-2 max-h-48 border border-outline-variant/20 object-contain"
          />
        )}
        <input
          type="file"
          accept="image/*"
          disabled={disabled || logoUploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleLogoUpload(file);
          }}
          className="mt-2 block w-full text-label-sm"
        />
        {logoUploading && (
          <p className="text-label-sm text-on-surface-variant">Uploading...</p>
        )}
      </div>

      <AdminSculptorGalleryEditor
        images={value.galleryImages}
        onChange={(galleryImages) => onChange({ galleryImages })}
        sculptorSlug={sculptorSlug}
        disabled={disabled}
        onUploadingChange={onGalleryUploadingChange}
        onError={onError}
      />

      {(
        [
          ["MyMiniFactory URL", "myMiniFactoryUrl"],
          ["Patreon URL", "patreonUrl"],
          ["Instagram URL", "instagramUrl"],
          ["Facebook URL", "facebookUrl"],
          ["X URL", "xUrl"],
        ] as const
      ).map(([label, key]) => (
        <label key={key} className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            {label}
          </span>
          <input
            type="url"
            value={value[key]}
            onChange={(e) => onChange({ [key]: e.target.value })}
            disabled={disabled}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 disabled:opacity-50"
          />
        </label>
      ))}
    </div>
  );
}
