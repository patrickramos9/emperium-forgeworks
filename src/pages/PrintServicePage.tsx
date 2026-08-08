import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageFeedback } from "@/components/PageFeedback";
import { ResinColorSwatches } from "@/components/ResinColorSwatches";
import { formatPrice } from "@/data/seedProducts";
import {
  getCustomerDataClient,
  getGuestDataClient,
} from "@/lib/amplifyDataClient";
import { hasCustomerSession } from "@/lib/customerAuth";
import {
  formatPrintServiceMaxFileSize,
  isPrintServiceUploadFile,
  parsePrintPolicyMarkdown,
  PRINT_SERVICE_FILE_ACCEPT,
  PRINT_SERVICE_FILE_HINT,
  type PrintServiceConfigData,
  type PrintServiceResinType,
  type PrintServiceSizeTier,
} from "@/lib/printService";
import {
  newPrintUploadId,
  uploadPrintServiceStl,
} from "@/lib/printServiceUpload";
import { fetchPrintServiceConfig } from "@/services/printServiceConfigService";
import { submitPrintRequest } from "@/services/printRequestService";
import { ensureGuestSession } from "@/services/guestSessionService";
import { useToast } from "@/context/ToastContext";

const PRINT_PROCESS_STEPS = [
  {
    title: "Upload your file",
    body: `Accept the print policy, choose resin type and color, and upload your ${PRINT_SERVICE_FILE_HINT}. Guests leave a contact email; accounts use the signed-in profile.`,
  },
  {
    title: "We review & size",
    body: "We inspect the model, count each figure, and assign size tiers. Complex supports, hollows, or multi-part files may affect the quote.",
  },
  {
    title: "Receive a quote",
    body: "You’ll get a line-item quote under Print requests. Nothing is charged until you accept and pay.",
  },
  {
    title: "Pay & we print",
    body: "Pay the quote when you’re ready. We print, cure, and ship—then update your order with tracking.",
  },
] as const;

function SamplePricing({
  sizeTiers,
  resinTypes,
}: {
  sizeTiers: PrintServiceSizeTier[];
  resinTypes: PrintServiceResinType[];
}) {
  const resinSurcharges = resinTypes.filter(
    (type) => (type.priceDeltaCents ?? 0) !== 0,
  );

  if (!sizeTiers.length) return null;

  return (
    <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-stack-lg iron-bevel">
      <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
        Sample pricing
      </h2>
      <p className="mt-2 max-w-2xl font-body-md text-on-surface-variant">
        Per-figure starting rates by size tier. Your quote is based on how many
        figures we find in your file and which sizes they match—not a flat file
        fee.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left">
          <thead>
            <tr className="border-b border-outline-variant/30">
              <th className="pb-3 font-label-sm uppercase text-on-surface-variant">
                Size tier
              </th>
              <th className="pb-3 text-right font-label-sm uppercase text-on-surface-variant">
                Per figure
              </th>
            </tr>
          </thead>
          <tbody>
            {sizeTiers.map((tier) => (
              <tr
                key={tier.id}
                className="border-b border-outline-variant/15 last:border-0"
              >
                <td className="py-3 font-body-md text-on-surface">
                  {tier.label}
                </td>
                <td className="py-3 text-right font-body-md tabular-nums text-on-surface">
                  {formatPrice(tier.priceCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resinSurcharges.length > 0 && (
        <p className="mt-4 text-body-sm text-on-surface-variant">
          Resin options:{" "}
          {resinSurcharges.map((type, index) => {
            const delta = type.priceDeltaCents ?? 0;
            const signed =
              delta > 0
                ? `+${formatPrice(delta)}`
                : `−${formatPrice(Math.abs(delta))}`;
            return (
              <span key={type.id}>
                {index > 0 ? "; " : ""}
                {type.label} {signed} per figure
              </span>
            );
          })}
          .
        </p>
      )}

      <p className="mt-3 text-body-sm text-on-surface-variant">
        Final total = sum of (size rate ± resin adjustment) × figure count after
        review.
      </p>
    </section>
  );
}

function PrintPolicyContent({ markdown }: { markdown: string }) {
  const blocks = parsePrintPolicyMarkdown(markdown);
  const nodes: ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = () => {
    if (!bulletBuffer.length) return;
    nodes.push(
      <ul
        key={`bullets-${nodes.length}`}
        className="list-disc space-y-2 pl-5 text-body-sm text-on-surface-variant"
      >
        {bulletBuffer.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>,
    );
    bulletBuffer = [];
  };

  for (const block of blocks) {
    if (block.type === "bullet") {
      bulletBuffer.push(block.text);
      continue;
    }

    flushBullets();

    if (block.type === "heading") {
      nodes.push(
        <h3
          key={`heading-${nodes.length}`}
          className={`font-label-sm uppercase text-on-surface ${nodes.length === 0 ? "" : "mt-5"}`}
        >
          {block.text}
        </h3>,
      );
    } else {
      nodes.push(
        <p
          key={`paragraph-${nodes.length}`}
          className="mt-2 text-body-sm text-on-surface-variant"
        >
          {block.text}
        </p>,
      );
    }
  }

  flushBullets();

  return <div className="mt-4 space-y-2">{nodes}</div>;
}

export function PrintServicePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [config, setConfig] = useState<PrintServiceConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [resinTypeId, setResinTypeId] = useState("");
  const [resinColorId, setResinColorId] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [cfg, session] = await Promise.all([
          fetchPrintServiceConfig(),
          hasCustomerSession(),
        ]);
        if (cancelled) return;
        setConfig(cfg);
        setSignedIn(session);
        if (cfg.resinTypes[0]) setResinTypeId(cfg.resinTypes[0].id);
        const firstColor =
          cfg.resinColors.find((color) =>
            color.resinTypeIds?.includes(cfg.resinTypes[0]?.id ?? ""),
          ) ?? cfg.resinColors[0];
        if (firstColor) setResinColorId(firstColor.id);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load print service.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableColors = useMemo(() => {
    if (!config) return [];
    return config.resinColors.filter(
      (color) =>
        !color.resinTypeIds?.length ||
        color.resinTypeIds.includes(resinTypeId),
    );
  }, [config, resinTypeId]);

  useEffect(() => {
    if (!availableColors.length) return;
    if (!availableColors.some((color) => color.id === resinColorId)) {
      setResinColorId(availableColors[0]!.id);
    }
  }, [availableColors, resinColorId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!config?.active) {
      setError("Printing as a Service is not available right now.");
      return;
    }
    if (!policyAccepted) {
      setError("Please accept the print policy to continue.");
      return;
    }
    if (!signedIn && !guestEmail.trim().includes("@")) {
      setError("Enter a contact email so we can reach you about your quote.");
      return;
    }
    if (!file) {
      setError(`Upload a ${PRINT_SERVICE_FILE_HINT} file.`);
      return;
    }
    if (!isPrintServiceUploadFile(file)) {
      setError(`Only ${PRINT_SERVICE_FILE_HINT} files are accepted.`);
      return;
    }
    if (file.size > config.maxFileBytes) {
      setError(
        `File is too large (max ${formatPrintServiceMaxFileSize(config.maxFileBytes)}).`,
      );
      return;
    }

    const resinType = config.resinTypes.find((row) => row.id === resinTypeId);
    const resinColor = config.resinColors.find((row) => row.id === resinColorId);
    if (!resinType || !resinColor) {
      setError("Selected options are no longer available.");
      return;
    }

    setSubmitting(true);
    try {
      if (signedIn) {
        const client = await getCustomerDataClient();
        if (!client) {
          setError("Could not start a customer session. Try signing in again.");
          return;
        }
        const uploadId = newPrintUploadId();
        const storagePath = await uploadPrintServiceStl(uploadId, file);
        const printRequestId = await submitPrintRequest(client, {
          uploadId,
          storagePath,
          originalFileName: file.name,
          resinTypeId: resinType.id,
          resinColorId: resinColor.id,
          customerNotes: customerNotes.trim() || undefined,
        });
        showToast({
          title: "Print request submitted",
          description: "We’ll review your file and send a quote.",
          tone: "success",
        });
        navigate(`/account/print-requests/${printRequestId}`);
      } else {
        await ensureGuestSession();
        const client = await getGuestDataClient();
        if (!client) {
          setError("Could not start a guest session. Reload and try again.");
          return;
        }
        const uploadId = newPrintUploadId();
        const storagePath = await uploadPrintServiceStl(uploadId, file);
        const printRequestId = await submitPrintRequest(client, {
          uploadId,
          storagePath,
          originalFileName: file.name,
          resinTypeId: resinType.id,
          resinColorId: resinColor.id,
          customerNotes: customerNotes.trim() || undefined,
          email: guestEmail.trim(),
          asGuest: true,
        });
        showToast({
          title: "Print request submitted",
          description:
            "We’ll review your file. Check Print requests on this device for your quote.",
          tone: "success",
        });
        navigate(`/account/print-requests/${printRequestId}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit print request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <p className="text-on-surface-variant">Loading print service…</p>
      </div>
    );
  }

  if (!config?.active) {
    return (
      <div className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <h1 className="font-display-lg text-headline-lg uppercase text-on-surface">
          Printing as a Service
        </h1>
        <PageFeedback tone="info" className="mt-6">
          Custom print uploads are not open yet. Check back soon or{" "}
          <Link to="/shop" className="text-primary hover:underline">
            browse the shop
          </Link>
          .
        </PageFeedback>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
      <h1 className="font-display-lg text-headline-lg uppercase text-on-surface">
        Printing as a Service
      </h1>
      <p className="mt-3 max-w-2xl font-body-md text-on-surface-variant">
        Upload your {PRINT_SERVICE_FILE_HINT}. We review the file, count figures by
        size, and send you a quote before anything is charged.
      </p>

      <section className="mt-stack-lg">
        <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
          How it works
        </h2>
        <ol className="mt-6 grid gap-gutter sm:grid-cols-2 lg:grid-cols-4">
          {PRINT_PROCESS_STEPS.map((step, index) => (
            <li key={step.title} className="min-w-0">
              <span className="font-label-sm uppercase text-primary">
                Step {index + 1}
              </span>
              <h3 className="mt-2 font-headline-md text-on-surface">
                {step.title}
              </h3>
              <p className="mt-2 font-body-md text-on-surface-variant">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <SamplePricing
        sizeTiers={config.sizeTiers}
        resinTypes={config.resinTypes}
      />

      {!signedIn && (
        <PageFeedback tone="info" className="mt-6">
          No account needed. Leave a contact email with your upload.{" "}
          <Link
            to="/account/login?redirect=/print"
            className="text-primary hover:underline"
          >
            Sign in
          </Link>{" "}
          anytime to keep requests across devices.
        </PageFeedback>
      )}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-stack-lg grid gap-stack-lg lg:grid-cols-2"
      >
        <section className="border border-outline-variant/20 bg-surface-container-low p-stack-lg iron-bevel">
          <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
            Print policy
          </h2>
          <PrintPolicyContent markdown={config.policyMarkdown} />
          <p className="mt-4 text-body-sm text-on-surface-variant">
            Full terms:{" "}
            <Link to="/forge-terms" className="text-primary hover:underline">
              Forge Terms
            </Link>
            .
          </p>
          <label className="mt-6 flex items-start gap-3">
            <input
              type="checkbox"
              checked={policyAccepted}
              onChange={(e) => setPolicyAccepted(e.target.checked)}
              className="mt-1"
            />
            <span className="text-body-sm text-on-surface">
              I confirm my file meets the requirements above and accept the print
              policy.
            </span>
          </label>
        </section>

        <section className="border border-outline-variant/20 bg-surface-container-low p-stack-lg iron-bevel">
          <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
            Submit your file
          </h2>

          <label className="mt-4 block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Resin type
            </span>
            <select
              value={resinTypeId}
              onChange={(e) => setResinTypeId(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
            >
              {config.resinTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Resin color
            </span>
            <div className="mt-2">
              <ResinColorSwatches
                colors={availableColors}
                value={resinColorId}
                onChange={setResinColorId}
              />
            </div>
          </div>

          {!signedIn && (
            <label className="mt-4 block">
              <span className="font-label-sm uppercase text-on-surface-variant">
                Contact email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
              />
            </label>
          )}

          <label className="mt-4 block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Notes (optional)
            </span>
            <textarea
              rows={3}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="e.g. 3 heroes + 1 monster, preferred scale notes"
              className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
            />
          </label>

          <label className="mt-4 block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              File ({PRINT_SERVICE_FILE_HINT}, max{" "}
              {formatPrintServiceMaxFileSize(config.maxFileBytes)})
            </span>
            <input
              type="file"
              accept={PRINT_SERVICE_FILE_ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-body-sm"
            />
          </label>

          {error && <p className="mt-4 text-error">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="molten-glow mt-6 w-full bg-primary px-6 py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit print request"}
          </button>

          <p className="mt-3 text-body-sm text-on-surface-variant">
            After we review, check{" "}
            <Link
              to="/account/print-requests"
              className="text-primary hover:underline"
            >
              Print requests
            </Link>{" "}
            for your quote
            {signedIn ? "" : " on this device"}.
          </p>
        </section>
      </form>
    </div>
  );
}
