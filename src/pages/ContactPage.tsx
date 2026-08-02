import { Link } from "react-router-dom";
import {
  BUSINESS_ADDRESS_LINES,
  BUSINESS_LEGAL_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
} from "@/lib/config";
import { Icon } from "@/components/Icon";

export function ContactPage() {
  return (
    <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
      <div className="mx-auto max-w-container-max">
        <h1 className="font-display-lg text-headline-lg uppercase tracking-tighter text-primary">
          Contact
        </h1>
        <p className="mt-3 max-w-2xl font-body-lg text-on-surface-variant">
          Reach Emperium Forgeworks for order help, print requests, returns, or
          studio questions. We respond during business hours (Eastern Time).
        </p>

        <section className="mt-stack-lg border border-outline-variant/20 bg-surface-container-low p-stack-lg iron-bevel md:p-margin-desktop">
          <h2 className="font-headline-md text-headline-md uppercase text-on-surface">
            {BUSINESS_LEGAL_NAME}
          </h2>

          <dl className="mt-6 space-y-6">
            <div>
              <dt className="font-label-sm uppercase text-on-surface-variant">
                Business address
              </dt>
              <dd className="mt-1 font-body-md text-on-surface">
                <address className="not-italic">
                  {BUSINESS_ADDRESS_LINES.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                  <div>United States</div>
                </address>
              </dd>
            </div>

            <div>
              <dt className="font-label-sm uppercase text-on-surface-variant">
                Phone
              </dt>
              <dd className="mt-1">
                <a
                  href={`tel:${CONTACT_PHONE_TEL}`}
                  className="inline-flex items-center gap-2 font-body-md text-primary hover:underline"
                >
                  <Icon name="call" className="text-xl" />
                  {CONTACT_PHONE_DISPLAY}
                </a>
              </dd>
            </div>

            <div>
              <dt className="font-label-sm uppercase text-on-surface-variant">
                Email
              </dt>
              <dd className="mt-1">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex items-center gap-2 font-body-md text-primary hover:underline"
                >
                  <Icon name="alternate_email" className="text-xl" />
                  {CONTACT_EMAIL}
                </a>
              </dd>
            </div>
          </dl>

          <p className="mt-8 text-body-sm text-on-surface-variant">
            For returns, see{" "}
            <Link to="/shipping-returns" className="text-primary hover:underline">
              Shipping &amp; Returns
            </Link>
            . Include your order number when you contact us.
          </p>
        </section>
      </div>
    </main>
  );
}
