import { FormEvent, type MouseEvent, useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useVaultNavAccess } from "@/hooks/useVaultNavAccess";
import { useCustomerMessageUnread } from "@/hooks/useCustomerMessageUnread";
import { useSiteLayout } from "@/context/AnnouncementContext";
import { AccountMenu } from "./AccountMenu";
import { Icon } from "./Icon";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "font-display-lg text-headline-md uppercase tracking-widest transition-colors duration-300",
    isActive
      ? "text-primary font-bold border-b-2 border-primary pb-1"
      : "text-on-surface-variant font-medium hover:text-plasma-glow",
  ].join(" ");

export function Header() {
  const { items, cartBadgeBumpToken } = useCart();
  const itemCount = items.reduce((count, line) => count + line.quantity, 0);
  const showVaultNav = useVaultNavAccess();
  const { headerTopClass } = useSiteLayout();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [cartBadgeBump, setCartBadgeBump] = useState(false);
  const messageUnread = useCustomerMessageUnread();

  useEffect(() => {
    if (itemCount < 1) return;
    setCartBadgeBump(true);
    const timer = setTimeout(() => setCartBadgeBump(false), 260);
    return () => clearTimeout(timer);
  }, [cartBadgeBumpToken, itemCount]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
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
        <div className="flex min-w-0 flex-1 items-center gap-8">
          <Link
            to="/"
            className="shrink-0 font-display-lg text-headline-md font-extrabold uppercase tracking-tighter text-primary"
          >
            Emperium Forgeworks
          </Link>
          <nav className="hidden items-center gap-stack-lg md:flex">
            <NavLink to="/shop" className={navLinkClass}>
              Shop
            </NavLink>
            <NavLink to="/gallery" className={navLinkClass}>
              Gallery
            </NavLink>
            {showVaultNav && (
              <NavLink to="/vault" className={navLinkClass}>
                Vault
              </NavLink>
            )}
            <NavLink to="/about" className={navLinkClass}>
              About
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
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
    </header>
  );
}
