import type { PaymentStatus, Sale } from "./apiTypes";

export const money = (n: number) => `$${n.toLocaleString("es-AR")}`;

/** A simple product's only variant is named "STANDARD" by the backend: show just the product name. */
export const variantLabel = (r: { productName: string; variantName: string }) =>
  r.variantName === "STANDARD" ? r.productName : `${r.productName} · ${r.variantName}`;

export const paymentStatusVariant: Record<PaymentStatus, "success" | "warning" | "danger" | "neutral"> = {
  PAID: "success", PARTIAL: "warning", PENDING: "warning", CANCELLED: "danger", "N/A": "neutral",
};

/** Sales without a customer carry the buyer's name in notes. */
export const buyerName = (s: Sale) => s.customerName ?? (s.notes?.trim() || "Consumidor final");
