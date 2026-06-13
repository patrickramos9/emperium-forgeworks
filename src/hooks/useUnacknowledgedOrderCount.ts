import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { countUnacknowledgedPaidOrders } from "@/lib/adminOrderStats";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { listAllOrders } from "@/services/orderService";

export function useUnacknowledgedOrderCount() {
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
        const orders = await listAllOrders(client);
        setCount(countUnacknowledgedPaidOrders(orders));
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
