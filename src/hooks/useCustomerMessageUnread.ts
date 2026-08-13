import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  getCustomerDataClient,
  getGuestDataClient,
} from "@/lib/amplifyDataClient";
import { hasCustomerSession } from "@/lib/customerAuth";
import { hasConversationModel } from "@/lib/dataModels";
import {
  countUnreadForCustomer,
  countUnreadForGuest,
} from "@/services/messageInboxService";
import { ensureGuestSession } from "@/services/guestSessionService";

/** Unread message threads — signed-in owner or verified guest session. */
export function useCustomerMessageUnread() {
  const location = useLocation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        if (await hasCustomerSession()) {
          const client = await getCustomerDataClient();
          if (!client || !hasConversationModel(client)) {
            setCount(0);
            return;
          }
          setCount(await countUnreadForCustomer(client));
          return;
        }

        await ensureGuestSession();
        const client = await getGuestDataClient();
        if (!client?.queries.getGuestConversations) {
          setCount(0);
          return;
        }
        setCount(await countUnreadForGuest(client));
      } catch {
        setCount(0);
      }
    }
    void load();
  }, [location.pathname, location.key]);

  return count;
}
