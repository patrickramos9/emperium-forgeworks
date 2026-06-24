import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CONTACT_EMAIL } from "@/lib/config";
import { useSiteLayout } from "@/context/AnnouncementContext";

const linkClassName =
  "text-on-surface underline-offset-4 transition-colors hover:text-primary hover:underline decoration-primary/50";

const SECTIONS: {
  title: string;
  items: { heading: string; body: ReactNode }[];
}[] = [
  {
    title: "Shipping",
    items: [
      {
        heading: "Carrier & service",
        body: "Orders ship via USPS Ground. Delivery times depend on your location and USPS transit schedules.",
      },
      {
        heading: "Processing & dispatch",
        body: "We usually ship the same day we receive your order. Orders placed after 6:00 PM Eastern are processed on the next business day.",
      },
      {
        heading: "Tracking",
        body: "When your order ships, you will receive tracking information by email if one was provided at checkout.",
      },
      {
        heading: "Cancellations before shipment",
        body: "Signed-in customers may cancel any paid order that has not shipped yet from Account → Order details. A full refund is issued automatically to your original payment method. Once an order has shipped, self-service cancellation is no longer available—use the return process instead.",
      },
    ],
  },
  {
    title: "Returns & refunds",
    items: [
      {
        heading: "Eligibility",
        body: "Returns and refunds are accepted only on new products—whether defective or non-defective—within 30 days of delivery. The return window begins on the date your order is delivered. Contact us before sending anything back so we can confirm eligibility and provide return instructions.",
      },
      {
        heading: "Return shipping",
        body: "The buyer is responsible for return shipping costs.",
      },
      {
        heading: "Fees",
        body: "There are no restocking fees or any other additional charges on approved returns.",
      },
      {
        heading: "Refund processing",
        body: "Once we receive your returned product at our location, allow up to 2 days for us to process your refund to the original payment method.",
      },
      {
        heading: "Questions",
        body: (
          <>
            For shipping, return, or refund questions, reach out to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>
              {CONTACT_EMAIL}
            </a>{" "}
            and include your order number.
          </>
        ),
      },
    ],
  },
];

export function ShippingReturnsPage() {
  const { mainTopPadding } = useSiteLayout();
  return (
    <main className={`pb-section-gap ${mainTopPadding}`}>
      <section className="border-b border-outline-variant/10 bg-surface-container-lowest">
        <div className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
          <div className="max-w-2xl space-y-stack-md">
            <span className="font-label-sm uppercase tracking-[0.35em] text-primary">
              Fulfillment
            </span>
            <h1 className="font-display-lg text-display-lg uppercase tracking-tighter text-on-surface">
              Shipping &amp; Returns
            </h1>
            <p className="font-body-lg text-on-surface-variant">
              How we pack, ship, and stand behind every artifact that leaves the
              forge.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
          {SECTIONS.map((section) => (
            <article
              key={section.title}
              className="border border-outline-variant/10 bg-surface-container-low p-stack-lg inner-bevel"
            >
              <h2 className="mb-stack-lg border-l-4 border-primary pl-4 font-display-lg text-headline-md uppercase text-primary">
                {section.title}
              </h2>
              <ul className="space-y-stack-lg">
                {section.items.map((item) => (
                  <li key={item.heading}>
                    <h3 className="mb-2 font-headline-md text-on-surface">
                      {item.heading}
                    </h3>
                    <p className="font-body-md leading-relaxed text-on-surface-variant">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-section-gap border border-outline-variant/20 bg-surface-container-high p-stack-lg inner-bevel md:p-margin-desktop">
          <h2 className="mb-stack-md font-headline-md text-on-surface">
            Need help?
          </h2>
          <p className="mb-stack-md max-w-2xl font-body-md text-on-surface-variant">
            Email us with your order number and we will get back to you as soon
            as we can.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 bg-primary px-6 py-3 font-label-md uppercase tracking-wider text-on-primary transition-colors hover:bg-primary-container hover:text-on-primary-container"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

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
