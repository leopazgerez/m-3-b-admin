import type { CurrentUser } from "./apiTypes";

export interface Session { accessToken: string; expiresAt: string; user: CurrentUser }

const KEY = "m3b_session";

/** An unparseable expiresAt counts as expired. */
export function isExpired(expiresAt: string, now: Date = new Date()): boolean {
  const t = Date.parse(expiresAt);
  return Number.isNaN(t) || t <= now.getTime();
}

export function getSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s?.accessToken && !isExpired(s.expiresAt) ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage blocked: the session lasts only until reload
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
