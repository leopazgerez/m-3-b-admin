export type DashboardPeriod = { kind: "current" } | { kind: "previous" } | { kind: "custom"; from: string; to: string };

const pad = (n: number) => String(n).padStart(2, "0");

/** Query params for the report endpoints; null = invalid custom range. current → {} (backend defaults to the current month). */
export function periodParams(p: DashboardPeriod, today: string): { from?: string; to?: string } | null {
  if (p.kind === "current") return {};
  if (p.kind === "custom") return !p.from || !p.to || p.from > p.to ? null : { from: p.from, to: p.to };
  const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7));
  const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
  const last = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  return { from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${pad(last)}` };
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;

export const pctLabel = (p: number | null) => (p === null ? "—" : `${p.toLocaleString("es-AR")}%`);

export const barRatio = (value: number, max: number) => (max <= 0 ? 0 : Math.min(1, Math.max(0, value / max)));

export const pruneReadIds = (read: string[], current: string[]) => read.filter((id) => current.includes(id));
