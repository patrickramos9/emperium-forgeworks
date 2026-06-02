import { useEffect, useState } from "react";
import { getGuestDataClient } from "@/lib/amplifyDataClient";
import { hasShippingProfileModel } from "@/lib/dataModels";
import { listAllShippingProfiles } from "@/services/shippingProfileService";
import type { ShippingProfileRecord } from "@/services/shippingProfileService";

export function useShippingProfiles() {
  const [profiles, setProfiles] = useState<ShippingProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const client = await getGuestDataClient();
      if (!client || !hasShippingProfileModel(client)) {
        if (!cancelled) {
          setProfiles([]);
          setLoading(false);
        }
        return;
      }

      try {
        const rows = await listAllShippingProfiles(client);
        if (!cancelled) setProfiles(rows);
      } catch (err) {
        console.error("[useShippingProfiles] load failed", err);
        if (!cancelled) setProfiles([]);
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { profiles, loading };
}
