import type { CashSessionStatus, PaymentMethod, PaymentStatus, Sale } from "./apiTypes";

export const money = (n: number) => (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("es-AR");

/** A simple product's only variant is named "STANDARD" by the backend: show just the product name. */
export const variantLabel = (r: { productName: string; variantName: string }) =>
  r.variantName === "STANDARD" ? r.productName : `${r.productName} · ${r.variantName}`;

export const paymentStatusVariant: Record<PaymentStatus, "success" | "warning" | "danger" | "neutral"> = {
  PAID: "success", PARTIAL: "warning", PENDING: "warning", CANCELLED: "danger", "N/A": "neutral",
};

export const cashSessionStatusVariant: Record<CashSessionStatus, "success" | "warning" | "neutral"> = {
  OPEN: "success", PENDING_COUNT: "warning", CLOSED: "neutral",
};

/** The caja status dot (sidebar, dashboard, /caja); key it with `session?.status ?? "CLOSED"`. */
export const cashStatusDot: Record<CashSessionStatus, { cls: string; title: string }> = {
  OPEN: { cls: "bg-[#3E8E5A]", title: "Caja abierta" },
  PENDING_COUNT: { cls: "bg-[#D98A2B]", title: "Falta hacer caja" },
  CLOSED: { cls: "bg-[#C0492F]", title: "Caja cerrada" },
};

/**
 * The empty option of an account select next to a payment method: the account the backend uses when none is picked.
 * A method without a default account needs one picked (the backend answers 400 otherwise).
 */
export const defaultAccountOption = (method: PaymentMethod | undefined) =>
  !method ? "Elegí primero el medio de pago"
    : method.defaultAccountName ? `${method.defaultAccountName} (la de ${method.name})`
    : "Elegí una cuenta…";

/** Sales without a customer carry the buyer's name in notes. */
export const buyerName = (s: Sale) => s.customerName ?? (s.notes?.trim() || "Consumidor final");
