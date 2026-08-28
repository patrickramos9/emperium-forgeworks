import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageFeedback } from "@/components/PageFeedback";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import {
  DEFAULT_STORE_OPS_SETTINGS,
  fetchStoreOpsSettings,
  runIdleCartCleanup,
  saveStoreOpsSettings,
  type CartCleanupScope,
  type StoreOpsSettings,
} from "@/services/cartCleanupSettingsService";

const SCOPE_OPTIONS: { value: CartCleanupScope; label: string; hint: string }[] =
  [
    {
      value: "guest",
      label: "Guest carts only",
      hint: "Deletes idle GuestCartSnapshot rows (anonymous shoppers).",
    },
    {
      value: "signed_in",
      label: "Signed-in carts only",
      hint: "Deletes idle CartSnapshot rows and revokes open abandoned-cart promos.",
    },
    {
      value: "both",
      label: "Guest and signed-in",
      hint: "Runs both cleanups using the same idle threshold.",
    },
  ];

export function AdminSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<StoreOpsSettings>(
    DEFAULT_STORE_OPS_SETTINGS,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const client = await requireAdminSession(navigate);
      if (!client) return;
      try {
        setSettings(await fetchStoreOpsSettings(client));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    setRunMessage(null);
    try {
      const client = await requireAdminSession(navigate);
      if (!client) return;
      setSettings(await saveStoreOpsSettings(client, settings));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRunNow() {
    setRunning(true);
    setError(null);
    setSaved(false);
    setRunMessage(null);
    try {
      const client = await requireAdminSession(navigate);
      if (!client) return;
      const result = await runIdleCartCleanup(client, {
        idleDays: settings.cartCleanup.idleDays,
        scope: settings.cartCleanup.scope,
      });
      setRunMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cleanup failed.");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return <p className="text-on-surface-variant">Loading settings…</p>;
  }

  return (
    <div>
      <div>
        <h1 className="font-display-lg text-headline-lg uppercase text-on-surface">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
          Store configuration and operational settings.
        </p>
      </div>

      {error ? (
        <PageFeedback tone="error" className="mt-4">
          {error}
        </PageFeedback>
      ) : null}
      {saved ? (
        <PageFeedback tone="success" className="mt-4">
          Settings saved.
        </PageFeedback>
      ) : null}
      {runMessage ? (
        <PageFeedback tone="success" className="mt-4">
          {runMessage}
        </PageFeedback>
      ) : null}

      <form
        onSubmit={(e) => void handleSave(e)}
        className="mt-stack-lg max-w-2xl space-y-10"
      >
        <section className="space-y-6 border border-outline-variant/20 bg-surface-container-low p-stack-lg iron-bevel">
          <div>
            <h2 className="font-label-md uppercase text-on-surface">
              Email notifications
            </h2>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Controls automated Resend mail (order confirmations, shipped
              updates, new-order alerts to Melissa, print quote/decline). In-app
              inbox messages are not affected.
            </p>
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.emailNotificationsEnabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  emailNotificationsEnabled: e.target.checked,
                }))
              }
            />
            <span>
              <span className="font-label-md text-on-surface">
                Send transactional emails
              </span>
              <span className="mt-1 block text-body-sm text-on-surface-variant">
                When off, Lambdas skip Resend entirely (useful for testing or a
                temporary pause). Requires{" "}
                <code className="text-on-surface">RESEND_API_KEY</code> when on.
              </span>
            </span>
          </label>
        </section>

        <section className="space-y-6 border border-outline-variant/20 bg-surface-container-low p-stack-lg iron-bevel">
          <div>
            <h2 className="font-label-md uppercase text-on-surface">
              Idle cart cleanup
            </h2>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Remove server cart snapshots that have not been updated for longer
              than the threshold. Product active-cart counts are adjusted when
              rows are deleted. A daily job uses the saved settings when enabled;{" "}
              <span className="text-on-surface">Run cleanup now</span> uses the
              values below (save first to persist them for the schedule).
            </p>
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.cartCleanup.enabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  cartCleanup: {
                    ...prev.cartCleanup,
                    enabled: e.target.checked,
                  },
                }))
              }
            />
            <span>
              <span className="font-label-md text-on-surface">
                Enable daily automatic cleanup
              </span>
              <span className="mt-1 block text-body-sm text-on-surface-variant">
                When on, a scheduled job deletes idle carts once per day using the
                saved threshold and scope.
              </span>
            </span>
          </label>

          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Idle threshold (days)
            </span>
            <input
              type="number"
              min={1}
              max={3650}
              required
              value={settings.cartCleanup.idleDays}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  cartCleanup: {
                    ...prev.cartCleanup,
                    idleDays: Number(e.target.value) || 1,
                  },
                }))
              }
              className="mt-1 w-full max-w-xs border border-outline-variant/30 bg-surface px-3 py-2"
            />
            <span className="mt-1 block text-body-sm text-on-surface-variant">
              Based on last cart sync (
              <code className="text-on-surface">updatedAt</code>
              ). Typical starting value: 90.
            </span>
          </label>

          <fieldset>
            <legend className="font-label-sm uppercase text-on-surface-variant">
              Cleanup scope
            </legend>
            <div className="mt-3 space-y-3">
              {SCOPE_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="cartCleanupScope"
                    className="mt-1"
                    checked={settings.cartCleanup.scope === option.value}
                    onChange={() =>
                      setSettings((prev) => ({
                        ...prev,
                        cartCleanup: {
                          ...prev.cartCleanup,
                          scope: option.value,
                        },
                      }))
                    }
                  />
                  <span>
                    <span className="font-label-md text-on-surface">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-body-sm text-on-surface-variant">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={saving || running}
              onClick={() => void handleRunNow()}
              className="border border-outline-variant/40 bg-surface px-4 py-2 font-label-sm uppercase text-on-surface disabled:opacity-60"
            >
              {running ? "Running…" : "Run cleanup now"}
            </button>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || running}
            className="border border-primary bg-primary px-4 py-2 font-label-sm uppercase text-on-primary disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
