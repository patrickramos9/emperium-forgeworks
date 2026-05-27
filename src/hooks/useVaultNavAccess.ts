import { useEffect, useState } from "react";
import { Hub } from "aws-amplify/utils";
import { getCustomerDataClient } from "@/lib/amplifyDataClient";
import { hasVaultAccessModel } from "@/lib/dataModels";

/**
 * True when the signed-in customer has an active vault key assigned in admin.
 * Guests and customers without a key do not see Vault in the nav.
 */
export function useVaultNavAccess() {
  const [showVaultNav, setShowVaultNav] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const client = await getCustomerDataClient();
      if (!client || !hasVaultAccessModel(client)) {
        if (!cancelled) setShowVaultNav(false);
        return;
      }

      try {
        const { getCurrentUser } = await import("aws-amplify/auth");
        const { userId } = await getCurrentUser();
        const { data } = await client.models.VaultAccess.list({
          filter: { userId: { eq: userId }, active: { eq: true } },
        });
        if (!cancelled) setShowVaultNav(Boolean(data?.length));
      } catch {
        if (!cancelled) setShowVaultNav(false);
      }
    }

    void check();

    const unsubscribe = Hub.listen("auth", () => {
      void check();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return showVaultNav;
}
