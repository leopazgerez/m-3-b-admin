/**
 * Date and instant helpers.
 */

/** Local-time YYYY-MM-DD (toISOString is UTC and shifts the day after 21:00 in Argentina). */
export function toLocalISODate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO UTC instant -> local "DD/MM/YYYY, HH:mm". */
export function formatInstant(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/** Plain date YYYY-MM-DD -> DD/MM/YYYY, no timezone conversion. */
export const formatDate = (d: string | null | undefined) => (d ? d.split("-").reverse().join("/") : "—");

/**
 * A past local day picked for a backdated instant (paidAt…): sent as the END of that local day, so it is never
 * before something recorded that same day. Empty, today or future → undefined (the server uses now).
 */
export function pastDayToInstant(day: string, today: string = toLocalISODate()): string | undefined {
  if (!day || day >= today) return undefined;
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}
