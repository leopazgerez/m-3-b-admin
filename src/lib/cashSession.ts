import { toLocalISODate } from "./dateUtils.ts";
import { round2 } from "./saleEstimate.ts";
import type { AccountAmount, CashMovementFields, CashMovementType, CashSessionRow } from "./apiTypes";

/** "70500", "-1200.5", ".5" → number; empty, junk or more than 2 decimals → null. Negatives allowed (an overdrawn bank). */
export function parseAmount(s: string): number | null {
  const t = s.trim();
  return /^-?(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(t) ? Number(t) : null;
}

/** One typed amount per account → the API's [{accountId, amount}]; or a message naming the first bad one. */
export function toAmounts(
  lines: { accountId: number; name: string }[], typed: Record<number, string>,
): { amounts: AccountAmount[] } | { error: string } {
  const amounts: AccountAmount[] = [];
  for (const l of lines) {
    const amount = parseAmount(typed[l.accountId] ?? "");
    if (amount === null) return { error: `Revisá el monto de ${l.name}: un número (puede ser 0 o negativo) con hasta 2 decimales.` };
    amounts.push({ accountId: l.accountId, amount });
  }
  return { amounts };
}

/** Counted − expected, to the cent, while the user types. Only a visual aid: after submit the server's figures rule. */
export function liveDifference(input: string, expected: number): number | null {
  const n = parseAmount(input);
  return n === null ? null : round2(n - expected);
}

/** A void reverses the original's money, so it is shown negative. */
export const signedAmount = (r: CashSessionRow) => (r.voidedHere ? -r.amount : r.amount);

/** Ids of the movements voided in these rows (build once per render, then ask canVoid per row). */
export const voidedMovementIds = (rows: CashSessionRow[]) =>
  new Set(rows.filter((o) => o.kind === "MOVEMENT" && o.voidedHere).map((o) => o.id));

/** Anular: a manual movement that is not a void itself and has not been voided in the session. */
export const canVoid = (r: CashSessionRow, voided: Set<number>) =>
  r.kind === "MOVEMENT" && !r.voidedHere && !voided.has(r.id);

/** Local "YYYY-MM-DDTHH:mm" for a datetime-local input's value/max. */
export function toLocalDateTimeInput(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${toLocalISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface MovementDraft {
  type: CashMovementType; fromAccountId: string; toAccountId: string; amount: string; movedAt: string; reason: string;
}

/** The form's strings → POST /cash-movements body, mirroring the backend's rules; or the first rule broken. */
export function movementBody(d: MovementDraft, now: Date = new Date()): { body: CashMovementFields } | { error: string } {
  const amount = parseAmount(d.amount);
  if (amount === null || amount <= 0) return { error: "El monto debe ser mayor a 0, con hasta 2 decimales." };
  const from = d.type !== "INCOME" ? Number(d.fromAccountId) || null : null;
  const to = d.type !== "WITHDRAWAL" ? Number(d.toAccountId) || null : null;
  if (d.type !== "INCOME" && !from) return { error: "Elegí la cuenta de la que sale el dinero." };
  if (d.type !== "WITHDRAWAL" && !to) return { error: "Elegí la cuenta a la que entra el dinero." };
  if (from && from === to) return { error: "Las cuentas de origen y destino deben ser distintas." };
  if (!d.reason.trim()) return { error: "Indicá el motivo." };
  const body: CashMovementFields = { type: d.type, amount, reason: d.reason.trim() };
  if (from) body.fromAccountId = from;
  if (to) body.toAccountId = to;
  if (d.movedAt) {
    const at = new Date(d.movedAt); // no offset → parsed as local time
    if (Number.isNaN(at.getTime())) return { error: "Fecha y hora inválida." };
    if (at > now) return { error: "La fecha y hora no puede ser futura." };
    body.movedAt = at.toISOString();
  }
  return { body };
}
