import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatPrice } from "@/data/seedProducts";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { configureAmplify } from "@/lib/amplify";
import { hasShippingProfileModel } from "@/lib/dataModels";
import {
  formatReadyToShip,
  formatShippingProfileRate,
  parseWeightTiers,
  SHIPPING_PROFILE_KIND_LABELS,
} from "@/lib/shippingProfiles";
import { listAllShippingProfiles } from "@/services/shippingProfileService";

export function AdminShippingProfilesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof listAllShippingProfiles>>
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
    if (!hasShippingProfileModel(client)) {
      setError(
        "Shipping profiles API is not deployed. Push backend changes and redeploy Amplify.",
      );
      setLoading(false);
      return;
    }
    try {
      setRows(await listAllShippingProfiles(client));
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
            Shipping
          </h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Profiles appear as options on Stripe Checkout
          </p>
        </div>
        <Link
          to="/admin/shipping/new"
          className="bg-primary px-4 py-2 font-label-md uppercase text-on-primary"
        >
          New profile
        </Link>
      </div>

      {error && <p className="mt-4 text-error">{error}</p>}

      {loading ? (
        <p className="mt-4 text-on-surface-variant">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-on-surface-variant">
          No shipping profiles yet. Create one to charge for shipping at
          checkout.
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
                  to={`/admin/shipping/${row.id}`}
                  className="font-headline-md text-on-surface hover:text-primary"
                >
                  {row.name}
                </Link>
                <p className="font-label-sm text-on-surface-variant">
                  {SHIPPING_PROFILE_KIND_LABELS[
                    row.kind === "free_over_threshold"
                      ? "free_over_threshold"
                      : row.kind === "weight_tier"
                        ? "weight_tier"
                        : "flat"
                  ]}{" "}
                  ·{" "}
                  {formatShippingProfileRate(
                    row.kind,
                    row.amountCents,
                    row.additionalItemCents,
                    row.freeThresholdCents,
                    formatPrice,
                    parseWeightTiers(row.weightTiers),
                  )}
                  {(() => {
                    const ready = formatReadyToShip(
                      row.minReadyToShipDays,
                      row.maxReadyToShipDays,
                    );
                    return ready ? ` · ${ready}` : "";
                  })()}
                  {row.isDefault ? " · Default" : ""}
                  {row.active ? " · Active" : " · Inactive"}
                </p>
              </div>
              <Link
                to={`/admin/shipping/${row.id}`}
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
