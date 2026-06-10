import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminPromoGrantsTable } from "@/components/admin/AdminPromoGrantsTable";
import { formatPrice } from "@/data/seedProducts";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import { resolveCustomerLabelsForUserIds } from "@/lib/customerAdmin";
import { hasPromoGrantModel, hasPromoTemplateModel } from "@/lib/dataModels";
import { listAllPromoGrants } from "@/services/promoGrantService";
import { listAllPromoTemplates } from "@/services/promoTemplateService";

export function AdminPromoTemplatesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof listAllPromoTemplates>>
  >([]);
  const [grants, setGrants] = useState<
    Awaited<ReturnType<typeof listAllPromoGrants>>
  >([]);
  const [customerLabels, setCustomerLabels] = useState<
    Awaited<ReturnType<typeof resolveCustomerLabelsForUserIds>>
  >(new Map());

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
    if (!hasPromoTemplateModel(client)) {
      setError(
        "Promo API is not deployed. Push backend changes and redeploy Amplify.",
      );
      setLoading(false);
      return;
    }
    try {
      const [templates, allGrants] = await Promise.all([
        listAllPromoTemplates(client),
        hasPromoGrantModel(client) ? listAllPromoGrants(client) : Promise.resolve([]),
      ]);
      setRows(templates);
      setGrants(allGrants);
      const userIds = [...new Set(allGrants.map((grant) => grant.userId))];
      setCustomerLabels(
        userIds.length
          ? await resolveCustomerLabelsForUserIds(client, userIds)
          : new Map(),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
    setLoading(false);
  }, [navigate]);

  const templateById = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-headline-lg uppercase text-primary">
            Promo templates
          </h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Grants are issued per customer and auto-applied at checkout when signed
            in.
          </p>
          <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
            <strong className="text-on-surface">Grant sources:</strong> admin issue,
            thank-you (paid order), favorite (PDP save), abandoned cart (idle cart +
            return). One active template per source flag. Email recovery (M6d) comes
            with marketing (M13).
          </p>
        </div>
        <Link
          to="/admin/promos/new"
          className="bg-primary px-4 py-2 font-label-md uppercase text-on-primary"
        >
          New template
        </Link>
      </div>

      {error && <p className="mt-4 text-error">{error}</p>}

      {loading ? (
        <p className="mt-4 text-on-surface-variant">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-on-surface-variant">
          No promo templates yet. Create one for thank-you offers or admin-assigned
          grants.
        </p>
      ) : (
        <ul className="mt-stack-lg divide-y divide-outline-variant/20 border border-outline-variant/20">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div>
                <Link
                  to={`/admin/promos/${row.id}`}
                  className="font-headline-md text-on-surface hover:text-primary"
                >
                  {row.name}
                </Link>
                <p className="font-label-sm text-on-surface-variant">
                  {row.kind === "percent"
                    ? `${row.percent}% off subtotal`
                    : `${formatPrice(row.amountCents ?? 0)} off subtotal`}
                  {row.useForThankYou ? " · Thank-you template" : ""}
                  {row.active ? " · Active" : " · Inactive"}
                  {row.defaultExpiresInDays
                    ? ` · Grants expire in ${row.defaultExpiresInDays} days`
                    : " · Grants do not expire"}
                </p>
              </div>
              <Link
                to={`/admin/promos/${row.id}`}
                className="font-label-sm uppercase text-primary hover:underline"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
        <h2 className="font-headline-md uppercase text-on-surface">
          Issued grants
        </h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          All customer offers issued from templates — admin, thank-you, favorite,
          and abandoned cart.
        </p>
        {loading ? (
          <p className="mt-4 text-on-surface-variant">Loading grants...</p>
        ) : (
          <div className="mt-4">
            <AdminPromoGrantsTable
              grants={grants}
              templateById={templateById}
              customerLabels={customerLabels}
              emptyMessage="No grants issued yet. Favorite, abandoned-cart, and thank-you grants appear here after the backend rules fire."
            />
          </div>
        )}
      </section>
    </div>
  );
}
