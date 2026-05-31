import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { normalizeRichTextForSave } from "@/components/RichTextEditor";
import {
  emptySculptorProfileFormState,
  SculptorProfileFields,
  type SculptorProfileFormState,
} from "@/components/admin/SculptorProfileFields";
import { requireCustomerSession } from "@/lib/amplifyDataClient";
import { requireSculptorModel } from "@/lib/dataModels";
import {
  getSculptorForEditor,
  updateOwnSculptor,
} from "@/services/sculptorService";

type PartnerOutletContext = { profileSlug: string };

async function currentUserId(): Promise<string | null> {
  try {
    const { fetchAuthSession } = await import("aws-amplify/auth");
    const session = await fetchAuthSession();
    const sub = session.tokens?.idToken?.payload?.sub;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}

function recordToFormState(
  row: NonNullable<Awaited<ReturnType<typeof getSculptorForEditor>>>,
): SculptorProfileFormState {
  return {
    name: row.name,
    description: row.description ?? "",
    logo: row.logo ?? "",
    galleryImages: (row.galleryImages ?? []).filter(
      (path): path is string => Boolean(path),
    ),
    myMiniFactoryUrl: row.myMiniFactoryUrl ?? "",
    patreonUrl: row.patreonUrl ?? "",
    instagramUrl: row.instagramUrl ?? "",
    facebookUrl: row.facebookUrl ?? "",
    xUrl: row.xUrl ?? "",
  };
}

export function PartnerSculptorEditPage() {
  const navigate = useNavigate();
  const { profileSlug } = useOutletContext<PartnerOutletContext>();
  const [form, setForm] = useState<SculptorProfileFormState>(
    emptySculptorProfileFormState(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const client = await requireCustomerSession(
        navigate,
        "/partner/sculptor",
      );
      if (!client) return;

      try {
        requireSculptorModel(client);
        const userId = await currentUserId();
        if (!userId) return;
        const row = await getSculptorForEditor(client, userId);
        if (!row || row.slug !== profileSlug) {
          setError("Sculptor profile not found.");
          return;
        }
        setForm(recordToFormState(row));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [navigate, profileSlug]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMessage(null);

    const client = await requireCustomerSession(navigate, "/partner/sculptor");
    if (!client) {
      setSaving(false);
      return;
    }

    try {
      requireSculptorModel(client);
      const userId = await currentUserId();
      if (!userId) throw new Error("Sign in required.");

      await updateOwnSculptor(client, userId, profileSlug, {
        name: form.name.trim(),
        description: normalizeRichTextForSave(form.description),
        logo: form.logo.trim() || undefined,
        galleryImages:
          form.galleryImages.length > 0 ? form.galleryImages : undefined,
        myMiniFactoryUrl: form.myMiniFactoryUrl.trim() || undefined,
        patreonUrl: form.patreonUrl.trim() || undefined,
        instagramUrl: form.instagramUrl.trim() || undefined,
        facebookUrl: form.facebookUrl.trim() || undefined,
        xUrl: form.xUrl.trim() || undefined,
      });
      setSavedMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-on-surface-variant">Loading...</p>;
  }

  return (
    <div>
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        Edit your sculptor profile
      </h1>
      <p className="mt-2 text-on-surface-variant">
        Changes appear on{" "}
        <Link
          to={`/sculptors/${profileSlug}`}
          className="text-primary hover:underline"
        >
          /sculptors/{profileSlug}
        </Link>
        . Slug, visibility, and sort order are managed by admin.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-stack-lg space-y-4">
        <SculptorProfileFields
          sculptorSlug={profileSlug}
          value={form}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          disabled={saving}
          onLogoUploadingChange={setLogoUploading}
          onGalleryUploadingChange={setGalleryUploading}
          onError={setError}
        />

        {error && <p className="text-error">{error}</p>}
        {savedMessage && <p className="text-secondary">{savedMessage}</p>}

        <button
          type="submit"
          disabled={saving || logoUploading || galleryUploading}
          className="bg-primary px-6 py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
