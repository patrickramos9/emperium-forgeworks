import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { countPendingPrintRequests } from "@/lib/printRequest";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { listAllPrintRequests } from "@/services/printRequestService";

/** Badge count for Admin → Print requests (`submitted` / `in_review`). */
export function usePendingPrintRequestCount() {
  const navigate = useNavigate();
  const location = useLocation();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const client = await requireAdminSession(navigate);
      if (!client) {
        setLoading(false);
        return;
      }

      try {
        const rows = await listAllPrintRequests(client);
        setCount(countPendingPrintRequests(rows));
      } catch {
        setCount(0);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [navigate, location.key]);

  return { count, loading };
}
