import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import {
  fetchCustomerAccounts,
  type CustomerAccount,
} from "@/lib/customerAdmin";
import {
  hasVaultAccessModel,
  requireVaultAccessModel,
} from "@/lib/dataModels";
import { listAllProducts } from "@/lib/listAllProducts";
import { listAllVaultAccess } from "@/lib/listAllVaultAccess";

type VaultRow = {
  accessKey: string;
  userId: string;
  userEmail: string;
  active: boolean;
};

type VaultFilter = "all" | "with-key" | "no-key";

function vaultStatusForUser(
  userId: string,
  rows: VaultRow[],
): "active" | "revoked" | "none" {
  const matches = rows.filter((r) => r.userId === userId);
  if (matches.some((r) => r.active)) return "active";
  if (matches.length > 0) return "revoked";
  return "none";
}

export function AdminVaultPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<VaultRow[]>([]);
  const [vaultProductCount, setVaultProductCount] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState(false);

  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersNextToken, setCustomersNextToken] = useState<
    string | null | undefined
  >(undefined);
  const [emailSearch, setEmailSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vaultFilter, setVaultFilter] = useState<VaultFilter>("all");

  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerAccount | null>(null);
  const [saving, setSaving] = useState(false);

  const loadVaultData = useCallback(async () => {
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

  const loadCustomers = useCallback(
    async (options: { append?: boolean; nextToken?: string } = {}) => {
      setCustomersLoading(true);
      setError(null);

      const client = await requireAdminSession(navigate);
      if (!client) {
        setCustomersLoading(false);
        return;
      }

      try {
        const { items, nextToken } = await fetchCustomerAccounts(client, {
          emailFilter: debouncedSearch || undefined,
          nextToken: options.append ? options.nextToken : undefined,
          limit: 25,
        });
        setCustomers((prev) => (options.append ? [...prev, ...items] : items));
        setCustomersNextToken(nextToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load customers");
      }
      setCustomersLoading(false);
    },
    [navigate, debouncedSearch],
  );

  useEffect(() => {
    void loadVaultData();
  }, [loadVaultData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(emailSearch.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [emailSearch]);

  useEffect(() => {
    if (!modelReady) return;
    void loadCustomers();
  }, [modelReady, debouncedSearch, loadCustomers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const status = vaultStatusForUser(customer.userId, rows);
      if (vaultFilter === "with-key") return status === "active";
      if (vaultFilter === "no-key") return status === "none";
      return true;
    });
  }, [customers, rows, vaultFilter]);

  function generateAccessToken(length = 20): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  }

  async function handleGrantAccess() {
    setSaving(true);
    setError(null);
    if (!selectedCustomer) {
      setError("Select a customer account first.");
      setSaving(false);
      return;
    }

    const client = await requireAdminSession(navigate);
    if (!client) {
      setSaving(false);
      return;
    }

    const VaultAccess = requireVaultAccessModel(client);

    const existingForUser = rows.find(
      (r) => r.userId === selectedCustomer.userId && r.active,
    );
    if (existingForUser) {
      setError(
        `This customer already has key "${existingForUser.accessKey}". Revoke it first or re-assign that key.`,
      );
      setSaving(false);
      return;
    }

    try {
      const token = generateAccessToken(20);
      const result = await VaultAccess.create({
        accessKey: token,
        userId: selectedCustomer.userId,
        userEmail: selectedCustomer.email.toLowerCase(),
        active: true,
      });
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join("; "));
      }
      setSelectedCustomer(null);
      await loadVaultData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grant vault access");
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
      await loadVaultData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    }
    setSaving(false);
  }

  async function handleReEnable(accessKeyToEnable: string, userId: string) {
    const existingActive = rows.find(
      (r) => r.userId === userId && r.active && r.accessKey !== accessKeyToEnable,
    );
    if (existingActive) {
      setError(
        "This customer already has active vault access. Revoke the active permission first.",
      );
      return;
    }

    const client = await requireAdminSession(navigate);
    if (!client) return;

    const VaultAccess = requireVaultAccessModel(client);
    setSaving(true);
    setError(null);
    try {
      const result = await VaultAccess.update({
        accessKey: accessKeyToEnable,
        active: true,
      });
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join("; "));
      }
      await loadVaultData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not re-enable access");
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        Hidden Vault
      </h1>
      <p className="mt-4 text-on-surface-variant">
        Grant vault permission to customer accounts. Only customers with active
        vault permission can access <code>/vault</code> or see Vault in the
        storefront navigation. Vault-only products are managed on{" "}
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

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["all", "All accounts"],
                ["no-key", "No vault key"],
                ["with-key", "Has active key"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setVaultFilter(value)}
                className={
                  vaultFilter === value
                    ? "bg-primary px-3 py-1 font-label-sm uppercase text-on-primary"
                    : "border border-outline-variant/30 px-3 py-1 font-label-sm uppercase text-on-surface-variant hover:border-primary"
                }
              >
                {label}
              </button>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Search by email
            </span>
            <input
              type="search"
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              placeholder="Filter customer accounts..."
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container-high px-3 py-2"
            />
          </label>

          <div className="mt-4 max-h-64 overflow-y-auto border border-outline-variant/20">
            {customersLoading && customers.length === 0 ? (
              <p className="p-4 text-on-surface-variant">Loading accounts...</p>
            ) : filteredCustomers.length === 0 ? (
              <p className="p-4 text-on-surface-variant">
                No customer accounts match this filter.
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant/20">
                {filteredCustomers.map((customer) => {
                  const status = vaultStatusForUser(customer.userId, rows);
                  const isSelected =
                    selectedCustomer?.userId === customer.userId;
                  return (
                    <li key={customer.userId}>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(customer)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-high ${
                          isSelected ? "bg-surface-container-high" : ""
                        }`}
                      >
                        <span className="font-body-md text-on-surface">
                          {customer.email}
                        </span>
                        <span
                          className={`shrink-0 font-label-sm uppercase ${
                            status === "active"
                              ? "text-secondary"
                              : status === "revoked"
                                ? "text-on-surface-variant"
                                : "text-on-surface-variant/70"
                          }`}
                        >
                          {status === "active"
                            ? "Active key"
                            : status === "revoked"
                              ? "Revoked"
                              : "No key"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {customersNextToken && (
            <button
              type="button"
              disabled={customersLoading}
              onClick={() =>
                void loadCustomers({
                  append: true,
                  nextToken: customersNextToken ?? undefined,
                })
              }
              className="mt-2 font-label-sm uppercase text-primary hover:underline disabled:opacity-50"
            >
              {customersLoading ? "Loading..." : "Load more accounts"}
            </button>
          )}

          {selectedCustomer && (
            <p className="mt-3 font-label-sm text-secondary">
              Selected: {selectedCustomer.email}
            </p>
          )}
          <button
            type="button"
            disabled={saving || !selectedCustomer}
            onClick={() => void handleGrantAccess()}
            className="mt-4 bg-primary px-6 py-2 font-label-md uppercase text-on-primary disabled:opacity-50"
          >
            {saving ? "Saving..." : "Grant vault access"}
          </button>
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
                    <p className="text-body-md text-on-surface">{row.userEmail}</p>
                    <p className="font-label-sm text-on-surface-variant">
                      {row.active ? "Active permission" : "Revoked"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.active ? (
                      <button
                        type="button"
                        disabled={saving}
                        className="font-label-sm uppercase text-error hover:underline"
                        onClick={() => void handleRevoke(row.accessKey)}
                      >
                        Revoke
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={saving}
                        className="font-label-sm uppercase text-primary hover:underline"
                        onClick={() => void handleReEnable(row.accessKey, row.userId)}
                      >
                        Re-enable
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
