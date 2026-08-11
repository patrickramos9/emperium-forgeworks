import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteLayout } from "@/context/AnnouncementContext";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import { hasGalleryEntryModel } from "@/lib/dataModels";
import { useProducts } from "@/hooks/useProducts";
import {
  formatGalleryReceivedDate,
  listActiveGalleryEntries,
  type GalleryEntryRecord,
} from "@/services/galleryService";

export function GalleryPage() {
  const { mainTopPadding } = useSiteLayout();
  const { products } = useProducts("public");
  const [entries, setEntries] = useState<GalleryEntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const titleBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) {
      map.set(product.slug, product.title);
    }
    return map;
  }, [products]);

  useEffect(() => {
    async function load() {
      const client = await getGuestDataClient();
      if (!client || !hasGalleryEntryModel(client)) {
        setLoading(false);
        return;
      }
      try {
        setEntries(await listActiveGalleryEntries(client));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load gallery.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <main
      className={`mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop ${mainTopPadding}`}
    >
      <div className="mb-stack-lg flex flex-wrap items-end justify-between gap-4 border-b-2 border-primary pb-2">
        <div>
          <h1 className="font-display-lg text-headline-lg uppercase tracking-tighter text-on-surface">
            Gallery
          </h1>
          <p className="mt-2 max-w-2xl font-body-md text-on-surface-variant">
            Customer-painted forgework — real pieces in the wild, linked back to
            the catalog models they started from.
          </p>
        </div>
        <Link
          to="/shop"
          className="font-label-md uppercase tracking-widest text-primary hover:text-plasma-glow"
        >
          Enter the Lair
        </Link>
      </div>

      {loading && (
        <p className="text-on-surface-variant">Loading gallery…</p>
      )}
      {error && <p className="text-error">{error}</p>}
      {!loading && !error && entries.length === 0 && (
        <p className="text-on-surface-variant">
          Gallery photos will appear here as we post customer work. Check back
          soon — or{" "}
          <Link to="/shop" className="text-primary hover:underline">
            browse the shop
          </Link>
          .
        </p>
      )}

      <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => {
          const productTitle =
            titleBySlug.get(entry.productSlug) ?? entry.productSlug;
          const artistLabel = entry.artistUrl ? (
            <a
              href={entry.artistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {entry.artistName}
            </a>
          ) : (
            <span className="text-on-surface">{entry.artistName}</span>
          );

          return (
            <li key={entry.id}>
              <figure className="overflow-hidden border border-outline-variant/20 bg-surface-container-low">
                {entry.imageUrl ? (
                  <img
                    src={entry.imageUrl}
                    alt={`Painted by ${entry.artistName}`}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-surface-container-high text-body-sm text-on-surface-variant">
                    Image unavailable
                  </div>
                )}
                <figcaption className="space-y-1 p-4">
                  <p className="font-label-md text-on-surface">{artistLabel}</p>
                  <p className="text-body-sm text-on-surface-variant">
                    <Link
                      to={`/shop/${entry.productSlug}`}
                      className="text-primary hover:underline"
                    >
                      {productTitle}
                    </Link>
                  </p>
                  <p className="font-label-sm uppercase tracking-wide text-on-surface-variant/70">
                    Received {formatGalleryReceivedDate(entry.receivedAt)}
                  </p>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
