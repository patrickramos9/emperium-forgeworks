import { SOCIAL_LINKS, type SocialNetwork } from "@/lib/config";

function SocialBrandIcon({
  network,
  className = "h-5 w-5",
}: {
  network: SocialNetwork;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true as const,
  };

  switch (network) {
    case "instagram":
      return (
        <svg {...common}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      );
    case "threads":
      // Simplified Threads mark (rounded stroke path).
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.5 8.5c1-2 3-3.2 5.2-3.2 3.2 0 5.3 2.1 5.3 5.5 0 4.4-2.6 7.2-6.5 7.2-3.5 0-5.8-2.2-5.8-5.3 0-2.8 1.9-4.7 4.6-4.7 2.1 0 3.5 1.1 3.9 2.8"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.2 12.2c0 1.7 1.1 2.8 2.6 2.8 1.6 0 2.6-1.2 2.6-2.9 0-1.6-.9-2.7-2.4-2.7-1.5 0-2.8 1.1-2.8 2.8z"
          />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
      );
    case "etsy":
      return (
        <svg {...common}>
          <path d="M8.25 4.5h9.3v1.7H10.1c.15 1.55.95 2.55 2.45 2.55 1.05 0 1.9-.4 2.55-1.05l1.35 1.4c-.95.95-2.2 1.55-3.95 1.55-2.7 0-4.45-1.75-4.45-4.45 0-.55.05-1.05.2-1.7zm-.4 8.7h10.3v1.75H7.85zM8.5 17.4h9.05v1.75H8.5z" />
        </svg>
      );
  }
}

type SocialLinksProps = {
  className?: string;
  iconClassName?: string;
  /** Show network name beside each icon (Contact page). */
  showLabels?: boolean;
};

export function SocialLinks({
  className = "",
  iconClassName = "h-5 w-5",
  showLabels = false,
}: SocialLinksProps) {
  return (
    <nav
      className={`flex flex-wrap items-center gap-stack-md ${className}`.trim()}
      aria-label="Social media"
    >
      {SOCIAL_LINKS.map((link) => (
        <a
          key={link.network}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={
            showLabels
              ? "inline-flex items-center gap-2 font-label-md uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
              : "text-on-surface-variant transition-colors hover:text-primary"
          }
          aria-label={link.label}
          title={link.label}
        >
          <SocialBrandIcon network={link.network} className={iconClassName} />
          {showLabels ? <span>{link.label}</span> : null}
        </a>
      ))}
    </nav>
  );
}
