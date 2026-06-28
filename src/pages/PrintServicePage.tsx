import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageFeedback } from "@/components/PageFeedback";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/seedProducts";
import { hasCustomerSession } from "@/lib/customerAuth";
import {
  formatPrintServiceVariantLabel,
  isStlFile,
  resolvePrintServicePriceCents,
  type PrintServiceConfigData,
  type PrintServiceLinePayload,
} from "@/lib/printService";
import {
  newPrintUploadId,
  uploadPrintServiceStl,
} from "@/lib/printServiceUpload";
import {
  fetchPrintServiceConfig,
  resolvePrintCatalogProduct,
} from "@/services/printServiceConfigService";
import { useToast } from "@/context/ToastContext";

function policyBullets(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

export function PrintServicePage() {
  const navigate = useNavigate();
  const { addPrintServiceLine } = useCart();
  const { showToast } = useToast();

  const [config, setConfig] = useState<PrintServiceConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [sizeTierId, setSizeTierId] = useState("");
  const [resinTypeId, setResinTypeId] = useState("");
  const [resinColorId, setResinColorId] = useState("");
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
        if (cfg.sizeTiers[0]) setSizeTierId(cfg.sizeTiers[0].id);
        if (cfg.resinTypes[0]) setResinTypeId(cfg.resinTypes[0].id);
        const firstColor =
          cfg.resinColors.find((color) =>
            color.resinTypeIds?.includes(cfg.resinTypes[0]?.id ?? ""),
          ) ?? cfg.resinColors[0];
        if (firstColor) setResinColorId(firstColor.id);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load print service.");
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

  const priceCents = useMemo(() => {
    if (!config || !sizeTierId || !resinTypeId) return null;
    return resolvePrintServicePriceCents(config, sizeTierId, resinTypeId);
  }, [config, sizeTierId, resinTypeId]);

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
      setError("Upload an .stl file.");
      return;
    }
    if (!isStlFile(file)) {
      setError("Only .stl files are accepted.");
      return;
    }
    if (file.size > config.maxFileBytes) {
      setError(
        `File is too large (max ${Math.round(config.maxFileBytes / 1024 / 1024)} MB).`,
      );
      return;
    }
    if (priceCents == null) {
      setError("Select valid print options.");
      return;
    }

    const sizeTier = config.sizeTiers.find((row) => row.id === sizeTierId);
    const resinType = config.resinTypes.find((row) => row.id === resinTypeId);
    const resinColor = config.resinColors.find((row) => row.id === resinColorId);
    if (!sizeTier || !resinType || !resinColor) {
      setError("Selected options are no longer available.");
      return;
    }

    setSubmitting(true);
    try {
      if (!(await hasCustomerSession())) {
        navigate("/account/login?redirect=/print");
        return;
      }

      const catalogProduct = await resolvePrintCatalogProduct(config);
      if (!catalogProduct) {
        throw new Error(
          `Catalog product "${config.catalogProductSlug}" is missing. Ask admin to create it with a shipping profile.`,
        );
      }

      const uploadId = newPrintUploadId();
      const storagePath = await uploadPrintServiceStl(uploadId, file);

      const printService: PrintServiceLinePayload = {
        uploadId,
        storagePath,
        originalFileName: file.name,
        sizeTierId: sizeTier.id,
        sizeLabel: sizeTier.label,
        resinTypeId: resinType.id,
        resinTypeLabel: resinType.label,
        resinColorId: resinColor.id,
        resinColorLabel: resinColor.label,
      };

      addPrintServiceLine({
        productId: catalogProduct.id,
        slug: catalogProduct.slug,
        title: catalogProduct.title?.trim() || "Printing as a Service",
        priceCents,
        printService,
      });

      showToast({
        title: "Added to cart",
        description: formatPrintServiceVariantLabel(printService),
        tone: "success",
      });
      navigate("/cart");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add print to cart.");
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

  const bullets = policyBullets(config.policyMarkdown);

  return (
    <div className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
      <h1 className="font-display-lg text-headline-lg uppercase text-on-surface">
        Printing as a Service
      </h1>
      <p className="mt-3 max-w-2xl font-body-md text-on-surface-variant">
        Upload your own .stl file, choose size and resin, and checkout like any
        other order. One file per cart line.
      </p>

      {!signedIn && (
        <PageFeedback tone="info" className="mt-6">
          <Link to="/account/login?redirect=/print" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to upload a file and add a print to your cart.
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
          <ul className="mt-4 list-disc space-y-2 pl-5 text-body-sm text-on-surface-variant">
            {bullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
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
              I have rights to print this file and accept the policy above.
            </span>
          </label>
        </section>

        <section className="border border-outline-variant/20 bg-surface-container-low p-stack-lg iron-bevel">
          <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
            Configure your print
          </h2>

          <label className="mt-4 block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Size
            </span>
            <select
              value={sizeTierId}
              onChange={(e) => setSizeTierId(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
            >
              {config.sizeTiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.label} — {formatPrice(tier.priceCents)}
                </option>
              ))}
            </select>
          </label>

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
                  {(type.priceDeltaCents ?? 0) > 0
                    ? ` (+${formatPrice(type.priceDeltaCents ?? 0)})`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Resin color
            </span>
            <select
              value={resinColorId}
              onChange={(e) => setResinColorId(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface px-3 py-2"
            >
              {availableColors.map((color) => (
                <option key={color.id} value={color.id}>
                  {color.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              STL file
            </span>
            <input
              type="file"
              accept=".stl,model/stl"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-body-sm"
            />
            <span className="mt-1 block text-label-sm text-on-surface-variant">
              Max {Math.round(config.maxFileBytes / 1024 / 1024)} MB · .stl only
            </span>
          </label>

          <p className="mt-6 font-label-md text-xl text-primary">
            {priceCents != null ? formatPrice(priceCents) : "—"} before shipping &amp; tax
          </p>

          {error && (
            <PageFeedback tone="error" className="mt-4">
              {error}
            </PageFeedback>
          )}

          <button
            type="submit"
            disabled={submitting || !signedIn}
            className="mt-6 w-full bg-primary px-4 py-3 font-label-md uppercase tracking-widest text-on-primary disabled:opacity-50"
          >
            {submitting ? "Uploading…" : "Add to cart"}
          </button>
        </section>
      </form>
    </div>
  );
}
