import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { requireAdminSession } from "@/lib/amplifyDataClient";
import { hasConversationModel } from "@/lib/dataModels";
import { countUnreadForAdmin } from "@/services/messageInboxService";

export function useAdminMessageUnread() {
  const navigate = useNavigate();
  const location = useLocation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function load() {
      const client = await requireAdminSession(navigate);
      if (!client || !hasConversationModel(client)) {
        setCount(0);
        return;
      }
      try {
        setCount(await countUnreadForAdmin(client));
      } catch {
        setCount(0);
      }
    }
    void load();
  }, [navigate, location.key]);

  return count;
}
