import { useEffect } from "react";
import type { Product } from "@/data/seedProducts";
import type { CatalogMode } from "@/lib/catalogFilter";
import { SITE_URL } from "@/lib/config";
import { trackMetaPageView } from "@/lib/metaPixel";
import {
  buildProductJsonLd,
  buildProductOpenGraph,
  shouldEmitProductJsonLd,
} from "@/lib/productJsonLd";

const SCRIPT_ID = "emperium-product-jsonld";
const OG_ATTR = "data-emperium-product-og";

function siteOrigin(): string {
  return (
    typeof window !== "undefined" ? window.location.origin : SITE_URL
  ).replace(/\/$/, "");
}

function removeProductOpenGraph() {
  document.head
    .querySelectorAll(`meta[${OG_ATTR}]`)
    .forEach((node) => node.remove());
}

function applyProductOpenGraph(tags: Record<string, string>) {
  removeProductOpenGraph();
  for (const [property, content] of Object.entries(tags)) {
    const meta = document.createElement("meta");
    meta.setAttribute("property", property);
    meta.setAttribute("content", content);
    meta.setAttribute(OG_ATTR, "1");
    document.head.appendChild(meta);
  }
}

/** JSON-LD + Open Graph product tags for Google and Meta pixel catalog ingest. */
export function ProductJsonLd({
  product,
  catalogMode = "public",
}: {
  product: Product;
  catalogMode?: CatalogMode;
}) {
  useEffect(() => {
    document.getElementById(SCRIPT_ID)?.remove();
    removeProductOpenGraph();
    if (!shouldEmitProductJsonLd(product, catalogMode)) {
      return;
    }

    const origin = siteOrigin();

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "application/ld+json";
    script.text = JSON.stringify(buildProductJsonLd(product, origin)).replace(
      /</g,
      "\\u003c",
    );
    document.head.appendChild(script);
    applyProductOpenGraph(buildProductOpenGraph(product, origin));
    trackMetaPageView();

    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
      removeProductOpenGraph();
    };
  }, [product, catalogMode]);

  return null;
}
