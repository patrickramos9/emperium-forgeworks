import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatPrice } from "@/data/seedProducts";
import {
  getCustomerDataClient,
  getGuestDataClient,
} from "@/lib/amplifyDataClient";
import { getCustomerUserId, hasCustomerSession } from "@/lib/customerAuth";
import {
  formatPrintFigureLinesSummary,
  printRequestStatusLabel,
  type PrintRequestRecord,
} from "@/lib/printRequest";
import {
  createPrintQuoteCheckout,
  getPrintRequestById,
  listGuestPrintRequests,
} from "@/services/printRequestService";
import { ensureGuestSession } from "@/services/guestSessionService";

export function AccountPrintRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const [row, setRow] = useState<PrintRequestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!id) {
        navigate("/account/print-requests");
        return;
      }
      try {
        const session = await hasCustomerSession();
        setSignedIn(session);
        if (session) {
          const client = await getCustomerDataClient();
          if (!client) {
            navigate(
              `/account/login?returnTo=${encodeURIComponent(`/account/print-requests/${id}`)}`,
              { replace: true },
            );
            return;
          }
          const userId = await getCustomerUserId();
          const request = await getPrintRequestById(client, id);
          if (!request || request.userId !== userId) {
            navigate("/account/print-requests");
            return;
          }
          setRow(request);
        } else {
          await ensureGuestSession();
          const client = await getGuestDataClient();
          if (!client?.queries.getGuestPrintRequests) {
            throw new Error(
              "Guest print requests are not available yet. Redeploy the Amplify backend.",
            );
          }
          const rows = await listGuestPrintRequests(client, id);
          const request = rows[0] ?? null;
          if (!request) {
            navigate("/account/print-requests");
            return;
          }
          setRow(request);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load request.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  async function handlePay() {
    if (!id || !row) return;
    setPaying(true);
    setError(null);
    try {
      if (signedIn) {
        const client = await getCustomerDataClient();
        if (!client) return;
        const { redirectUrl } = await createPrintQuoteCheckout(client, id);
        window.location.assign(redirectUrl);
      } else {
        await ensureGuestSession();
        const client = await getGuestDataClient();
        if (!client) return;
        const { redirectUrl } = await createPrintQuoteCheckout(client, id, {
          asGuest: true,
        });
        window.location.assign(redirectUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-container-max px-margin-mobile pt-32 md:px-margin-desktop">
        <p className="text-on-surface-variant">Loading…</p>
      </main>
    );
  }

  if (!row) return null;

  return (
    <main className="mx-auto max-w-container-max min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
      <Link
        to="/account/print-requests"
        className="font-label-sm uppercase text-on-surface-variant hover:text-primary"
      >
        ← Print requests
      </Link>

      <h1 className="mt-4 font-display-lg text-headline-lg uppercase text-primary">
        Print request
      </h1>
      <p className="mt-2 text-on-surface-variant">
        {printRequestStatusLabel(row.status)}
      </p>

      {!signedIn && (
        <p className="mt-2 text-label-sm text-on-surface-variant">
          Guest request
          {row.email ? ` · ${row.email}` : ""}. When a quote is ready, check{" "}
          <Link to="/account/notifications" className="text-primary underline">
            Notifications
          </Link>{" "}
          (same browser).
        </p>
      )}

      <dl className="mt-stack-lg space-y-3 border border-outline-variant/20 bg-surface-container-low p-4 iron-bevel">
        <div>
          <dt className="font-label-sm uppercase text-on-surface-variant">File</dt>
          <dd className="text-on-surface">{row.originalFileName}</dd>
        </div>
        <div>
          <dt className="font-label-sm uppercase text-on-surface-variant">Resin</dt>
          <dd className="text-on-surface">
            {row.resinTypeLabel} · {row.resinColorLabel}
          </dd>
        </div>
        {row.customerNotes && (
          <div>
            <dt className="font-label-sm uppercase text-on-surface-variant">
              Your notes
            </dt>
            <dd className="text-on-surface">{row.customerNotes}</dd>
          </div>
        )}
        {row.figureLines?.length ? (
          <div>
            <dt className="font-label-sm uppercase text-on-surface-variant">
              Quote breakdown
            </dt>
            <dd className="text-on-surface">
              {formatPrintFigureLinesSummary(row.figureLines)}
              <ul className="mt-2 space-y-1 text-body-sm text-on-surface-variant">
                {row.figureLines.map((line) => (
                  <li key={`${line.sizeTierId}-${line.quantity}`}>
                    {line.quantity}× {line.sizeLabel} @{" "}
                    {formatPrice(line.unitPriceCents)} ={" "}
                    {formatPrice(line.unitPriceCents * line.quantity)}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
        {row.quoteCents != null && (
          <div>
            <dt className="font-label-sm uppercase text-on-surface-variant">
              Quote total
            </dt>
            <dd className="text-on-surface">
              {formatPrice(row.quoteCents)} before shipping &amp; tax
            </dd>
          </div>
        )}
        {row.adminNotes && (
          <div>
            <dt className="font-label-sm uppercase text-on-surface-variant">
              Shop notes
            </dt>
            <dd className="text-on-surface">{row.adminNotes}</dd>
          </div>
        )}
        {row.orderId && signedIn && (
          <div>
            <dt className="font-label-sm uppercase text-on-surface-variant">Order</dt>
            <dd>
              <Link
                to={`/account/orders/${row.orderId}`}
                className="text-primary hover:underline"
              >
                View order
              </Link>
            </dd>
          </div>
        )}
      </dl>

      {row.status === "submitted" || row.status === "in_review" ? (
        <p className="mt-6 text-body-sm text-on-surface-variant">
          We’re reviewing your file. Check back here when a quote is ready
          {signedIn
            ? " (we’ll also notify your account inbox)"
            : " — we’ll also post to Notifications on this device"}
          .
        </p>
      ) : null}

      {row.status === "quoted" && (
        <div className="mt-6">
          <button
            type="button"
            disabled={paying}
            onClick={() => void handlePay()}
            className="molten-glow bg-primary px-6 py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
          >
            {paying ? "Redirecting…" : "Pay quote"}
          </button>
        </div>
      )}

      {row.status === "declined" && (
        <p className="mt-6 text-body-sm text-error">
          This request was declined
          {row.adminNotes ? `: ${row.adminNotes}` : "."}
        </p>
      )}

      {error && <p className="mt-4 text-error">{error}</p>}
    </main>
  );
}
