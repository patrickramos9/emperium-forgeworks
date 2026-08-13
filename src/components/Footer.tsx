import { Link } from "react-router-dom";
import {
  BUSINESS_ADDRESS_LINES,
  BUSINESS_LEGAL_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
} from "@/lib/config";
import { Icon } from "./Icon";
import { TrustedSiteBadges } from "./TrustedSiteBadges";

type FooterLink =
  | { label: string; to: string }
  | { label: string; href: string };

const FOOTER_LINKS: FooterLink[] = [
  { label: "Contact", to: "/contact" },
  { label: "Messages", to: "/account/messages?compose=1" },
  { label: "About", to: "/about" },
  { label: "Gallery", to: "/gallery" },
  { label: "Reviews", to: "/reviews" },
  { label: "Shipping & Returns", to: "/shipping-returns" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Forge Terms", to: "/forge-terms" },
];

export function Footer({ showPowerLine = false }: { showPowerLine?: boolean }) {
  return (
    <footer className="border-t border-outline-variant/30 bg-surface-container-lowest">
      <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-stack-md px-margin-mobile py-stack-lg md:flex-row md:items-start md:px-margin-desktop">
        <div className="flex flex-col items-center gap-4 md:items-start">
          <Link
            to="/"
            className="font-display-lg text-headline-md font-extrabold uppercase tracking-tighter text-primary"
          >
            {BUSINESS_LEGAL_NAME}
          </Link>
          <address className="max-w-xs text-center font-body-md not-italic text-on-surface-variant md:text-left">
            {BUSINESS_ADDRESS_LINES.map((line) => (
              <div key={line}>{line}</div>
            ))}
            <div className="mt-2">
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                className="hover:text-on-surface hover:underline"
              >
                {CONTACT_PHONE_DISPLAY}
              </a>
            </div>
            <div>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="hover:text-on-surface hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </address>
          <p className="max-w-xs text-center font-body-md text-on-surface-variant md:text-left">
            © {new Date().getFullYear()} {BUSINESS_LEGAL_NAME}. Forged in Resin.
            Born in Shadow.
          </p>
          <TrustedSiteBadges />
        </div>
        <nav className="grid w-full max-w-sm grid-cols-2 justify-items-center gap-x-stack-lg gap-y-3 text-center sm:max-w-md sm:grid-cols-3 md:w-auto">
          {FOOTER_LINKS.map((link) =>
            "to" in link ? (
              <Link
                key={link.label}
                to={link.to}
                className="font-body-md text-on-surface-variant underline-offset-4 transition-colors hover:text-on-surface hover:underline decoration-primary/50"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="font-body-md text-on-surface-variant underline-offset-4 transition-colors hover:text-on-surface hover:underline decoration-primary/50"
              >
                {link.label}
              </a>
            ),
          )}
        </nav>
        <div className="flex items-center gap-stack-md">
          <a
            className="text-on-surface-variant transition-colors hover:text-primary"
            href={`tel:${CONTACT_PHONE_TEL}`}
            aria-label={`Call ${CONTACT_PHONE_DISPLAY}`}
          >
            <Icon name="call" />
          </a>
          <a
            className="text-on-surface-variant transition-colors hover:text-primary"
            href={`mailto:${CONTACT_EMAIL}`}
            aria-label={`Email ${CONTACT_EMAIL}`}
          >
            <Icon name="alternate_email" />
          </a>
        </div>
      </div>
      {showPowerLine && (
        <div className="w-full border-t border-outline-variant/10 bg-black/40 py-4 text-center text-label-sm text-on-surface-variant">
          Powered by 100% renewable electricity. Forged with intent.
        </div>
      )}
    </footer>
  );
}
