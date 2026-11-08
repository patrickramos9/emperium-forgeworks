import { type MouseEvent, useEffect, useMemo, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useVaultNavAccess } from "@/hooks/useVaultNavAccess";
import { useCustomerMessageUnread } from "@/hooks/useCustomerMessageUnread";
import { useAnnouncementContext } from "@/context/AnnouncementContext";
import { useProducts } from "@/hooks/useProducts";
import {
  getLiveShopQuery,
  setLiveShopQuery,
} from "@/lib/liveShopQuery";
import { rankProductsForSearch } from "@/lib/productSearch";
import type { Product } from "@/data/seedProducts";
import { AccountMenu } from "./AccountMenu";
import { ForgeSearchField } from "./ForgeSearchField";
import { Icon } from "./Icon";
import { SystemAnnouncementBanner } from "./SystemAnnouncementBanner";

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
  const { hasSystemBanner } = useAnnouncementContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const { products, loading: catalogLoading } = useProducts();
  const [cartBadgeBump, setCartBadgeBump] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const messageUnread = useCustomerMessageUnread();
  const mobileNavId = useId();
  const mobileSearchId = useId();
  const chromeRef = useRef<HTMLDivElement>(null);
  const searchFocused = useRef(false);
  const focusCount = useRef(0);
  const suppressCommit = useRef(false);
  const liveTimer = useRef<number | null>(null);

  const rankedMatches = useMemo(
    () => (query.trim() ? rankProductsForSearch(products, query) : []),
    [products, query],
  );
  const suggestions = rankedMatches.slice(0, 8);

  useEffect(() => {
    const el = chromeRef.current;
    if (!el) return;

    const apply = () => {
      document.documentElement.style.setProperty(
        "--site-header-height",
        `${el.offsetHeight}px`,
      );
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--site-header-height");
    };
  }, [hasSystemBanner]);

  useEffect(() => {
    if (itemCount < 1) return;
    setCartBadgeBump(true);
    const timer = setTimeout(() => setCartBadgeBump(false), 260);
    return () => clearTimeout(timer);
  }, [cartBadgeBumpToken, itemCount]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname !== "/shop") setLiveShopQuery(null);
  }, [location.pathname]);

  useEffect(() => {
    if (searchFocused.current) return;
    const urlQuery = searchParams.get("q") ?? "";
    setQuery(urlQuery);
    const live = getLiveShopQuery();
    if (live != null && live.trim() === urlQuery) setLiveShopQuery(null);
  }, [searchParams]);

  useEffect(
    () => () => {
      if (liveTimer.current != null) window.clearTimeout(liveTimer.current);
    },
    [],
  );

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

  function writeShopQuery(value: string) {
    const trimmed = value.trim();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const current = next.get("q") ?? "";
        if (current === trimmed && !next.get("page")) return prev;
        if (trimmed) next.set("q", trimmed);
        else next.delete("q");
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  function flushShopQuery(value: string) {
    if (liveTimer.current != null) {
      window.clearTimeout(liveTimer.current);
      liveTimer.current = null;
    }
    if (location.pathname !== "/shop") return;
    writeShopQuery(value);
  }

  function scheduleShopQuery(value: string) {
    if (location.pathname !== "/shop") return;
    if (liveTimer.current != null) window.clearTimeout(liveTimer.current);
    liveTimer.current = window.setTimeout(() => {
      liveTimer.current = null;
      writeShopQuery(value);
    }, 250);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (location.pathname !== "/shop") return;
    setLiveShopQuery(value);
    scheduleShopQuery(value);
  }

  function handleFocusChange(focused: boolean) {
    focusCount.current += focused ? 1 : -1;
    if (focusCount.current < 0) focusCount.current = 0;
    searchFocused.current = focusCount.current > 0;
    if (searchFocused.current) return;
    if (suppressCommit.current) {
      suppressCommit.current = false;
      return;
    }
    flushShopQuery(query);
  }

  function handleSubmitQuery(value: string) {
    suppressCommit.current = true;
    if (liveTimer.current != null) {
      window.clearTimeout(liveTimer.current);
      liveTimer.current = null;
    }
    const trimmed = value.trim();
    setQuery(trimmed);
    setMobileNavOpen(false);
    if (location.pathname === "/shop") {
      setLiveShopQuery(trimmed ? trimmed : "");
      writeShopQuery(trimmed);
      return;
    }
    setLiveShopQuery(null);
    navigate(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : "/shop");
  }

  function handleSelectProduct(product: Product) {
    suppressCommit.current = true;
    if (liveTimer.current != null) {
      window.clearTimeout(liveTimer.current);
      liveTimer.current = null;
    }
    setLiveShopQuery(null);
    setMobileNavOpen(false);
    navigate(`/shop/${product.slug}`);
  }

  async function handleMessagesClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    navigate("/account/messages");
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/20 bg-background/90 backdrop-blur-md">
      <div ref={chromeRef}>
        <SystemAnnouncementBanner />
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
          <div className="hidden sm:block">
            <ForgeSearchField
              query={query}
              suggestions={suggestions}
              resultCount={rankedMatches.length}
              loading={catalogLoading}
              onQueryChange={handleQueryChange}
              onSubmitQuery={handleSubmitQuery}
              onSelectProduct={handleSelectProduct}
              onFocusChange={handleFocusChange}
              ariaLabel="Search the forge"
              panelClassName="right-0 w-[min(24rem,calc(100vw-2.5rem))]"
              inputClassName="w-64 border border-outline-variant/30 bg-surface-container-low/50 px-4 py-2 pr-10 text-label-md text-on-surface backdrop-blur-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
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
            <div className="border-t border-outline-variant/20 px-margin-mobile py-4">
              <label
                htmlFor={mobileSearchId}
                className="font-label-sm uppercase text-on-surface-variant"
              >
                Search
              </label>
              <div className="mt-2">
                <ForgeSearchField
                  id={mobileSearchId}
                  query={query}
                  suggestions={suggestions}
                  resultCount={rankedMatches.length}
                  loading={catalogLoading}
                  onQueryChange={handleQueryChange}
                  onSubmitQuery={handleSubmitQuery}
                  onSelectProduct={handleSelectProduct}
                  onFocusChange={handleFocusChange}
                  panelClassName="left-0 w-full"
                  inputClassName="w-full border border-outline-variant/30 bg-surface-container-low px-4 py-2 pr-10 text-label-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
