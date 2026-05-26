import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { requireAnnouncementModel } from "@/lib/dataModels";

export function AdminAnnouncementEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [active, setActive] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
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
        const Announcement = requireAnnouncementModel(client);
        const { data, errors } = await Announcement.get({
          id: id ?? "",
        });
        if (errors?.length) throw new Error(errors.map((e) => e.message).join("; "));
        if (!data) {
          navigate("/admin/announcements");
          return;
        }
        setTitle(data.title);
        setBody(data.body);
        setPinned(data.pinned ?? false);
        setActive(data.active ?? true);
        setStartsAt(data.startsAt?.slice(0, 16) ?? "");
        setEndsAt(data.endsAt?.slice(0, 16) ?? "");
        setSortOrder(data.sortOrder ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      }
      setLoading(false);
    }
    void load();
  }, [id, isNew, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const client = await requireAdminSession(navigate);
    if (!client) {
      setSaving(false);
      return;
    }

    let Announcement;
    try {
      Announcement = requireAnnouncementModel(client);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Announcements unavailable");
      setSaving(false);
      return;
    }

    const payload = {
      title: title.trim(),
      body: body.trim(),
      pinned,
      active,
      sortOrder,
      ...(startsAt ? { startsAt: new Date(startsAt).toISOString() } : {}),
      ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
    };

    try {
      const result = isNew
        ? await Announcement.create(payload)
        : await Announcement.update({ id: id ?? "", ...payload });
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join("; "));
      }
      navigate("/admin/announcements");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew || !id) return;
    if (!window.confirm("Delete this announcement?")) return;
    const client = await requireAdminSession(navigate);
    if (!client) return;
    setSaving(true);
    try {
      const Announcement = requireAnnouncementModel(client);
      await Announcement.delete({ id });
      navigate("/admin/announcements");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setSaving(false);
    }
  }

  if (loading) return <p className="text-on-surface-variant">Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/admin/announcements" className="text-primary hover:underline">
        ← Announcements
      </Link>
      <h1 className="mt-4 font-display-lg text-headline-lg uppercase text-primary">
        {isNew ? "New announcement" : "Edit announcement"}
      </h1>
      <form onSubmit={(e) => void handleSubmit(e)} className="mt-stack-lg space-y-4">
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">Body</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={8}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span className="font-label-sm uppercase">Active</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            <span className="font-label-sm uppercase">Pinned</span>
          </label>
        </div>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Starts (optional)
          </span>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Ends (optional)
          </span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
          />
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
            disabled={saving}
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
