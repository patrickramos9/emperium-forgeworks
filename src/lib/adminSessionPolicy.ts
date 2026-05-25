/** Max idle time before admin is signed out (milliseconds). */
export const ADMIN_IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

const LAST_ACTIVITY_KEY = "emperium-admin-last-activity";

export function touchAdminActivity(): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function clearAdminActivity(): void {
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function isAdminIdleExpired(): boolean {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return false;

  const last = Number.parseInt(raw, 10);
  if (Number.isNaN(last)) return false;

  return Date.now() - last > ADMIN_IDLE_TIMEOUT_MS;
}
