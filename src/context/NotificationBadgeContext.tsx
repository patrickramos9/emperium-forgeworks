import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type NotificationBadgeContextValue = {
  badgeRefreshToken: number;
  refreshNotificationBadge: () => void;
};

const NotificationBadgeContext =
  createContext<NotificationBadgeContextValue | null>(null);

export function NotificationBadgeProvider({ children }: { children: ReactNode }) {
  const [badgeRefreshToken, setBadgeRefreshToken] = useState(0);

  const refreshNotificationBadge = useCallback(() => {
    setBadgeRefreshToken((token) => token + 1);
  }, []);

  const value = useMemo(
    () => ({ badgeRefreshToken, refreshNotificationBadge }),
    [badgeRefreshToken, refreshNotificationBadge],
  );

  return (
    <NotificationBadgeContext.Provider value={value}>
      {children}
    </NotificationBadgeContext.Provider>
  );
}

export function useNotificationBadge() {
  const ctx = useContext(NotificationBadgeContext);
  if (!ctx) {
    throw new Error(
      "useNotificationBadge must be used within NotificationBadgeProvider",
    );
  }
  return ctx;
}
