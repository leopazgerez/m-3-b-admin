import { parseAmount } from "./cashSession.ts";
import { round2 } from "./saleEstimate.ts";
import type { Criterion } from "./apiQuery";
import type { Accreditation, AccreditationFields } from "./apiTypes";

/** GET /payments filter for the card payments still waiting for the bank. */
export const PENDING_ACCREDITATION: Criterion[] = [{ field: "accreditation", operator: "EQUALS", value: "PENDING" }];
export const ACCREDITED: Criterion[] = [{ field: "accreditation", operator: "EQUALS", value: "ACCREDITED" }];
/** Every payment of a fee-charging method, pending or not. */
export const ACCREDITABLE: Criterion[] = [{ field: "accreditation", operator: "IN", value: ["PENDING", "ACCREDITED"] }];

/** Its method charges a fee: it can be accredited (PENDING) or corrected (ACCREDITED). */
export const isAccreditable = (a: Accreditation | undefined): a is "PENDING" | "ACCREDITED" =>
  a === "PENDING" || a === "ACCREDITED";

/**
 * A sale's payment line carries this sale's part as amount but the whole payment's receivedAmount and fee: when
 * they don't add up to the line, the payment also paid other sales.
 */
export const coversOtherSales = (l: Pick<AccreditationFields, "receivedAmount" | "fee"> & { amount: number }) =>
  l.receivedAmount !== null && l.fee !== null && round2(l.receivedAmount + l.fee) !== l.amount;

/** "Recibido en cuenta" → the PUT body's receivedAmount: > 0, ≤ charged, up to 2 decimals; or why not. */
export function parseReceived(input: string, charged: number): { amount: number } | { error: string } {
  const amount = parseAmount(input);
  if (amount === null || amount <= 0) return { error: "Lo recibido debe ser mayor a 0, con hasta 2 decimales." };
  if (amount > charged) return { error: "Lo recibido no puede superar lo cobrado." };
  return { amount };
}

/** Live "Comisión: X (Y %)" while typing; null for an invalid amount. Only a preview: the backend computes the fee. */
export function feePreview(input: string, charged: number): { fee: number; pct: number } | null {
  const r = parseReceived(input, charged);
  if ("error" in r) return null;
  const fee = round2(charged - r.amount);
  return { fee, pct: round2((fee / charged) * 100) };
}
