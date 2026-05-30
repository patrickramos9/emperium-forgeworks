import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  RichTextEditor,
  normalizeRichTextForSave,
} from "@/components/RichTextEditor";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { requireSculptorModel } from "@/lib/dataModels";
import { resolveImageUrl } from "@/lib/productImageUrls";
import {
  normalizeSculptorSlug,
  validateSculptorSlug,
} from "@/lib/sculptorSlug";
import { uploadSculptorLogo } from "@/lib/sculptorImageUpload";
import { saveSculptor } from "@/services/sculptorService";
import { AdminSculptorGalleryEditor } from "@/components/admin/AdminSculptorGalleryEditor";

export function AdminSculptorEditPage() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isNew = slugParam === "new";

  const [previousSlug, setPreviousSlug] = useState<string | null>(null);
  const [slugInput, setSlugInput] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | undefined>();
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [myMiniFactoryUrl, setMyMiniFactoryUrl] = useState("");
  const [patreonUrl, setPatreonUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (isNew) {
        setLoading(false);
        return;
      }
      const client = await requireAdminSession(navigate);
      if (!client) return;
      try {
        const Sculptor = requireSculptorModel(client);
        const { data, errors } = await Sculptor.get({ slug: slugParam ?? "" });
        if (errors?.length) {
          throw new Error(errors.map((e) => e.message).join("; "));
        }
        if (!data) {
          navigate("/admin/sculptors");
          return;
        }
        setPreviousSlug(data.slug);
        setSlugInput(data.slug);
        setName(data.name);
        setDescription(data.description ?? "");
        setLogo(data.logo ?? "");
        setGalleryImages(
          (data.galleryImages ?? []).filter(
            (path): path is string => Boolean(path),
          ),
        );
        setMyMiniFactoryUrl(data.myMiniFactoryUrl ?? "");
        setPatreonUrl(data.patreonUrl ?? "");
        setInstagramUrl(data.instagramUrl ?? "");
        setFacebookUrl(data.facebookUrl ?? "");
        setXUrl(data.xUrl ?? "");
        setActive(data.active ?? true);
        setSortOrder(data.sortOrder ?? 0);
        if (data.logo) {
          setLogoPreview(await resolveImageUrl(data.logo));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [slugParam, isNew, navigate]);

  function currentSlugForUpload(): string {
    return normalizeSculptorSlug(slugInput || slugParam || "");
  }

  async function handleLogoUpload(file: File) {
    const slugForPath = currentSlugForUpload();
    const slugError = validateSculptorSlug(slugForPath);
    if (slugError) {
      setError(`Enter a valid slug before uploading: ${slugError}`);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const path = await uploadSculptorLogo(slugForPath, file);
      setLogo(path);
      setLogoPreview(await resolveImageUrl(path));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const client = await requireAdminSession(navigate);
    if (!client) {
      setSaving(false);
      return;
    }

    try {
      requireSculptorModel(client);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sculptors unavailable");
      setSaving(false);
      return;
    }

    const slug = normalizeSculptorSlug(slugInput);
    const slugError = validateSculptorSlug(slug);
    if (slugError) {
      setError(slugError);
      setSaving(false);
      return;
    }

    if (!name.trim()) {
      setError("Name is required.");
      setSaving(false);
      return;
    }

    const payload = {
      slug,
      name: name.trim(),
      description: normalizeRichTextForSave(description),
      logo: logo.trim() || undefined,
      galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
      myMiniFactoryUrl: myMiniFactoryUrl.trim() || undefined,
      patreonUrl: patreonUrl.trim() || undefined,
      instagramUrl: instagramUrl.trim() || undefined,
      facebookUrl: facebookUrl.trim() || undefined,
      xUrl: xUrl.trim() || undefined,
      active,
      sortOrder,
    };

    try {
      const saved = await saveSculptor(client, {
        isNew,
        previousSlug: previousSlug ?? undefined,
        data: payload,
      });
      navigate(`/admin/sculptors/${saved.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew || !slugParam) return;
    if (!window.confirm(`Delete sculptor "${name}"?`)) return;

    const client = await requireAdminSession(navigate);
    if (!client) return;

    setSaving(true);
    try {
      const Sculptor = requireSculptorModel(client);
      const result = await Sculptor.delete({ slug: slugParam });
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join("; "));
      }
      navigate("/admin/sculptors");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-on-surface-variant">Loading...</p>;
  }

  const previewSlug = normalizeSculptorSlug(slugInput) || "your-slug";

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/admin/sculptors" className="text-primary hover:underline">
        ← Sculptors
      </Link>
      <h1 className="mt-4 font-display-lg text-headline-lg uppercase text-primary">
        {isNew ? "New sculptor" : "Edit sculptor"}
      </h1>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-stack-lg space-y-4">
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Slug (URL)
          </span>
          <input
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            required
            placeholder="nsminiatures"
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
          <span className="mt-1 block text-label-sm text-on-surface-variant">
            The slug is the URL-friendly id for this sculptor — used in{" "}
            <code className="text-on-surface">/sculptors/{previewSlug}</code>.
            Use lowercase letters, numbers, and hyphens (e.g.{" "}
            <code className="text-on-surface">nsminiatures</code>). You can
            change it later; the public link updates when you save.
          </span>
        </label>

        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>

        <div>
          <span className="font-label-sm uppercase text-on-surface-variant">
            Description
          </span>
          <div className="mt-1">
            <RichTextEditor value={description} onChange={setDescription} />
          </div>
        </div>

        <div>
          <span className="font-label-sm uppercase text-on-surface-variant">
            Logo
          </span>
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
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleLogoUpload(file);
            }}
            className="mt-2 block w-full text-label-sm"
          />
          {uploading && (
            <p className="text-label-sm text-on-surface-variant">Uploading...</p>
          )}
        </div>

        <AdminSculptorGalleryEditor
          images={galleryImages}
          onChange={setGalleryImages}
          sculptorSlug={currentSlugForUpload()}
          disabled={saving}
          onUploadingChange={setGalleryUploading}
          onError={setError}
        />

        {(
          [
            ["MyMiniFactory URL", myMiniFactoryUrl, setMyMiniFactoryUrl],
            ["Patreon URL", patreonUrl, setPatreonUrl],
            ["Instagram URL", instagramUrl, setInstagramUrl],
            ["Facebook URL", facebookUrl, setFacebookUrl],
            ["X URL", xUrl, setXUrl],
          ] as const
        ).map(([label, value, setter]) => (
          <label key={label} className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              {label}
            </span>
            <input
              type="url"
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
            />
          </label>
        ))}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span className="font-label-sm uppercase">
            Active (public profile + home card links to sculptor page)
          </span>
        </label>

        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Sort order
          </span>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>

        {error && <p className="text-error">{error}</p>}

        <div className="flex flex-wrap gap-4">
          <button
            type="submit"
            disabled={saving || uploading || galleryUploading}
            className="bg-primary px-6 py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {!isNew && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleDelete()}
              className="border border-error px-6 py-3 font-label-md uppercase text-error"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
