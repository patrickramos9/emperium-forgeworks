import { useLayoutEffect } from "react";
import {
  applyCanonical,
  applyDocumentTitle,
  applyMetaDescription,
  applyPageOpenGraph,
  applyRobots,
  brandTitle,
  canonicalUrl,
  clearPageOpenGraphTags,
  upsertJsonLd,
} from "@/lib/siteSeo";

const PAGE_JSONLD_ID = "emperium-page-jsonld";

/**
 * Title, description, canonical, and Open Graph for public pages that are not product detail.
 * Does not fire Meta PageView. Product pages set their own tags inside ProductJsonLd.
 */
export function PageMeta({
  title,
  description,
  path,
  noindex = false,
  image,
  jsonLd,
}: {
  title: string;
  description: string;
  /** Path beginning with /, including query when that query is the canonical page. */
  path: string;
  noindex?: boolean;
  image?: string;
  jsonLd?: Record<string, unknown> | null;
}) {
  const jsonKey = jsonLd ? JSON.stringify(jsonLd) : "";

  useLayoutEffect(() => {
    const fullTitle = brandTitle(title);
    applyDocumentTitle(fullTitle);
    applyMetaDescription(description);
    applyCanonical(path);
    applyRobots(noindex ? "noindex, follow" : "index, follow");
    const url = canonicalUrl(path);
    const tags: Record<string, string> = {
      "og:type": "website",
      "og:title": fullTitle,
      "og:description": description,
      "og:url": url,
    };
    if (image) tags["og:image"] = image;
    applyPageOpenGraph(tags);
    upsertJsonLd(PAGE_JSONLD_ID, jsonKey ? (JSON.parse(jsonKey) as Record<string, unknown>) : null);

    return () => {
      clearPageOpenGraphTags();
      upsertJsonLd(PAGE_JSONLD_ID, null);
    };
  }, [title, description, path, noindex, image, jsonKey]);

  return null;
}
