import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { adminSignOut } from "@/lib/adminAuth";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import {
  isAdminIdleExpired,
  touchAdminActivity,
} from "@/lib/adminSessionPolicy";

type NavItem = { label: string; to: string; end?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/admin", end: true },
  { label: "Products", to: "/admin/products" },
  { label: "Orders", to: "/admin/orders" },
  { label: "Promo codes", to: "/admin/promos" },
  { label: "Vault", to: "/admin/vault" },
  { label: "Settings", to: "/admin/settings" },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "block px-4 py-2 font-label-md uppercase tracking-wide transition-colors",
    isActive
      ? "border-l-2 border-primary bg-surface-container-high text-primary"
      : "border-l-2 border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
  ].join(" ");

export function AdminLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function guard() {
      if (isAdminIdleExpired()) {
        await adminSignOut(false);
        navigate("/admin/login?error=session_expired");
        return;
      }
      const client = await requireAdminSession(navigate);
      if (client) touchAdminActivity();
      setReady(Boolean(client));
    }
    void guard();
  }, [navigate]);

  useEffect(() => {
    if (!ready) return;

    function recordActivity() {
      touchAdminActivity();
    }

    const interval = window.setInterval(() => {
      if (isAdminIdleExpired()) {
        void adminSignOut(false).then(() => {
          navigate("/admin/login?error=session_expired");
        });
      }
    }, 60_000);

    window.addEventListener("click", recordActivity);
    window.addEventListener("keydown", recordActivity);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("click", recordActivity);
      window.removeEventListener("keydown", recordActivity);
    };
  }, [ready, navigate]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await adminSignOut();
      navigate("/admin/login");
    } finally {
      setSigningOut(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-on-surface-variant">Checking admin session...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 border-r border-outline-variant/20 bg-surface-container-lowest md:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="border-b border-outline-variant/20 px-4 py-5">
            <Link
              to="/"
              className="font-display-lg text-label-md uppercase text-on-surface-variant hover:text-primary"
            >
              ← Storefront
            </Link>
            <p className="mt-2 font-display-lg text-headline-md uppercase text-primary">
              Admin Forge
            </p>
          </div>
          <nav className="flex-1 py-4">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navLinkClass}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-outline-variant/20 bg-surface-container-lowest px-4 py-3 md:px-6">
          <nav className="flex gap-2 overflow-x-auto md:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "shrink-0 px-3 py-1 font-label-sm uppercase",
                    isActive ? "text-primary" : "text-on-surface-variant",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:block" />
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="font-label-sm uppercase text-on-surface-variant hover:text-primary disabled:opacity-50"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </header>

        <div className="flex-1 px-4 py-6 md:px-6 md:py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
