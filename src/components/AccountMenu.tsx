import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import { getCustomerDataClient } from "@/lib/amplifyDataClient";
import {
  customerSignOut,
  hasCustomerSession,
} from "@/lib/customerAuth";
import { listCustomerNotifications, listMyNotificationReads, unreadCount } from "@/services/notificationService";
import { hasSculptorModel } from "@/lib/dataModels";
import { getSculptorForEditor } from "@/services/sculptorService";

export function AccountMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { badgeRefreshToken } = useNotificationBadge();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [unread, setUnread] = useState(0);
  const [hasPartnerAccess, setHasPartnerAccess] = useState(false);
  const [badgeBump, setBadgeBump] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadSessionAndBadge() {
      const hasSession = await hasCustomerSession();
      setSignedIn(hasSession);
      if (!hasSession) {
        setUnread(0);
        setHasPartnerAccess(false);
        return;
      }
      const client = await getCustomerDataClient();
      if (!client) return;
      try {
        const [notifications, reads] = await Promise.all([
          listCustomerNotifications(client),
          listMyNotificationReads(client),
        ]);
        setUnread(unreadCount(notifications, reads));

        if (hasSculptorModel(client)) {
          const { fetchAuthSession } = await import("aws-amplify/auth");
          const session = await fetchAuthSession();
          const sub = session.tokens?.idToken?.payload?.sub;
          if (typeof sub === "string") {
            const row = await getSculptorForEditor(client, sub);
            setHasPartnerAccess(Boolean(row));
          }
        }
      } catch {
        // Ignore badge load errors in nav.
      }
    }
    void loadSessionAndBadge();
  }, [location.pathname]);

  useEffect(() => {
    if (badgeRefreshToken === 0) return;

    let cancelled = false;

    async function refreshUnread() {
      const hasSession = await hasCustomerSession();
      if (!hasSession || cancelled) {
        if (!hasSession) setUnread(0);
        return;
      }
      const client = await getCustomerDataClient();
      if (!client || cancelled) return;
      try {
        const [notifications, reads] = await Promise.all([
          listCustomerNotifications(client),
          listMyNotificationReads(client),
        ]);
        if (!cancelled) setUnread(unreadCount(notifications, reads));
      } catch {
        // Ignore badge load errors in nav.
      }
    }

    void refreshUnread();
    const retry = window.setTimeout(() => void refreshUnread(), 500);

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
    };
  }, [badgeRefreshToken]);

  useEffect(() => {
    if (unread < 1) return;
    setBadgeBump(true);
    const timer = setTimeout(() => setBadgeBump(false), 260);
    return () => clearTimeout(timer);
  }, [badgeRefreshToken, unread]);

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
    setUnread(0);
    setHasPartnerAccess(false);
    setOpen(false);
    navigate("/");
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative p-2 text-on-surface-variant transition-colors hover:text-primary active:scale-95"
        aria-label={signedIn && unread > 0 ? `Account, ${unread} unread notifications` : "Account"}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Icon name="person" />
        {signedIn && unread > 0 && (
          <span
            className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-primary px-1 text-label-sm text-on-primary ${badgeBump ? "cart-badge-bump" : ""}`}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
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
                to="/account/notifications"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 font-label-md text-on-surface hover:bg-surface-container-high hover:text-primary"
              >
                Notifications{unread > 0 ? ` (${unread})` : ""}
              </Link>
              <Link
                role="menuitem"
                to="/account/orders"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 font-label-md text-on-surface hover:bg-surface-container-high hover:text-primary"
              >
                Orders
              </Link>
              <Link
                role="menuitem"
                to="/account/favorites"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 font-label-md text-on-surface hover:bg-surface-container-high hover:text-primary"
              >
                Saved favorites
              </Link>
              <Link
                role="menuitem"
                to="/account/print-requests"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 font-label-md text-on-surface hover:bg-surface-container-high hover:text-primary"
              >
                Print requests
              </Link>
              {hasPartnerAccess && (
                <Link
                  role="menuitem"
                  to="/partner/sculptor"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 font-label-md text-on-surface hover:bg-surface-container-high hover:text-primary"
                >
                  Sculptor profile
                </Link>
              )}
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
                to="/account/favorites"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 font-label-md text-on-surface hover:bg-surface-container-high hover:text-primary"
              >
                Saved favorites
              </Link>
              <Link
                role="menuitem"
                to="/account/print-requests"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 font-label-md text-on-surface hover:bg-surface-container-high hover:text-primary"
              >
                Print requests
              </Link>
              <div
                className="my-1 border-t border-outline-variant/20"
                role="separator"
              />
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
