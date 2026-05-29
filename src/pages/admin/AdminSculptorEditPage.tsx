import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { requireSculptorModel } from "@/lib/dataModels";
import { resolveImageUrl } from "@/lib/productImageUrls";
import {
  normalizeSculptorSlug,
  validateSculptorSlug,
} from "@/lib/sculptorSlug";
import { uploadSculptorLogo } from "@/lib/sculptorImageUpload";

export function AdminSculptorEditPage() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isNew = slugParam === "new";

  const [slugInput, setSlugInput] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | undefined>();
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
        setSlugInput(data.slug);
        setName(data.name);
        setDescription(data.description ?? "");
        setLogo(data.logo ?? "");
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

  async function handleLogoUpload(file: File) {
    const slugForPath = isNew
      ? normalizeSculptorSlug(slugInput)
      : (slugParam ?? "");
    const slugError = validateSculptorSlug(slugForPath);
    if (slugError) {
      setError(`Save a valid slug before uploading: ${slugError}`);
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

    let Sculptor;
    try {
      Sculptor = requireSculptorModel(client);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sculptors unavailable");
      setSaving(false);
      return;
    }

    const slug = isNew ? normalizeSculptorSlug(slugInput) : (slugParam ?? "");
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
      description: description.trim() || undefined,
      logo: logo.trim() || undefined,
      myMiniFactoryUrl: myMiniFactoryUrl.trim() || undefined,
      patreonUrl: patreonUrl.trim() || undefined,
      instagramUrl: instagramUrl.trim() || undefined,
      facebookUrl: facebookUrl.trim() || undefined,
      xUrl: xUrl.trim() || undefined,
      active,
      sortOrder,
    };

    try {
      const result = isNew
        ? await Sculptor.create(payload)
        : await Sculptor.update(payload);
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join("; "));
      }
      navigate("/admin/sculptors");
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
            value={isNew ? slugInput : slugParam}
            onChange={(e) => setSlugInput(e.target.value)}
            readOnly={!isNew}
            required
            placeholder="nsminiatures"
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2 disabled:opacity-70"
          />
          {!isNew && (
            <span className="mt-1 block text-label-sm text-on-surface-variant">
              Public page: /sculptors/{slugParam}
            </span>
          )}
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

        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>

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
          <span className="font-label-sm uppercase">Active (visible on home)</span>
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
            disabled={saving || uploading}
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
