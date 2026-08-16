import { useEffect } from "react";
import type { Product } from "@/data/seedProducts";
import type { CatalogMode } from "@/lib/catalogFilter";
import { SITE_URL } from "@/lib/config";
import {
  buildProductJsonLd,
  shouldEmitProductJsonLd,
} from "@/lib/productJsonLd";

const SCRIPT_ID = "emperium-product-jsonld";

/** Injects Product JSON-LD on public PDPs. Skips vault and print-service rows. */
export function ProductJsonLd({
  product,
  catalogMode = "public",
}: {
  product: Product;
  catalogMode?: CatalogMode;
}) {
  useEffect(() => {
    document.getElementById(SCRIPT_ID)?.remove();
    if (!shouldEmitProductJsonLd(product, catalogMode)) {
      return;
    }

    const origin = (
      typeof window !== "undefined" ? window.location.origin : SITE_URL
    ).replace(/\/$/, "");

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "application/ld+json";
    script.text = JSON.stringify(buildProductJsonLd(product, origin)).replace(
      /</g,
      "\\u003c",
    );
    document.head.appendChild(script);

    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, [product, catalogMode]);

  return null;
}
