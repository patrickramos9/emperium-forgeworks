import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@/components/Icon";
import {
  customerSignOut,
  hasCustomerSession,
} from "@/lib/customerAuth";

export function AccountMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void hasCustomerSession().then(setSignedIn);
  }, [location.pathname]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  async function handleSignOut() {
    await customerSignOut();
    setSignedIn(false);
    setOpen(false);
    navigate("/");
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="p-2 text-on-surface-variant transition-colors hover:text-primary active:scale-95"
        aria-label="Account"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Icon name="person" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[11rem] border border-outline-variant/30 bg-surface-container-low py-2 iron-bevel shadow-lg"
        >
          {signedIn ? (
            <>
              <Link
                role="menuitem"
                to="/account"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 font-label-md text-on-surface hover:bg-surface-container-high hover:text-primary"
              >
                Account
              </Link>
              <Link
                role="menuitem"
                to="/account/orders"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 font-label-md text-on-surface hover:bg-surface-container-high hover:text-primary"
              >
                Orders
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleSignOut()}
                className="block w-full px-4 py-2 text-left font-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                role="menuitem"
                to="/account/login"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 font-label-md text-on-surface hover:bg-surface-container-high hover:text-primary"
              >
                Sign in
              </Link>
              <Link
                role="menuitem"
                to="/account/register"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 font-label-md text-on-surface hover:bg-surface-container-high hover:text-primary"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
