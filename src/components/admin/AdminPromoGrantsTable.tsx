import { Link } from "react-router-dom";
import { formatPrice } from "@/data/seedProducts";
import type { CustomerLabel } from "@/lib/customerAdmin";
import {
  formatGrantIssuedAt,
  formatGrantSourceLabel,
  getGrantStatus,
  type PromoGrantRecord,
  type PromoTemplateRecord,
} from "@/lib/promoGrants";

function templateDiscountLabel(template: PromoTemplateRecord): string {
  if (template.kind === "percent") {
    return `${template.percent ?? 0}% off`;
  }
  return `${formatPrice(template.amountCents ?? 0)} off`;
}

function statusLabel(status: ReturnType<typeof getGrantStatus>): string {
  switch (status) {
    case "open":
      return "Open";
    case "redeemed":
      return "Redeemed";
    case "revoked":
      return "Revoked";
    case "expired":
      return "Expired";
  }
}

type AdminPromoGrantsTableProps = {
  grants: PromoGrantRecord[];
  templateById: Map<string, PromoTemplateRecord>;
  customerLabels: Map<string, CustomerLabel>;
  onRevoke?: (grantId: string) => void;
  emptyMessage?: string;
};

export function AdminPromoGrantsTable({
  grants,
  templateById,
  customerLabels,
  onRevoke,
  emptyMessage = "No grants issued yet.",
}: AdminPromoGrantsTableProps) {
  if (!grants.length) {
    return <p className="text-body-sm text-on-surface-variant">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant/20 font-label-sm uppercase text-on-surface-variant">
            <th className="p-3">Issued</th>
            <th className="p-3">Source</th>
            <th className="p-3">Offer</th>
            <th className="p-3">Recipient</th>
            <th className="p-3">Status</th>
            {onRevoke && <th className="p-3" />}
          </tr>
        </thead>
        <tbody>
          {grants.map((grant) => {
            const template = templateById.get(grant.templateId);
            const label = customerLabels.get(grant.userId);
            const status = getGrantStatus(grant);

            return (
              <tr
                key={grant.id}
                className="border-t border-outline-variant/10"
              >
                <td className="p-3 text-on-surface-variant">
                  {formatGrantIssuedAt(grant.createdAt)}
                </td>
                <td className="p-3 text-on-surface">
                  {formatGrantSourceLabel(grant.source)}
                </td>
                <td className="p-3">
                  {template ? (
                    <div>
                      <Link
                        to={`/admin/promos/${template.id}`}
                        className="text-primary hover:underline"
                      >
                        {template.name}
                      </Link>
                      <p className="text-label-sm text-on-surface-variant">
                        {templateDiscountLabel(template)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-on-surface-variant">Unknown template</span>
                  )}
                </td>
                <td className="p-3">
                  <p className="text-on-surface">
                    {label?.email ?? "Unknown customer"}
                  </p>
                  {label?.displayName &&
                    label.displayName.toLowerCase() !==
                      label.email.toLowerCase() && (
                      <p className="text-label-sm text-on-surface-variant">
                        {label.displayName}
                      </p>
                    )}
                </td>
                <td className="p-3 text-on-surface-variant">
                  {statusLabel(status)}
                </td>
                {onRevoke && (
                  <td className="p-3">
                    {status === "open" && (
                      <button
                        type="button"
                        onClick={() => onRevoke(grant.id)}
                        className="font-label-sm uppercase text-error hover:underline"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
