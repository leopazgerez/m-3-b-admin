import type { Sale, SaleLine, SaleType } from "./apiTypes";
import { round2 } from "./saleEstimate.ts";

const NOT_RETURNABLE: SaleType[] = ["GIFT", "GIVEAWAY", "INTERNAL"];

export const remainingQty = (l: SaleLine) => l.quantity - l.returnedQuantity;

/** Same rules as the backend: not cancelled, a returnable type, units left. */
export const canReturn = (s: Sale) =>
  !s.cancelledAt && !NOT_RETURNABLE.includes(s.type) && s.lines.some((l) => remainingQty(l) > 0);

/** Approximate returned value: the server prorates discounts and drops the card surcharge. */
export const estimateReturnValue = (picks: { unitPrice: number; quantity: number }[]) =>
  round2(picks.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0));

/** Without an exchange only faulty units come back. */
export const returnBlocker = (picks: { quantity: number; faulty: boolean }[], hasExchange: boolean): string | null =>
  picks.length === 0 ? "Elegí al menos una unidad a devolver."
    : !hasExchange && picks.some((p) => !p.faulty)
      ? "Sin cambio solo se devuelven unidades falladas: marcalas o agregá productos al cambio."
      : null;

/** The amount in the API's "remainder is required: X is left to refund or credit", or null. */
export function remainderRequired(message: string): number | null {
  const m = /^remainder is required: (-?[\d.]+) is left/.exec(message);
  return m ? Number(m[1]) : null;
}
