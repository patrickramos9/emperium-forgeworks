import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatPrice } from "@/data/seedProducts";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { hasShippingProfileModel } from "@/lib/dataModels";
import {
  formatCountryCodes,
  parseCountryCodes,
  parseWeightTiers,
  SHIPPING_PROFILE_KIND_LABELS,
  type ShippingProfileKind,
  type WeightTier,
} from "@/lib/shippingProfiles";
import {
  createShippingProfile,
  deleteShippingProfile,
  getShippingProfileById,
  updateShippingProfile,
} from "@/services/shippingProfileService";

function dollarsToCents(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function centsToDollars(cents: number | null | undefined): string {
  if (cents == null) return "0";
  return (cents / 100).toFixed(2);
}

export function AdminShippingProfileEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<ShippingProfileKind>("flat");
  const [amountDollars, setAmountDollars] = useState("8.99");
  const [additionalDollars, setAdditionalDollars] = useState("2.00");
  const [freeThresholdDollars, setFreeThresholdDollars] = useState("100.00");
  const [allowedCountries, setAllowedCountries] = useState("US");
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [weightTiers, setWeightTiers] = useState<WeightTier[]>([
    { maxWeightOz: 16, amountCents: 899 },
  ]);
  const [minReadyToShipDays, setMinReadyToShipDays] = useState("");
  const [maxReadyToShipDays, setMaxReadyToShipDays] = useState("");
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
      if (!hasShippingProfileModel(client)) {
        setError("Shipping profiles API is not deployed.");
        setLoading(false);
        return;
      }
      try {
        const row = await getShippingProfileById(client, id ?? "");
        if (!row) {
          navigate("/admin/shipping");
          return;
        }
        setName(row.name);
        setDescription(row.description ?? "");
        setKind(
          row.kind === "free_over_threshold"
            ? "free_over_threshold"
            : row.kind === "weight_tier"
              ? "weight_tier"
              : "flat",
        );
        setAmountDollars(centsToDollars(row.amountCents));
        setAdditionalDollars(centsToDollars(row.additionalItemCents));
        setFreeThresholdDollars(centsToDollars(row.freeThresholdCents));
        setAllowedCountries(formatCountryCodes(row.allowedCountries));
        setActive(row.active ?? true);
        setWeightTiers(parseWeightTiers(row.weightTiers));
        setSortOrder(row.sortOrder ?? 0);
        setMinReadyToShipDays(
          row.minReadyToShipDays != null ? String(row.minReadyToShipDays) : "",
        );
        setMaxReadyToShipDays(
          row.maxReadyToShipDays != null ? String(row.maxReadyToShipDays) : "",
        );
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
    if (!hasShippingProfileModel(client)) {
      setError("Shipping profiles API is not deployed.");
      setSaving(false);
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      setSaving(false);
      return;
    }

    const countries = parseCountryCodes(allowedCountries);
    if (!countries.length) {
      setError("Enter at least one two-letter country code (e.g. US).");
      setSaving(false);
      return;
    }

    const amountCents = dollarsToCents(amountDollars);
    const additionalItemCents = dollarsToCents(additionalDollars);
    const freeThresholdCents =
      kind === "free_over_threshold"
        ? dollarsToCents(freeThresholdDollars)
        : undefined;
    const minReady = minReadyToShipDays.trim()
      ? Number.parseInt(minReadyToShipDays, 10)
      : undefined;
    const maxReady = maxReadyToShipDays.trim()
      ? Number.parseInt(maxReadyToShipDays, 10)
      : undefined;

    if (
      (minReady != null && (!Number.isFinite(minReady) || minReady < 1)) ||
      (maxReady != null && (!Number.isFinite(maxReady) || maxReady < 1))
    ) {
      setError("Ready to ship days must be positive whole numbers.");
      setSaving(false);
      return;
    }
    if (
      minReady != null &&
      maxReady != null &&
      Number.isFinite(minReady) &&
      Number.isFinite(maxReady) &&
      maxReady < minReady
    ) {
      setError("Max ready to ship must be greater than or equal to min.");
      setSaving(false);
      return;
    }

    if (kind === "weight_tier" && !weightTiers.length) {
      setError("Add at least one weight tier.");
      setSaving(false);
      return;
    }

    const input = {
      name: trimmedName,
      description: description.trim() || undefined,
      kind,
      amountCents: kind === "weight_tier" ? 0 : amountCents,
      additionalItemCents: kind === "weight_tier" ? 0 : additionalItemCents,
      freeThresholdCents,
      weightTiers: kind === "weight_tier" ? weightTiers : undefined,
      allowedCountries: countries,
      active,
      isDefault: false,
      sortOrder,
      minReadyToShipDays: Number.isFinite(minReady) ? minReady : undefined,
      maxReadyToShipDays: Number.isFinite(maxReady) ? maxReady : undefined,
    };

    try {
      if (isNew) {
        await createShippingProfile(client, input);
      } else {
        await updateShippingProfile(client, id ?? "", input);
      }
      navigate("/admin/shipping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew || !id) return;
    if (!window.confirm("Delete this shipping profile?")) return;

    setSaving(true);
    setError(null);
    const client = await requireAdminSession(navigate);
    if (!client) {
      setSaving(false);
      return;
    }
    try {
      await deleteShippingProfile(client, id);
      navigate("/admin/shipping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-on-surface-variant">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/admin/shipping"
        className="font-label-sm uppercase text-primary hover:underline"
      >
        ← Shipping
      </Link>

      <h1 className="mt-4 font-display-lg text-headline-lg uppercase text-primary">
        {isNew ? "New shipping profile" : "Edit shipping profile"}
      </h1>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-stack-lg space-y-4 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
      >
        <Field label="Name (shown on Stripe checkout)">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
            placeholder="Standard shipping"
            required
          />
        </Field>

        <Field label="Description (internal note, optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
          />
        </Field>

        <Field label="Rate type">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ShippingProfileKind)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
          >
            {Object.entries(SHIPPING_PROFILE_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Shipping amount (USD)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)}
            disabled={kind === "weight_tier"}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2 disabled:opacity-50"
          />
          {kind !== "weight_tier" && (
            <p className="mt-1 text-label-sm text-on-surface-variant">
              Preview: {formatPrice(dollarsToCents(amountDollars))}
            </p>
          )}
        </Field>

        <Field label="Additional item amount (USD)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={additionalDollars}
            onChange={(e) => setAdditionalDollars(e.target.value)}
            disabled={kind === "weight_tier"}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2 disabled:opacity-50"
          />
        </Field>

        {kind === "weight_tier" && (
          <div className="space-y-2">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Weight tiers (oz → USD)
            </span>
            {weightTiers.map((tier, index) => (
              <div key={index} className="flex flex-wrap items-end gap-2">
                <label className="text-label-sm text-on-surface-variant">
                  Up to (oz)
                  <input
                    type="number"
                    min="1"
                    value={tier.maxWeightOz}
                    onChange={(e) => {
                      const next = [...weightTiers];
                      next[index] = {
                        ...tier,
                        maxWeightOz: Number.parseInt(e.target.value, 10) || 0,
                      };
                      setWeightTiers(next);
                    }}
                    className="mt-1 block w-28 border border-outline-variant/30 bg-surface-container px-2 py-1"
                  />
                </label>
                <label className="text-label-sm text-on-surface-variant">
                  Rate ($)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(tier.amountCents / 100).toFixed(2)}
                    onChange={(e) => {
                      const next = [...weightTiers];
                      next[index] = {
                        ...tier,
                        amountCents: dollarsToCents(e.target.value),
                      };
                      setWeightTiers(next);
                    }}
                    className="mt-1 block w-28 border border-outline-variant/30 bg-surface-container px-2 py-1"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setWeightTiers(weightTiers.filter((_, i) => i !== index))
                  }
                  className="px-2 py-1 text-label-sm text-error"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setWeightTiers([
                  ...weightTiers,
                  {
                    maxWeightOz:
                      (weightTiers[weightTiers.length - 1]?.maxWeightOz ?? 0) +
                      16,
                    amountCents: 0,
                  },
                ])
              }
              className="font-label-sm uppercase text-primary"
            >
              + Add tier
            </button>
          </div>
        )}

        {kind === "free_over_threshold" && (
          <Field label="Free shipping when subtotal is at least (USD)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={freeThresholdDollars}
              onChange={(e) => setFreeThresholdDollars(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
            />
          </Field>
        )}

        <Field label="Allowed countries (comma-separated ISO codes)">
          <input
            value={allowedCountries}
            onChange={(e) => setAllowedCountries(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
            placeholder="US, CA"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ready to ship — min days">
            <input
              type="number"
              min="1"
              value={minReadyToShipDays}
              onChange={(e) => setMinReadyToShipDays(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
              placeholder="3"
            />
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Business days until the order ships. Leave blank if not set.
            </p>
          </Field>
          <Field label="Ready to ship — max days">
            <input
              type="number"
              min="1"
              value={maxReadyToShipDays}
              onChange={(e) => setMaxReadyToShipDays(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
              placeholder="5"
            />
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Use a longer window on a separate profile (e.g. large orders).
            </p>
          </Field>
        </div>

        <Field label="Sort order (lower appears first)">
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number.parseInt(e.target.value, 10) || 0)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
          />
        </Field>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span className="font-label-sm uppercase text-on-surface-variant">
            Active
          </span>
        </label>

        {error && <p className="text-error">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="molten-glow bg-primary px-6 py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={saving}
              className="border border-error/40 px-6 py-3 font-label-md uppercase text-error disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-label-sm uppercase text-on-surface-variant">
        {label}
      </span>
      {children}
    </label>
  );
}
