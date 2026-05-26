import { Link } from "react-router-dom";
import { CONTACT_EMAIL } from "@/lib/config";
import { Icon } from "./Icon";

type FooterLink =
  | { label: string; to: string }
  | { label: string; href: string };

const FOOTER_LINKS: FooterLink[] = [
  { label: "Shipping & Returns", to: "/shipping-returns" },
  { label: "Privacy Policy", href: "#" },
  { label: "Forge Terms", href: "#" },
  {
    label: "Contact Melissa",
    href: `mailto:${CONTACT_EMAIL}`,
  },
];

export function Footer({ showPowerLine = false }: { showPowerLine?: boolean }) {
  return (
    <footer className="border-t border-outline-variant/30 bg-surface-container-lowest">
      <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-stack-md px-margin-mobile py-stack-lg md:flex-row md:px-margin-desktop">
        <div className="flex flex-col items-center gap-4 md:items-start">
          <Link
            to="/"
            className="font-display-lg text-headline-md font-extrabold uppercase tracking-tighter text-primary"
          >
            Emperium Forgeworks
          </Link>
          <p className="max-w-xs text-center font-body-md text-on-surface-variant md:text-left">
            © {new Date().getFullYear()} Emperium Forgeworks. Forged in Resin.
            Born in Shadow.
          </p>
        </div>
        <nav className="flex flex-wrap justify-center gap-stack-lg">
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
          <Link
            to="/about"
            className="font-body-md text-on-surface-variant underline-offset-4 transition-colors hover:text-on-surface hover:underline decoration-primary/50"
          >
            About
          </Link>
          <Link
            to="/admin/login"
            className="font-body-md text-on-surface-variant underline-offset-4 transition-colors hover:text-on-surface hover:underline decoration-primary/50"
          >
            Admin
          </Link>
        </nav>
        <div className="flex items-center gap-stack-md">
          <a
            className="text-on-surface-variant transition-colors hover:text-primary"
            href="#"
            aria-label="Share"
          >
            <Icon name="share" />
          </a>
          <a
            className="text-on-surface-variant transition-colors hover:text-primary"
            href="#"
            aria-label="RSS"
          >
            <Icon name="rss_feed" />
          </a>
          <a
            className="text-on-surface-variant transition-colors hover:text-primary"
            href={`mailto:${CONTACT_EMAIL}`}
            aria-label="Email Melissa"
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
