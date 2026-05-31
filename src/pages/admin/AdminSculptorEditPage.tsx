import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { normalizeRichTextForSave } from "@/components/RichTextEditor";
import { AdminSculptorPartnerAccess } from "@/components/admin/AdminSculptorPartnerAccess";
import {
  emptySculptorProfileFormState,
  SculptorProfileFields,
  type SculptorProfileFormState,
} from "@/components/admin/SculptorProfileFields";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { requireSculptorModel } from "@/lib/dataModels";
import {
  normalizeSculptorSlug,
  validateSculptorSlug,
} from "@/lib/sculptorSlug";
import { saveSculptor } from "@/services/sculptorService";
import type { AmplifyDataClient } from "@/lib/amplifyDataClient";

function recordToFormState(
  data: NonNullable<
    Awaited<ReturnType<AmplifyDataClient["models"]["Sculptor"]["get"]>>["data"]
  >,
): SculptorProfileFormState {
  return {
    name: data.name,
    description: data.description ?? "",
    logo: data.logo ?? "",
    galleryImages: (data.galleryImages ?? []).filter(
      (path): path is string => Boolean(path),
    ),
    myMiniFactoryUrl: data.myMiniFactoryUrl ?? "",
    patreonUrl: data.patreonUrl ?? "",
    instagramUrl: data.instagramUrl ?? "",
    facebookUrl: data.facebookUrl ?? "",
    xUrl: data.xUrl ?? "",
  };
}

export function AdminSculptorEditPage() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isNew = slugParam === "new";

  const [client, setClient] = useState<AmplifyDataClient | null>(null);
  const [previousSlug, setPreviousSlug] = useState<string | null>(null);
  const [slugInput, setSlugInput] = useState("");
  const [form, setForm] = useState<SculptorProfileFormState>(
    emptySculptorProfileFormState(),
  );
  const [editorUserId, setEditorUserId] = useState<string | null | undefined>();
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const adminClient = await requireAdminSession(navigate);
      if (!adminClient) return;
      setClient(adminClient);

      if (isNew) {
        setLoading(false);
        return;
      }

      try {
        const Sculptor = requireSculptorModel(adminClient);
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
        setForm(recordToFormState(data));
        setEditorUserId(data.editorUserId);
        setActive(data.active ?? true);
        setSortOrder(data.sortOrder ?? 0);
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const adminClient = await requireAdminSession(navigate);
    if (!adminClient) {
      setSaving(false);
      return;
    }

    try {
      requireSculptorModel(adminClient);
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

    if (!form.name.trim()) {
      setError("Name is required.");
      setSaving(false);
      return;
    }

    const payload = {
      slug,
      name: form.name.trim(),
      description: normalizeRichTextForSave(form.description),
      logo: form.logo.trim() || undefined,
      galleryImages: form.galleryImages.length > 0 ? form.galleryImages : undefined,
      myMiniFactoryUrl: form.myMiniFactoryUrl.trim() || undefined,
      patreonUrl: form.patreonUrl.trim() || undefined,
      instagramUrl: form.instagramUrl.trim() || undefined,
      facebookUrl: form.facebookUrl.trim() || undefined,
      xUrl: form.xUrl.trim() || undefined,
      active,
      sortOrder,
    };

    try {
      const saved = await saveSculptor(adminClient, {
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
    if (!window.confirm(`Delete sculptor "${form.name}"?`)) return;

    const adminClient = await requireAdminSession(navigate);
    if (!adminClient) return;

    setSaving(true);
    try {
      const Sculptor = requireSculptorModel(adminClient);
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

        <SculptorProfileFields
          sculptorSlug={currentSlugForUpload()}
          value={form}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          disabled={saving}
          onLogoUploadingChange={setLogoUploading}
          onGalleryUploadingChange={setGalleryUploading}
          onError={setError}
        />

        {!isNew && client && slugParam && (
          <AdminSculptorPartnerAccess
            client={client}
            sculptor={{ slug: slugParam, editorUserId }}
            onUpdated={setEditorUserId}
            disabled={saving}
          />
        )}

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
            disabled={saving || logoUploading || galleryUploading}
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
