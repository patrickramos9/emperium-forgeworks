import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resolveVaultEntry, type VaultEntryStatus } from "@/lib/vaultAccess";

export type VaultGateStatus = VaultEntryStatus | "loading";

/**
 * Guards /vault routes: re-checks vault access on navigation, refresh, and tab focus.
 * Non-authorized users are redirected to home and cannot access /vault routes.
 */
export function useVaultGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<VaultGateStatus>("loading");

  const check = useCallback(async () => {
    setStatus("loading");
    const entry = await resolveVaultEntry();
    if (entry === "denied") {
      navigate("/", { replace: true });
      return;
    }
    setStatus(entry);
  }, [navigate]);

  useEffect(() => {
    void check();
  }, [check, location.pathname]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        void check();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [check]);

  return { status, recheck: check };
}
