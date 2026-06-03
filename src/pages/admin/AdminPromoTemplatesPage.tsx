import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatPrice } from "@/data/seedProducts";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import { hasPromoTemplateModel } from "@/lib/dataModels";
import { listAllPromoTemplates } from "@/services/promoTemplateService";

export function AdminPromoTemplatesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof listAllPromoTemplates>>
  >([]);

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
      setRows(await listAllPromoTemplates(client));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
    setLoading(false);
  }, [navigate]);

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
            Grants are issued per customer and auto-applied at checkout (M6).
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
    </div>
  );
}
