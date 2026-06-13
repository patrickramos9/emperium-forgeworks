import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CONTACT_EMAIL, SITE_DOMAIN } from "@/lib/config";
import { useSiteLayout } from "@/context/AnnouncementContext";

const linkClassName =
  "text-on-surface underline-offset-4 transition-colors hover:text-primary hover:underline decoration-primary/50";

const LAST_UPDATED = "June 13, 2026";

const SECTIONS: { heading: string; body: ReactNode }[] = [
  {
    heading: "Overview",
    body: (
      <>
        Emperium Forgeworks (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
        &ldquo;our&rdquo;) operates {SITE_DOMAIN} and related services. This
        Privacy Policy explains what personal information we collect, how we use
        it, and the choices you have. By using our site or placing an order, you
        agree to this policy.
      </>
    ),
  },
  {
    heading: "Information we collect",
    body: (
      <>
        We may collect: account details you provide (such as name and email when
        you register or sign in); order and checkout information (items
        purchased, shipping address, phone number, and payment status);
        communications you send us; product reviews and favorites you submit;
        and technical data such as browser type, device information, and pages
        visited. Payment card numbers are processed by Stripe and are not stored
        on our servers.
      </>
    ),
  },
  {
    heading: "How we use your information",
    body: (
      <>
        We use personal information to operate the store, fulfill and ship
        orders, provide customer support, send order-related communications,
        manage accounts and promotions you opt into, improve our site, and
        comply with legal obligations. We do not sell your personal information.
      </>
    ),
  },
  {
    heading: "Cookies & local storage",
    body: (
      <>
        We use cookies and similar technologies where needed for site
        functionality, including keeping items in your cart and maintaining your
        sign-in session. Analytics tools described below may also use cookies or
        comparable technologies. You can control cookies through your browser
        settings, though some features may not work correctly if cookies are
        disabled.
      </>
    ),
  },
  {
    heading: "Third-party services",
    body: (
      <>
        We rely on trusted service providers to run the store, including Stripe
        for payments, Amazon Web Services for hosting and data storage, Google
        Analytics for site usage statistics, and TrustedSite for trust and
        security badges. These providers process data according to their own
        privacy policies and only as needed to provide their services to us.
      </>
    ),
  },
  {
    heading: "Data retention",
    body: (
      <>
        We keep personal information for as long as needed to fulfill orders,
        maintain your account, resolve disputes, and meet legal, tax, and
        accounting requirements. You may request deletion of your account
        information by contacting us, subject to records we must retain by law
        or for legitimate business purposes.
      </>
    ),
  },
  {
    heading: "Your choices & rights",
    body: (
      <>
        You may update account details by signing in, opt out of non-essential
        marketing emails if we send them, and contact us to request access,
        correction, or deletion of your personal information where applicable
        law provides those rights. If you are in a region with additional privacy
        rights (such as certain U.S. state laws), contact us and we will respond
        as required by applicable law.
      </>
    ),
  },
  {
    heading: "Children's privacy",
    body: (
      <>
        Our site is not directed to children under 13, and we do not knowingly
        collect personal information from children. If you believe a child has
        provided us personal information, contact us and we will take appropriate
        steps to delete it.
      </>
    ),
  },
  {
    heading: "Security",
    body: (
      <>
        We use reasonable administrative, technical, and physical safeguards to
        protect personal information. No method of transmission or storage is
        completely secure, and we cannot guarantee absolute security.
      </>
    ),
  },
  {
    heading: "Changes to this policy",
    body: (
      <>
        We may update this Privacy Policy from time to time. The &ldquo;Last
        updated&rdquo; date at the top of this page will reflect the latest
        revision. Continued use of the site after changes are posted constitutes
        acceptance of the updated policy.
      </>
    ),
  },
  {
    heading: "Contact us",
    body: (
      <>
        Questions about this Privacy Policy or our data practices? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>
          {CONTACT_EMAIL}
        </a>
        .
      </>
    ),
  },
];

export function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>
            <p className="font-body-lg text-on-surface-variant">
              How Emperium Forgeworks collects, uses, and protects your
              information.
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
