import { useCallback, useEffect, useState } from "react";
import type { AmplifyDataClient } from "@/lib/amplifyDataClient";
import {
  fetchCustomerAccounts,
  type CustomerAccount,
} from "@/lib/customerAdmin";
import {
  assignSculptorEditor,
  type SculptorRecord,
} from "@/services/sculptorService";

type AdminSculptorPartnerAccessProps = {
  client: AmplifyDataClient;
  sculptor: Pick<SculptorRecord, "slug" | "editorUserId">;
  onUpdated: (editorUserId: string | null | undefined) => void;
  disabled?: boolean;
};

export function AdminSculptorPartnerAccess({
  client,
  sculptor,
  onUpdated,
  disabled = false,
}: AdminSculptorPartnerAccessProps) {
  const [emailSearch, setEmailSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersNextToken, setCustomersNextToken] = useState<string | null>(
    null,
  );
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(
    null,
  );
  const [assigneeEmail, setAssigneeEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(
    async (options: { append?: boolean; nextToken?: string } = {}) => {
      setCustomersLoading(true);
      setError(null);
      try {
        const result = await fetchCustomerAccounts(client, {
          emailFilter: emailSearch,
          nextToken: options.nextToken,
          limit: 25,
        });
        setCustomers((current) =>
          options.append ? [...current, ...result.items] : result.items,
        );
        setCustomersNextToken(result.nextToken ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load accounts");
      } finally {
        setCustomersLoading(false);
      }
    },
    [client, emailSearch],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  useEffect(() => {
    let cancelled = false;
    async function resolveAssigneeEmail() {
      if (!sculptor.editorUserId) {
        setAssigneeEmail(null);
        return;
      }
      try {
        let nextToken: string | undefined;
        do {
          const result = await fetchCustomerAccounts(client, {
            nextToken,
            limit: 50,
          });
          const match = result.items.find(
            (row) => row.userId === sculptor.editorUserId,
          );
          if (match) {
            if (!cancelled) setAssigneeEmail(match.email);
            return;
          }
          nextToken = result.nextToken ?? undefined;
        } while (nextToken);
        if (!cancelled) setAssigneeEmail(null);
      } catch {
        if (!cancelled) setAssigneeEmail(null);
      }
    }
    void resolveAssigneeEmail();
    return () => {
      cancelled = true;
    };
  }, [client, sculptor.editorUserId]);

  async function handleAssign() {
    if (!selectedCustomer) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await assignSculptorEditor(
        client,
        sculptor.slug,
        selectedCustomer.userId,
      );
      onUpdated(updated.editorUserId);
      setAssigneeEmail(selectedCustomer.email);
      setSelectedCustomer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke() {
    if (!window.confirm("Revoke partner edit access for this sculptor?")) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await assignSculptorEditor(client, sculptor.slug, null);
      onUpdated(updated.editorUserId);
      setAssigneeEmail(null);
      setSelectedCustomer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
      <h2 className="font-headline-md text-on-surface">Partner access</h2>
      <p className="mt-2 text-body-sm text-on-surface-variant">
        Grant a customer account permission to edit this sculptor profile at{" "}
        <code className="text-on-surface">/partner/sculptor</code>.
      </p>

      {sculptor.editorUserId ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-outline-variant/20 bg-surface-container-high p-3">
          <p className="font-body-md text-on-surface">
            Editor assigned
            {assigneeEmail ? `: ${assigneeEmail}` : " (account lookup pending)"}
          </p>
          <button
            type="button"
            disabled={disabled || saving}
            onClick={() => void handleRevoke()}
            className="border border-error px-4 py-2 font-label-sm uppercase text-error disabled:opacity-50"
          >
            Revoke access
          </button>
        </div>
      ) : (
        <p className="mt-4 font-label-sm text-on-surface-variant">
          No partner editor assigned.
        </p>
      )}

      <label className="mt-4 block">
        <span className="font-label-sm uppercase text-on-surface-variant">
          Search customer by email
        </span>
        <input
          type="search"
          value={emailSearch}
          onChange={(e) => setEmailSearch(e.target.value)}
          placeholder="Filter customer accounts..."
          disabled={disabled || saving}
          className="mt-1 w-full border border-outline-variant/30 bg-surface-container-high px-3 py-2"
        />
      </label>

      <div className="mt-3 max-h-48 overflow-y-auto border border-outline-variant/20">
        {customersLoading && customers.length === 0 ? (
          <p className="p-4 text-on-surface-variant">Loading accounts...</p>
        ) : customers.length === 0 ? (
          <p className="p-4 text-on-surface-variant">No matching accounts.</p>
        ) : (
          <ul className="divide-y divide-outline-variant/20">
            {customers.map((customer) => {
              const isSelected = selectedCustomer?.userId === customer.userId;
              const isCurrent = sculptor.editorUserId === customer.userId;
              return (
                <li key={customer.userId}>
                  <button
                    type="button"
                    disabled={disabled || saving || isCurrent}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60 ${
                      isSelected ? "bg-surface-container-high" : ""
                    }`}
                  >
                    <span className="font-body-md text-on-surface">{customer.email}</span>
                    {isCurrent && (
                      <span className="font-label-sm uppercase text-secondary">
                        Current
                      </span>
                    )}
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
          disabled={customersLoading || disabled || saving}
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
        disabled={disabled || saving || !selectedCustomer}
        onClick={() => void handleAssign()}
        className="mt-4 bg-primary px-4 py-2 font-label-md uppercase text-on-primary disabled:opacity-50"
      >
        {saving ? "Saving..." : "Grant partner access"}
      </button>

      {error && <p className="mt-3 text-error">{error}</p>}
    </section>
  );
}
