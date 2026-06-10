import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { hasPromoTemplateModel } from "@/lib/dataModels";
import {
  fetchCustomerAccounts,
  resolveCustomerLabelsForUserIds,
  type CustomerLabel,
} from "@/lib/customerAdmin";
import {
  createPromoTemplate,
  deletePromoTemplate,
  getPromoTemplateById,
  grantCountsForTemplate,
  updatePromoTemplate,
} from "@/services/promoTemplateService";
import { AdminPromoGrantsTable } from "@/components/admin/AdminPromoGrantsTable";
import type { PromoTemplateRecord } from "@/lib/promoGrants";
import { issuePromoGrant, revokePromoGrant } from "@/services/promoGrantService";
import { listAllPromoGrants } from "@/services/promoGrantService";

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

export function AdminPromoTemplateEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [name, setName] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [percent, setPercent] = useState("10");
  const [amountDollars, setAmountDollars] = useState("5.00");
  const [active, setActive] = useState(true);
  const [useForThankYou, setUseForThankYou] = useState(false);
  const [useForFavorite, setUseForFavorite] = useState(false);
  const [useForAbandonedCart, setUseForAbandonedCart] = useState(false);
  const [abandonAfterHours, setAbandonAfterHours] = useState("24");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [grantEmail, setGrantEmail] = useState("");
  const [issuingGrant, setIssuingGrant] = useState(false);
  const [grants, setGrants] = useState<
    Awaited<ReturnType<typeof listAllPromoGrants>>
  >([]);
  const [customerLabels, setCustomerLabels] = useState<
    Map<string, CustomerLabel>
  >(new Map());
  const [loadedTemplate, setLoadedTemplate] = useState<PromoTemplateRecord | null>(
    null,
  );

  const templateById = useMemo(() => {
    if (!loadedTemplate) return new Map<string, PromoTemplateRecord | null>();
    return new Map([[loadedTemplate.id, loadedTemplate]]);
  }, [loadedTemplate]);

  useEffect(() => {
    async function load() {
      if (isNew) {
        setLoading(false);
        return;
      }
      const client = await requireAdminSession(navigate);
      if (!client || !hasPromoTemplateModel(client)) {
        setError("Promo API is not deployed.");
        setLoading(false);
        return;
      }
      try {
        const row = await getPromoTemplateById(client, id ?? "");
        if (!row) {
          navigate("/admin/promos");
          return;
        }
        setName(row.name);
        setLoadedTemplate(row);
        setKind(row.kind === "fixed" ? "fixed" : "percent");
        setPercent(row.percent != null ? String(row.percent) : "10");
        setAmountDollars(
          row.amountCents != null
            ? (row.amountCents / 100).toFixed(2)
            : "5.00",
        );
        setActive(row.active ?? true);
        setUseForThankYou(row.useForThankYou ?? false);
        setUseForFavorite(row.useForFavorite ?? false);
        setUseForAbandonedCart(row.useForAbandonedCart ?? false);
        setAbandonAfterHours(
          row.abandonAfterHours != null ? String(row.abandonAfterHours) : "24",
        );
        setExpiresInDays(
          row.defaultExpiresInDays != null
            ? String(row.defaultExpiresInDays)
            : "",
        );
        const allGrants = await listAllPromoGrants(client);
        const templateGrants = allGrants.filter((g) => g.templateId === row.id);
        setGrants(templateGrants);
        const userIds = [...new Set(templateGrants.map((g) => g.userId))];
        if (userIds.length) {
          setCustomerLabels(
            await resolveCustomerLabelsForUserIds(client, userIds),
          );
        } else {
          setCustomerLabels(new Map());
        }
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

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      setSaving(false);
      return;
    }

    const days = expiresInDays.trim()
      ? Number.parseInt(expiresInDays, 10)
      : undefined;

    const abandonHours = abandonAfterHours.trim()
      ? Number.parseInt(abandonAfterHours, 10)
      : 24;

    const input = {
      name: trimmedName,
      kind,
      percent:
        kind === "percent" ? Number.parseInt(percent, 10) || 0 : undefined,
      amountCents:
        kind === "fixed"
          ? Math.round(Number.parseFloat(amountDollars) * 100) || 0
          : undefined,
      active,
      useForThankYou,
      useForFavorite,
      useForAbandonedCart,
      abandonAfterHours:
        useForAbandonedCart && Number.isFinite(abandonHours) && abandonHours > 0
          ? abandonHours
          : undefined,
      defaultExpiresInDays:
        days != null && Number.isFinite(days) && days > 0 ? days : undefined,
    };

    try {
      if (isNew) {
        const created = await createPromoTemplate(client, input);
        navigate(`/admin/promos/${created.id}`);
      } else {
        await updatePromoTemplate(client, id ?? "", input);
        navigate("/admin/promos");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleIssueGrant(e: FormEvent) {
    e.preventDefault();
    if (isNew || !id) return;
    setIssuingGrant(true);
    setError(null);

    const client = await requireAdminSession(navigate);
    if (!client) {
      setIssuingGrant(false);
      return;
    }

    try {
      const { items } = await fetchCustomerAccounts(client, {
        emailFilter: grantEmail.trim(),
        limit: 5,
      });
      const match = items.find(
        (row) =>
          row.email.toLowerCase() === grantEmail.trim().toLowerCase(),
      );
      if (!match) {
        throw new Error("No customer found with that email.");
      }

      const grant = await issuePromoGrant(client, {
        templateId: id,
        userId: match.userId,
        source: "admin",
      });
      setGrants((current) => [grant, ...current]);
      setCustomerLabels((current) => {
        const next = new Map(current);
        next.set(match.userId, {
          email: match.email,
          displayName: match.email,
        });
        return next;
      });
      setGrantEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue grant");
    } finally {
      setIssuingGrant(false);
    }
  }

  async function handleRevokeGrant(grantId: string) {
    if (!window.confirm("Revoke this grant for the customer?")) return;
    const client = await requireAdminSession(navigate);
    if (!client) return;
    try {
      await revokePromoGrant(client, grantId);
      setGrants((rows) =>
        rows.map((row) =>
          row.id === grantId
            ? { ...row, revokedAt: new Date().toISOString() }
            : row,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    }
  }

  async function handleDelete() {
    if (isNew || !id) return;
    const client = await requireAdminSession(navigate);
    if (!client) return;

    const { total, open } = await grantCountsForTemplate(client, id);
    let message = "Delete this promo template?";
    if (open > 0) {
      setError(
        `Cannot delete: ${open} open grant${open === 1 ? "" : "s"} still reference this template. Revoke them in Issued grants first.`,
      );
      return;
    }
    if (total > 0) {
      message = `Delete this template? ${total} historical grant${total === 1 ? "" : "s"} will show as "Deleted template" in Issued grants.`;
    }
    if (!window.confirm(message)) return;

    try {
      await deletePromoTemplate(client, id);
      navigate("/admin/promos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) {
    return <p className="text-on-surface-variant">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/admin/promos"
        className="font-label-sm uppercase text-primary hover:underline"
      >
        ← Promo templates
      </Link>

      <h1 className="mt-4 font-display-lg text-headline-lg uppercase text-primary">
        {isNew ? "New promo template" : "Edit promo template"}
      </h1>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-stack-lg space-y-4 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel"
      >
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
            required
          />
        </Field>

        <Field label="Discount type">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "percent" | "fixed")}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
          >
            <option value="percent">Percent off subtotal</option>
            <option value="fixed">Fixed amount off subtotal</option>
          </select>
        </Field>

        {kind === "percent" ? (
          <Field label="Percent off">
            <input
              type="number"
              min="1"
              max="100"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
            />
          </Field>
        ) : (
          <Field label="Amount off (USD)">
            <input
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
            />
          </Field>
        )}

        <Field label="Grant expiry (days after issue, optional)">
          <input
            type="number"
            min="1"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            placeholder="Blank = no expiry"
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
          />
        </Field>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span className="font-label-sm text-on-surface">Active (new grants)</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useForThankYou}
            onChange={(e) => setUseForThankYou(e.target.checked)}
          />
          <span className="font-label-sm text-on-surface">
            Use for thank-you grants after paid orders
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useForFavorite}
            onChange={(e) => setUseForFavorite(e.target.checked)}
          />
          <span className="font-label-sm text-on-surface">
            Use for favorite-item grants (first save + after purchase if still
            favorited)
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useForAbandonedCart}
            onChange={(e) => setUseForAbandonedCart(e.target.checked)}
          />
          <span className="font-label-sm text-on-surface">
            Use for abandoned-cart grants (in-system on return)
          </span>
        </label>

        {useForAbandonedCart && (
          <Field label="Cart idle hours before offer">
            <input
              type="number"
              min="1"
              value={abandonAfterHours}
              onChange={(e) => setAbandonAfterHours(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2"
            />
          </Field>
        )}

        {error && <p className="text-error">{error}</p>}

        <div className="flex flex-wrap gap-3">
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
              onClick={() => void handleDelete()}
              className="border border-error/50 px-4 py-2 font-label-sm uppercase text-error"
            >
              Delete
            </button>
          )}
        </div>
      </form>

      {!isNew && id && (
        <section className="mt-stack-lg space-y-4 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
          <h2 className="font-headline-md uppercase text-on-surface">
            Issue grant to customer
          </h2>
          <form onSubmit={(e) => void handleIssueGrant(e)} className="flex gap-2">
            <input
              type="email"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              placeholder="customer@email.com"
              className="min-w-0 flex-1 border border-outline-variant/30 bg-surface-container px-3 py-2"
              required
            />
            <button
              type="submit"
              disabled={issuingGrant}
              className="bg-primary px-4 py-2 font-label-sm uppercase text-on-primary disabled:opacity-50"
            >
              Issue
            </button>
          </form>

          <div className="mt-4">
            <h3 className="font-label-sm uppercase text-on-surface-variant">
              Grants for this template
            </h3>
            <AdminPromoGrantsTable
              grants={grants}
              templateById={templateById}
              customerLabels={customerLabels}
              onRevoke={(grantId) => void handleRevokeGrant(grantId)}
              emptyMessage="No grants issued from this template yet."
            />
          </div>
        </section>
      )}
    </div>
  );
}
