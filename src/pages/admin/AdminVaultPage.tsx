import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import {
  hasVaultAccessModel,
  requireVaultAccessModel,
} from "@/lib/dataModels";
import { listAllProducts } from "@/lib/listAllProducts";
import { listAllVaultAccess } from "@/lib/listAllVaultAccess";
import {
  normalizeVaultAccessKey,
  validateVaultAccessKey,
} from "@/lib/vaultKey";

type VaultRow = {
  accessKey: string;
  userId: string;
  userEmail: string;
  active: boolean;
};

export function AdminVaultPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<VaultRow[]>([]);
  const [vaultProductCount, setVaultProductCount] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState(false);

  const [userEmail, setUserEmail] = useState("");
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [accessKey, setAccessKey] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editAccessKey, setEditAccessKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const configured = await configureAmplify();
    if (!configured) {
      setError("Amplify is not configured.");
      setLoading(false);
      return;
    }

    const client = await requireAdminSession(navigate);
    if (!client) {
      setLoading(false);
      return;
    }

    if (!hasVaultAccessModel(client)) {
      setModelReady(false);
      setError(
        "VaultAccess model is not deployed. Push backend changes and redeploy Amplify, then refresh.",
      );
      setLoading(false);
      return;
    }

    setModelReady(true);

    try {
      const [accessRows, products] = await Promise.all([
        listAllVaultAccess(client),
        listAllProducts(client),
      ]);
      setRows(
        accessRows.map((r) => ({
          accessKey: r.accessKey,
          userId: r.userId,
          userEmail: r.userEmail,
          active: r.active ?? true,
        })),
      );
      setVaultProductCount(products.filter((p) => p.vaultOnly).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vault data");
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLookupEmail() {
    setLookupLoading(true);
    setError(null);
    setResolvedUserId(null);

    const client = await requireAdminSession(navigate);
    if (!client) {
      setLookupLoading(false);
      return;
    }

    try {
      const { data, errors } = await client.queries.lookupCustomerByEmail({
        email: userEmail.trim(),
      });
      if (errors?.length) {
        throw new Error(errors.map((e) => e.message).join("; "));
      }
      if (!data?.userId) {
        setError("No customer account found for that email.");
      } else {
        setResolvedUserId(data.userId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    }
    setLookupLoading(false);
  }

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const keyError = validateVaultAccessKey(accessKey);
    if (keyError) {
      setError(keyError);
      setSaving(false);
      return;
    }
    if (!resolvedUserId) {
      setError("Look up the customer email before assigning a key.");
      setSaving(false);
      return;
    }

    const client = await requireAdminSession(navigate);
    if (!client) {
      setSaving(false);
      return;
    }

    const VaultAccess = requireVaultAccessModel(client);
    const normalizedKey = normalizeVaultAccessKey(accessKey);

    const existingForUser = rows.find(
      (r) => r.userId === resolvedUserId && r.active,
    );
    if (existingForUser) {
      setError(
        `This customer already has key "${existingForUser.accessKey}". Revoke it first or edit that assignment.`,
      );
      setSaving(false);
      return;
    }

    if (rows.some((r) => r.accessKey === normalizedKey)) {
      setError("That access key is already in use.");
      setSaving(false);
      return;
    }

    try {
      const result = await VaultAccess.create({
        accessKey: normalizedKey,
        userId: resolvedUserId,
        userEmail: userEmail.trim().toLowerCase(),
        active: true,
      });
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join("; "));
      }
      setUserEmail("");
      setResolvedUserId(null);
      setAccessKey("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign key");
    }
    setSaving(false);
  }

  async function handleRevoke(accessKeyToRevoke: string) {
    if (!window.confirm(`Revoke vault key "${accessKeyToRevoke}"?`)) return;

    const client = await requireAdminSession(navigate);
    if (!client) return;

    const VaultAccess = requireVaultAccessModel(client);
    setSaving(true);
    try {
      const result = await VaultAccess.update({
        accessKey: accessKeyToRevoke,
        active: false,
      });
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join("; "));
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    }
    setSaving(false);
  }

  async function handleReassign(oldKey: string) {
    const keyError = validateVaultAccessKey(editAccessKey);
    if (keyError) {
      setError(keyError);
      return;
    }
    const normalized = normalizeVaultAccessKey(editAccessKey);
    if (normalized === oldKey) {
      setEditingKey(null);
      return;
    }
    if (rows.some((r) => r.accessKey === normalized)) {
      setError("That access key is already in use.");
      return;
    }

    const row = rows.find((r) => r.accessKey === oldKey);
    if (!row) return;

    const client = await requireAdminSession(navigate);
    if (!client) return;

    const VaultAccess = requireVaultAccessModel(client);
    setSaving(true);
    try {
      await VaultAccess.delete({ accessKey: oldKey });
      const result = await VaultAccess.create({
        accessKey: normalized,
        userId: row.userId,
        userEmail: row.userEmail,
        active: row.active,
      });
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join("; "));
      }
      setEditingKey(null);
      setEditAccessKey("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-assign failed");
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        Hidden Vault
      </h1>
      <p className="mt-4 text-on-surface-variant">
        Assign a unique alphanumeric key (up to 20 characters) to each customer.
        Keys are stored in the database and can be revoked or re-assigned here.
        Vault-only products are managed on{" "}
        <Link to="/admin/products" className="text-primary hover:underline">
          Products
        </Link>
        .
      </p>

      {vaultProductCount !== null && (
        <p className="mt-2 font-label-sm text-on-surface-variant">
          {vaultProductCount} vault-only product
          {vaultProductCount === 1 ? "" : "s"} in the catalog.
        </p>
      )}

      {error && <p className="mt-4 text-error">{error}</p>}

      {modelReady && (
        <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-6 iron-bevel">
          <h2 className="font-headline-md text-on-surface">Assign vault key</h2>
          <form onSubmit={(e) => void handleAssign(e)} className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="block min-w-[240px] flex-1">
                <span className="font-label-sm uppercase text-on-surface-variant">
                  Customer email
                </span>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => {
                    setUserEmail(e.target.value);
                    setResolvedUserId(null);
                  }}
                  required
                  className="mt-1 w-full border border-outline-variant/30 bg-surface-container-high px-3 py-2"
                />
              </label>
              <button
                type="button"
                disabled={lookupLoading || !userEmail.trim()}
                onClick={() => void handleLookupEmail()}
                className="border border-outline-variant/30 px-4 py-2 font-label-sm uppercase hover:border-primary"
              >
                {lookupLoading ? "Looking up..." : "Look up account"}
              </button>
            </div>
            {resolvedUserId && (
              <p className="font-label-sm text-secondary">
                Account found — ready to assign a key.
              </p>
            )}
            <label className="block max-w-xs">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Access key (A–Z, a–z, 0–9, max 20)
              </span>
              <input
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                required
                maxLength={20}
                autoComplete="off"
                className="mt-1 w-full border border-outline-variant/30 bg-surface-container-high px-3 py-2 font-mono"
              />
            </label>
            <button
              type="submit"
              disabled={saving || !resolvedUserId}
              className="bg-primary px-6 py-2 font-label-md uppercase text-on-primary disabled:opacity-50"
            >
              {saving ? "Saving..." : "Assign key"}
            </button>
          </form>
        </section>
      )}

      <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-6 iron-bevel">
        <h2 className="font-headline-md text-on-surface">Customer keys</h2>
        {loading ? (
          <p className="mt-4 text-on-surface-variant">Loading...</p>
        ) : !modelReady ? null : rows.length === 0 ? (
          <p className="mt-4 text-on-surface-variant">No vault keys assigned yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-outline-variant/20">
            {rows.map((row) => (
              <li key={row.accessKey} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-body-md text-on-surface">
                      {row.accessKey}
                    </p>
                    <p className="font-label-sm text-on-surface-variant">
                      {row.userEmail}
                      {!row.active && " · Revoked"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.active && (
                      <>
                        <button
                          type="button"
                          className="font-label-sm uppercase text-primary hover:underline"
                          onClick={() => {
                            setEditingKey(row.accessKey);
                            setEditAccessKey(row.accessKey);
                          }}
                        >
                          Re-assign key
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          className="font-label-sm uppercase text-error hover:underline"
                          onClick={() => void handleRevoke(row.accessKey)}
                        >
                          Revoke
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {editingKey === row.accessKey && (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <input
                      value={editAccessKey}
                      onChange={(e) => setEditAccessKey(e.target.value)}
                      maxLength={20}
                      className="border border-outline-variant/30 bg-surface-container-high px-3 py-2 font-mono"
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleReassign(row.accessKey)}
                      className="bg-primary px-3 py-2 font-label-sm uppercase text-on-primary"
                    >
                      Save new key
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingKey(null)}
                      className="font-label-sm uppercase text-on-surface-variant"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
