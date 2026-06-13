import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CONTACT_EMAIL, SITE_DOMAIN } from "@/lib/config";
import { useSiteLayout } from "@/context/AnnouncementContext";

const linkClassName =
  "text-on-surface underline-offset-4 transition-colors hover:text-primary hover:underline decoration-primary/50";

const LAST_UPDATED = "June 13, 2026";

const SECTIONS: { heading: string; body: ReactNode }[] = [
  {
    heading: "Agreement",
    body: (
      <>
        These Forge Terms (&ldquo;Terms&rdquo;) govern your use of {SITE_DOMAIN}{" "}
        and your purchase of products from Emperium Forgeworks (&ldquo;we,&rdquo;
        &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By accessing our site, creating
        an account, or placing an order, you agree to these Terms. If you do not
        agree, please do not use the site.
      </>
    ),
  },
  {
    heading: "Products & made-to-order work",
    body: (
      <>
        We sell resin miniatures, terrain, and related collectibles. Many items
        are produced to order after purchase. Product images and descriptions are
        for reference; minor variation in resin color, texture, or support
        marks is normal for 3D-printed goods. We reserve the right to limit
        quantities, refuse orders, or correct pricing errors.
      </>
    ),
  },
  {
    heading: "Orders & payment",
    body: (
      <>
        When you place an order, you offer to buy the items in your cart at the
        prices shown. An order is confirmed when we accept it and payment is
        successfully processed through our payment provider. You are responsible
        for providing accurate shipping and contact information. We may cancel an
        order if payment fails, items are unavailable, or we suspect fraud or
        unauthorized activity.
      </>
    ),
  },
  {
    heading: "Pricing & promotions",
    body: (
      <>
        Prices are listed in U.S. dollars unless stated otherwise. Taxes and
        shipping are calculated at checkout where applicable. Promotional offers
        and discounts are subject to their stated terms, eligibility rules, and
        expiration dates. We may modify or withdraw promotions at any time.
      </>
    ),
  },
  {
    heading: "Shipping, returns & refunds",
    body: (
      <>
        Fulfillment timelines, carriers, return eligibility, and refund handling
        are described on our{" "}
        <Link to="/shipping-returns" className={linkClassName}>
          Shipping &amp; Returns
        </Link>{" "}
        page, which is incorporated into these Terms by reference.
      </>
    ),
  },
  {
    heading: "Accounts",
    body: (
      <>
        If you create an account, you are responsible for keeping your login
        credentials confidential and for activity under your account. Notify us
        promptly if you believe your account has been compromised. We may suspend
        or terminate accounts that violate these Terms or are used abusively.
      </>
    ),
  },
  {
    heading: "Intellectual property",
    body: (
      <>
        Site content, branding, product photography, and original materials are
        owned by Emperium Forgeworks or our licensors. Licensed sculpts and
        third-party designs remain the property of their respective rights
        holders. Purchased physical products are for personal use unless we
        expressly agree otherwise in writing. You may not reproduce, cast, scan,
        or commercially exploit our products or site content without permission.
      </>
    ),
  },
  {
    heading: "Prohibited use",
    body: (
      <>
        You may not use the site to violate law, infringe others&rsquo; rights,
        interfere with site operation, attempt unauthorized access to our
        systems, scrape data without permission, or resell products in a manner
        that violates applicable licenses or these Terms.
      </>
    ),
  },
  {
    heading: "Disclaimer of warranties",
    body: (
      <>
        Products and the site are provided on an &ldquo;as is&rdquo; and
        &ldquo;as available&rdquo; basis to the fullest extent permitted by law.
        We disclaim warranties not required by law, including implied warranties
        of merchantability and fitness for a particular purpose.
      </>
    ),
  },
  {
    heading: "Limitation of liability",
    body: (
      <>
        To the fullest extent permitted by law, Emperium Forgeworks will not be
        liable for indirect, incidental, special, consequential, or punitive
        damages arising from your use of the site or purchase of products. Our
        total liability for any claim related to an order will not exceed the
        amount you paid for that order.
      </>
    ),
  },
  {
    heading: "Changes",
    body: (
      <>
        We may update these Terms from time to time. The &ldquo;Last
        updated&rdquo; date above reflects the current version. Continued use of
        the site after changes are posted constitutes acceptance of the revised
        Terms.
      </>
    ),
  },
  {
    heading: "Governing law",
    body: (
      <>
        These Terms are governed by the laws of the State of Florida, without
        regard to conflict-of-law rules, except where mandatory consumer
        protections in your jurisdiction apply.
      </>
    ),
  },
  {
    heading: "Contact",
    body: (
      <>
        Questions about these Terms? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>
          {CONTACT_EMAIL}
        </a>
        .
      </>
    ),
  },
];

export function ForgeTermsPage() {
  const { mainTopPadding } = useSiteLayout();
  return (
    <main className={`pb-section-gap ${mainTopPadding}`}>
      <section className="border-b border-outline-variant/10 bg-surface-container-lowest">
        <div className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
          <div className="max-w-2xl space-y-stack-md">
            <span className="font-label-sm uppercase tracking-[0.35em] text-primary">
              Legal
            </span>
            <h1 className="font-display-lg text-display-lg uppercase tracking-tighter text-on-surface">
              Forge Terms
            </h1>
            <p className="font-body-lg text-on-surface-variant">
              The terms and conditions for using our store and purchasing from
              Emperium Forgeworks.
            </p>
            <p className="font-label-sm uppercase tracking-widest text-on-surface-variant/80">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <article className="mx-auto max-w-3xl border border-outline-variant/10 bg-surface-container-low p-stack-lg inner-bevel md:p-margin-desktop">
          <ul className="space-y-stack-lg">
            {SECTIONS.map((section) => (
              <li key={section.heading}>
                <h2 className="mb-2 font-headline-md text-on-surface">
                  {section.heading}
                </h2>
                <p className="font-body-md leading-relaxed text-on-surface-variant">
                  {section.body}
                </p>
              </li>
            ))}
          </ul>
        </article>

        <p className="mt-stack-lg text-center">
          <Link
            to="/shop"
            className="font-body-md text-on-surface-variant underline-offset-4 transition-colors hover:text-on-surface hover:underline decoration-primary/50"
          >
            ← Back to the shop
          </Link>
        </p>
      </section>
    </main>
  );
}
