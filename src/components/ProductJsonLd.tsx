import { useLayoutEffect, useRef } from "react";
import type { Product } from "@/data/seedProducts";
import type { CatalogMode } from "@/lib/catalogFilter";
import { trackMetaPageView } from "@/lib/metaPixel";
import {
  buildProductJsonLd,
  buildProductOpenGraph,
  productMetaDescription,
  shouldEmitProductJsonLd,
} from "@/lib/productJsonLd";
import {
  applyCanonical,
  applyDocumentTitle,
  applyMetaDescription,
  applyRobots,
  canonicalOrigin,
  productDocumentTitle,
  trimMetaDescription,
  upsertJsonLd,
} from "@/lib/siteSeo";

const SCRIPT_ID = "emperium-product-jsonld";
const BREADCRUMB_ID = "emperium-breadcrumb-jsonld";
const OG_ATTR = "data-emperium-product-og";

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

/**
 * JSON-LD, Open Graph, title, and canonical for a public PDP.
 * Meta PageView fires once per product, after those tags are in the head.
 * A second set of product tags is not written.
 */
export function ProductJsonLd({
  product,
  catalogMode = "public",
  reviewRating = null,
  reviewCount = 0,
}: {
  product: Product;
  catalogMode?: CatalogMode;
  /** Average of the approved reviews shown on this page. Omit admin-only display ratings. */
  reviewRating?: number | null;
  reviewCount?: number;
}) {
  const viewedSlug = useRef<string | null>(null);

  useLayoutEffect(() => {
    document.getElementById(SCRIPT_ID)?.remove();
    removeProductOpenGraph();
    upsertJsonLd(BREADCRUMB_ID, null);

    if (!shouldEmitProductJsonLd(product, catalogMode)) {
      return;
    }

    const origin = canonicalOrigin();
    const url = `${origin}/shop/${product.slug}`;
    const description = trimMetaDescription(productMetaDescription(product));

    applyDocumentTitle(productDocumentTitle(product.title, product.category));
    applyMetaDescription(description);
    applyCanonical(`/shop/${product.slug}`);
    applyRobots("index, follow");

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "application/ld+json";
    script.text = JSON.stringify(
      buildProductJsonLd(
        product,
        origin,
        reviewCount > 0 && reviewRating != null
          ? { ratingValue: reviewRating, reviewCount }
          : null,
      ),
    ).replace(/</g, "\\u003c");
    document.head.appendChild(script);
    applyProductOpenGraph(buildProductOpenGraph(product, origin));
    upsertJsonLd(BREADCRUMB_ID, {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${origin}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Shop",
          item: `${origin}/shop`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: product.title,
          item: url,
        },
      ],
    });

    if (viewedSlug.current !== product.slug) {
      viewedSlug.current = product.slug;
      trackMetaPageView();
    }

    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
      removeProductOpenGraph();
      upsertJsonLd(BREADCRUMB_ID, null);
    };
  }, [product, catalogMode, reviewRating, reviewCount]);

  return null;
}
