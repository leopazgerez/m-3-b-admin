// Estimador de total de venta. Solo para mostrar el total mientras se arma la venta;
// el backend es quien calcula el total real al guardarla.

/** HALF_UP a 2 decimales. Usa notación exponencial para evitar el error de 1.005 * 100. */
export function round2(n: number): number {
  return Number(Math.round(Number(n + "e2")) + "e-2");
}

export type DiscountInput = { kind: "amount" | "percent"; value: number } | null;

export interface EstimateLine {
  unitPrice: number;
  quantity: number;
}

export interface EstimatePayment {
  amount: number;
  surchargePct: number;
}

export interface SaleEstimate {
  gross: number;
  discount: number;
  surcharge: number;
  totalDue: number;
  paidBase: number;
  remaining: number;
}

export function estimateSale(
  lines: EstimateLine[],
  discount: DiscountInput,
  payments: EstimatePayment[],
): SaleEstimate {
  const gross = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
  const discountAmount = discount
    ? discount.kind === "percent"
      ? round2((gross * discount.value) / 100)
      : round2(discount.value)
    : 0;
  // Recargo por parte, igual que el backend.
  const surcharge = round2(
    payments.reduce((sum, p) => sum + round2((p.amount * p.surchargePct) / 100), 0),
  );
  const totalDue = round2(gross - discountAmount + surcharge);
  const paidBase = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  // El backend compara los pagos contra el total antes de recargos.
  const remaining = round2(gross - discountAmount - paidBase);
  return { gross, discount: discountAmount, surcharge, totalDue, paidBase, remaining };
}
