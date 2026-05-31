import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { useSiteLayout } from "@/context/AnnouncementContext";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import { hasSculptorModel } from "@/lib/dataModels";
import { RichTextContent } from "@/components/RichTextContent";
import { resolveImageUrl } from "@/lib/productImageUrls";
import {
  getSculptorBySlug,
  type SculptorRecord,
} from "@/services/sculptorService";

type SocialLink = { label: string; href: string };

function socialLinks(sculptor: SculptorRecord): SocialLink[] {
  const links: SocialLink[] = [];
  if (sculptor.myMiniFactoryUrl) {
    links.push({ label: "MyMiniFactory", href: sculptor.myMiniFactoryUrl });
  }
  if (sculptor.patreonUrl) {
    links.push({ label: "Patreon", href: sculptor.patreonUrl });
  }
  if (sculptor.instagramUrl) {
    links.push({ label: "Instagram", href: sculptor.instagramUrl });
  }
  if (sculptor.facebookUrl) {
    links.push({ label: "Facebook", href: sculptor.facebookUrl });
  }
  if (sculptor.xUrl) {
    links.push({ label: "X", href: sculptor.xUrl });
  }
  return links;
}

export function SculptorDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { mainTopPadding } = useSiteLayout();
  const [sculptor, setSculptor] = useState<SculptorRecord | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!slug) {
        setError("Sculptor not found.");
        setLoading(false);
        return;
      }

      const client = await getGuestDataClient();
      if (!client || !hasSculptorModel(client)) {
        setError("Sculptor profiles are not available.");
        setLoading(false);
        return;
      }

      try {
        const row = await getSculptorBySlug(client, slug);
        if (!row || row.active === false) {
          setError("Sculptor not found.");
          setLoading(false);
          return;
        }
        setSculptor(row);
        if (row.logo) {
          setLogoUrl(await resolveImageUrl(row.logo));
        }
        const paths = (row.galleryImages ?? []).filter(
          (path): path is string => Boolean(path),
        );
        if (paths.length > 0) {
          const resolved = await Promise.all(paths.map((path) => resolveImageUrl(path)));
          setGalleryUrls(resolved.filter((url): url is string => Boolean(url)));
        } else {
          setGalleryUrls([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load sculptor");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [slug]);

  if (loading) {
    return (
      <main
        className={`mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop ${mainTopPadding}`}
      >
        <p className="text-on-surface-variant">Loading...</p>
      </main>
    );
  }

  if (error || !sculptor) {
    return (
      <main
        className={`mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop ${mainTopPadding}`}
      >
        <p className="text-error">{error ?? "Sculptor not found."}</p>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          ← Home
        </Link>
      </main>
    );
  }

  const links = socialLinks(sculptor);

  return (
    <main
      className={`mx-auto max-w-container-max px-margin-mobile pb-section-gap md:px-margin-desktop ${mainTopPadding}`}
    >
      <Link
        to="/"
        className="font-label-sm uppercase text-on-surface-variant hover:text-primary"
      >
        ← Home
      </Link>

      <div
        className={`mt-stack-lg grid grid-cols-1 items-start gap-gutter ${
          galleryUrls.length > 0 ? "lg:grid-cols-2" : ""
        }`}
      >
        {galleryUrls.length > 0 && (
          <div>
            <p className="mb-2 font-label-sm uppercase text-on-surface-variant">
              Featured Work
            </p>
            <ProductImageGallery
              images={galleryUrls}
              alt={`${sculptor.name} portfolio`}
              resetKey={sculptor.slug}
            />
          </div>
        )}

        <div className={galleryUrls.length > 0 ? "" : "max-w-2xl"}>
          <p className="font-label-sm uppercase tracking-widest text-secondary">
            Licensed Partner
          </p>
          <div className="mt-2 flex items-center gap-4">
            {logoUrl && (
              <div className="h-16 w-16 shrink-0 overflow-hidden bg-black iron-bevel sm:h-20 sm:w-20">
                <img
                  src={logoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <h1 className="font-display-lg text-headline-lg uppercase text-primary">
              {sculptor.name}
            </h1>
          </div>
          <RichTextContent html={sculptor.description} className="mt-stack-md" />

          {links.length > 0 && (
            <ul className="mt-stack-lg space-y-2">
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-label-md uppercase text-primary hover:text-plasma-glow"
                  >
                    {link.label} →
                  </a>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/shop"
            className="mt-stack-lg inline-block bg-primary px-6 py-3 font-label-md uppercase text-on-primary hover:brightness-110"
          >
            Browse the shop
          </Link>
        </div>
      </div>
    </main>
  );
}
