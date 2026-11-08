import { useSyncExternalStore } from "react";

let liveQuery: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** In-progress shop search. Null means the shop page should use the `q` param. */
export function setLiveShopQuery(query: string | null) {
  if (liveQuery === query) return;
  liveQuery = query;
  emit();
}

export function getLiveShopQuery(): string | null {
  return liveQuery;
}

export function subscribeLiveShopQuery(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLiveShopQuery(): string | null {
  return useSyncExternalStore(
    subscribeLiveShopQuery,
    getLiveShopQuery,
    () => null,
  );
}

/** Keep a not-yet-committed type-ahead query when other shop params change. */
export function mergeLiveShopQuery(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  if (liveQuery == null) return next;
  const trimmed = liveQuery.trim();
  if (trimmed) next.set("q", trimmed);
  else next.delete("q");
  return next;
}
