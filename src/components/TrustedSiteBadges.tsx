import { useEffect, useRef } from "react";
import { TRUSTED_SITE_FOOTER_BADGES } from "@/lib/config";

function mountTrustmarks(container: HTMLElement) {
  container.replaceChildren();

  for (const badge of TRUSTED_SITE_FOOTER_BADGES) {
    const mark = document.createElement("div");
    mark.className = "trustedsite-trustmark";
    mark.dataset.type = String(badge.type);
    mark.dataset.width = String(badge.width);
    mark.dataset.height = String(badge.height);
    container.appendChild(mark);
  }
}

/** Inline TrustedSite trustmarks — requires main script in index.html / TrustedSiteScript. */
export function TrustedSiteBadges() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || TRUSTED_SITE_FOOTER_BADGES.length === 0) return;

    mountTrustmarks(container);

    // Main script may load after React paints; re-mount so data-rescan picks them up.
    const timers = [500, 1500, 3000].map((ms) =>
      window.setTimeout(() => mountTrustmarks(container), ms),
    );

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  if (TRUSTED_SITE_FOOTER_BADGES.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="flex min-h-[50px] flex-wrap items-center justify-center gap-4 md:justify-start"
      aria-label="Site security certifications"
    />
  );
}
