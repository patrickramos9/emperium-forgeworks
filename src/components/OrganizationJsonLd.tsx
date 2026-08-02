import { useEffect } from "react";
import {
  BUSINESS_ADDRESS,
  BUSINESS_LEGAL_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE_TEL,
  SITE_URL,
} from "@/lib/config";

/** Organization JSON-LD for Merchant Center / Google business identity matching. */
export function OrganizationJsonLd() {
  useEffect(() => {
    const id = "emperium-organization-jsonld";
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const origin = (typeof window !== "undefined"
      ? window.location.origin
      : SITE_URL
    ).replace(/\/$/, "");

    const data = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: BUSINESS_LEGAL_NAME,
      url: origin,
      logo: `${origin}/favicon.svg`,
      email: CONTACT_EMAIL,
      telephone: CONTACT_PHONE_TEL,
      address: {
        "@type": "PostalAddress",
        streetAddress: BUSINESS_ADDRESS.streetAddress,
        addressLocality: BUSINESS_ADDRESS.addressLocality,
        addressRegion: BUSINESS_ADDRESS.addressRegion,
        postalCode: BUSINESS_ADDRESS.postalCode,
        addressCountry: BUSINESS_ADDRESS.addressCountry,
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: CONTACT_EMAIL,
        telephone: CONTACT_PHONE_TEL,
        areaServed: "US",
        availableLanguage: "English",
      },
    };

    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.text = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);

  return null;
}
