import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageFeedback } from "@/components/PageFeedback";
import { ResinColorSwatches } from "@/components/ResinColorSwatches";
import { hasCustomerSession } from "@/lib/customerAuth";
import {
  formatPrintServiceMaxFileSize,
  isPrintServiceUploadFile,
  parsePrintPolicyMarkdown,
  PRINT_SERVICE_FILE_ACCEPT,
  PRINT_SERVICE_FILE_HINT,
  type PrintServiceConfigData,
} from "@/lib/printService";
import {
  newPrintUploadId,
  uploadPrintServiceStl,
} from "@/lib/printServiceUpload";
import { requireCustomerSession } from "@/lib/amplifyDataClient";
import { fetchPrintServiceConfig } from "@/services/printServiceConfigService";
import { submitPrintRequest } from "@/services/printRequestService";
import { useToast } from "@/context/ToastContext";

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
    if (!signedIn) {
      navigate("/account/login?redirect=/print");
      return;
    }
    if (!policyAccepted) {
      setError("Please accept the print policy to continue.");
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
      const client = await requireCustomerSession(navigate, "/print");
      if (!client) return;

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

      {!signedIn && (
        <PageFeedback tone="info" className="mt-6">
          <Link
            to="/account/login?redirect=/print"
            className="text-primary hover:underline"
          >
            Sign in
          </Link>{" "}
          to submit a print request.
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
            disabled={submitting || !signedIn}
            className="molten-glow mt-6 w-full bg-primary px-6 py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit print request"}
          </button>

          <p className="mt-3 text-body-sm text-on-surface-variant">
            After we review, you’ll get a quote in{" "}
            <Link
              to="/account/print-requests"
              className="text-primary hover:underline"
            >
              Account → Print requests
            </Link>
            .
          </p>
        </section>
      </form>
    </div>
  );
}
