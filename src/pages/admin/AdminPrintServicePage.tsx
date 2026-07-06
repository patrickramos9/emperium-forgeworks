import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageFeedback } from "@/components/PageFeedback";
import { AdminResinColorsEditor } from "@/components/admin/AdminResinColorsEditor";
import { AdminResinTypesEditor } from "@/components/admin/AdminResinTypesEditor";
import { AdminSizeTiersEditor } from "@/components/admin/AdminSizeTiersEditor";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import {
  defaultPrintServiceConfig,
  PRINT_SERVICE_CATALOG_SLUG,
  type PrintServiceConfigData,
} from "@/lib/printService";
import {
  fetchPrintServiceConfig,
  savePrintServiceConfig,
} from "@/services/printServiceConfigService";

export function AdminPrintServicePage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<PrintServiceConfigData>(
    defaultPrintServiceConfig(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      const client = await requireAdminSession(navigate);
      if (!client) return;
      try {
        setConfig(await fetchPrintServiceConfig());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load config.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await savePrintServiceConfig(config);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save config.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-on-surface-variant">Loading print service…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-headline-lg uppercase text-on-surface">
            Print service
          </h1>
          <p className="mt-2 text-body-sm text-on-surface-variant">
            Customer flow at{" "}
            <Link to="/print" className="text-primary hover:underline">
              /print
            </Link>
            . Uses a backing catalog product (slug{" "}
            <code className="text-on-surface">{PRINT_SERVICE_CATALOG_SLUG}</code>
            ) for shipping and order emails — find it in{" "}
            <Link to="/admin/products" className="text-primary hover:underline">
              Admin → Products
            </Link>
            ; it is hidden from the public shop.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-stack-lg max-w-3xl space-y-6 border border-outline-variant/20 bg-surface-container-low p-stack-lg iron-bevel"
      >
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={config.active}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, active: e.target.checked }))
            }
          />
          <span className="font-label-md text-on-surface">Active (show /print + home card)</span>
        </label>

        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Catalog product slug
          </span>
          <input
            value={config.catalogProductSlug}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                catalogProductSlug: e.target.value,
              }))
            }
            className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Max STL size (bytes)
          </span>
          <input
            type="number"
            min={1}
            value={config.maxFileBytes}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                maxFileBytes: Number(e.target.value) || prev.maxFileBytes,
              }))
            }
            className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Policy (markdown bullets)
          </span>
          <textarea
            rows={8}
            value={config.policyMarkdown}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, policyMarkdown: e.target.value }))
            }
            className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2 font-mono text-sm"
          />
        </label>

        <div className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Size tiers
          </span>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Each tier sets the base print price before resin adjustments.
          </p>
          <div className="mt-3">
            <AdminSizeTiersEditor
              tiers={config.sizeTiers}
              onChange={(sizeTiers) =>
                setConfig((prev) => ({ ...prev, sizeTiers }))
              }
            />
          </div>
        </div>

        <div className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Resin types
          </span>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Optional price add-on per resin type (added to the selected size tier).
          </p>
          <div className="mt-3">
            <AdminResinTypesEditor
              types={config.resinTypes}
              onChange={(resinTypes) =>
                setConfig((prev) => ({ ...prev, resinTypes }))
              }
            />
          </div>
        </div>

        <div className="block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Resin colors
          </span>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Pick a swatch color for each resin — stored as{" "}
            <code className="text-on-surface">hexColor</code> in config (shown on{" "}
            <Link to="/print" className="text-primary hover:underline">
              /print
            </Link>
            ).
          </p>
          <div className="mt-3">
            <AdminResinColorsEditor
              colors={config.resinColors}
              resinTypes={config.resinTypes}
              onChange={(resinColors) =>
                setConfig((prev) => ({ ...prev, resinColors }))
              }
            />
          </div>
        </div>

        {error && <PageFeedback tone="error">{error}</PageFeedback>}
        {saved && (
          <PageFeedback tone="success">Print service settings saved.</PageFeedback>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-primary px-4 py-2 font-label-md uppercase tracking-widest text-on-primary disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
