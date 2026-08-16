import { FormEvent, type MouseEvent, useEffect, useId, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useVaultNavAccess } from "@/hooks/useVaultNavAccess";
import { useCustomerMessageUnread } from "@/hooks/useCustomerMessageUnread";
import { useSiteLayout } from "@/context/AnnouncementContext";
import { AccountMenu } from "./AccountMenu";
import { Icon } from "./Icon";

const desktopNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "font-display-lg text-headline-md uppercase tracking-widest transition-colors duration-300",
    isActive
      ? "text-primary font-bold border-b-2 border-primary pb-1"
      : "text-on-surface-variant font-medium hover:text-plasma-glow",
  ].join(" ");

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "block border-l-2 px-4 py-3 font-display-lg text-headline-md uppercase tracking-widest transition-colors",
    isActive
      ? "border-primary bg-surface-container-high text-primary font-bold"
      : "border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-primary",
  ].join(" ");

export function Header() {
  const { items, cartBadgeBumpToken } = useCart();
  const itemCount = items.reduce((count, line) => count + line.quantity, 0);
  const showVaultNav = useVaultNavAccess();
  const { headerTopClass } = useSiteLayout();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [cartBadgeBump, setCartBadgeBump] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const messageUnread = useCustomerMessageUnread();
  const mobileNavId = useId();

  useEffect(() => {
    if (itemCount < 1) return;
    setCartBadgeBump(true);
    const timer = setTimeout(() => setCartBadgeBump(false), 260);
    return () => clearTimeout(timer);
  }, [cartBadgeBumpToken, itemCount]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setMobileNavOpen(false);
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  }

  async function handleMessagesClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    navigate("/account/messages");
  }

  return (
    <header
      className={`fixed z-50 w-full border-b border-outline-variant/20 bg-background/90 backdrop-blur-md ${headerTopClass}`}
    >
      <div className="mx-auto flex max-w-container-max items-center justify-between gap-stack-md px-margin-mobile py-4 md:px-margin-desktop">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-8">
          <button
            type="button"
            className="shrink-0 p-2 text-on-surface-variant transition-colors hover:text-primary active:scale-95 md:hidden"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
            aria-controls={mobileNavId}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <Icon name={mobileNavOpen ? "close" : "menu"} />
          </button>
          <Link
            to="/"
            className="min-w-0 shrink font-display-lg text-headline-md font-extrabold uppercase tracking-tighter text-primary"
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="block truncate sm:hidden">Emperium</span>
            <span className="hidden sm:inline">Emperium Forgeworks</span>
          </Link>
          <nav className="hidden items-center gap-stack-lg md:flex" aria-label="Primary">
            <NavLink to="/shop" className={desktopNavLinkClass}>
              Shop
            </NavLink>
            <NavLink to="/gallery" className={desktopNavLinkClass}>
              Gallery
            </NavLink>
            {showVaultNav && (
              <NavLink to="/vault" className={desktopNavLinkClass}>
                Vault
              </NavLink>
            )}
            <NavLink to="/about" className={desktopNavLinkClass}>
              About
            </NavLink>
            <NavLink to="/contact" className={desktopNavLinkClass}>
              Contact
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-stack-md">
          <form
            onSubmit={handleSearch}
            className="relative hidden sm:block"
          >
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the forge..."
              className="w-64 border border-outline-variant/30 bg-surface-container-low/50 px-4 py-2 pr-10 text-label-md text-on-surface backdrop-blur-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <Icon
              name="search"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant"
            />
          </form>
          <a
            href="/account/messages"
            onClick={(e) => void handleMessagesClick(e)}
            className="relative p-2 text-on-surface-variant transition-colors hover:text-primary active:scale-95"
            aria-label={
              messageUnread > 0
                ? `Messages, ${messageUnread} unread`
                : "Messages"
            }
          >
            <Icon name="mail" />
            {messageUnread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-primary px-1 text-label-sm text-on-primary">
                {messageUnread > 9 ? "9+" : messageUnread}
              </span>
            )}
          </a>
          <Link
            to="/cart"
            className="relative p-2 text-on-surface-variant transition-colors hover:text-primary active:scale-95"
            aria-label={
              itemCount > 0 ? `Cart, ${itemCount} items` : "Cart"
            }
          >
            <Icon name="shopping_cart" />
            {itemCount > 0 && (
              <span
                className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-primary px-1 text-label-sm text-on-primary ${cartBadgeBump ? "cart-badge-bump" : ""}`}
              >
                {itemCount}
              </span>
            )}
          </Link>
          <AccountMenu />
        </div>
      </div>

      {mobileNavOpen && (
        <div className="md:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-background/70"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            id={mobileNavId}
            className="relative z-50 border-t border-outline-variant/20 bg-surface-container-lowest"
          >
            <nav className="px-margin-mobile py-3" aria-label="Mobile primary">
              <NavLink to="/shop" className={mobileNavLinkClass}>
                Shop
              </NavLink>
              <NavLink to="/gallery" className={mobileNavLinkClass}>
                Gallery
              </NavLink>
              {showVaultNav && (
                <NavLink to="/vault" className={mobileNavLinkClass}>
                  Vault
                </NavLink>
              )}
              <NavLink to="/about" className={mobileNavLinkClass}>
                About
              </NavLink>
              <NavLink to="/contact" className={mobileNavLinkClass}>
                Contact
              </NavLink>
            </nav>
            <form
              onSubmit={handleSearch}
              className="border-t border-outline-variant/20 px-margin-mobile py-4"
            >
              <label className="block">
                <span className="font-label-sm uppercase text-on-surface-variant">
                  Search
                </span>
                <div className="relative mt-2">
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search the forge..."
                    className="w-full border border-outline-variant/30 bg-surface-container-low px-4 py-2 pr-10 text-label-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <Icon
                    name="search"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant"
                  />
                </div>
              </label>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
