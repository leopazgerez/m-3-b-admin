import type {
  AccountEntryType, AccountType, AdjustmentType, CashMovementType, CashSessionRowKind, CashSessionStatus, CostSource, ExpenseKind, ExpenseStatus, InstallmentStatus, MovementType,
  PaymentStatus, SaleType, StockStatus, SupplierType,
} from "./apiTypes";

export const stockStatusLabel: Record<StockStatus, string> = { IN_STOCK: "En stock", LOW: "Bajo stock", OUT: "Sin stock" };

export const supplierTypeLabel: Record<SupplierType, string> = {
  MERCHANDISE: "Mercadería", MARKETPLACE: "Marketplace", SERVICE: "Servicio", PERSON: "Persona", OTHER: "Otro",
};

export const movementTypeLabel: Record<MovementType, string> = {
  PURCHASE_RECEIPT: "Ingreso por compra", SALE: "Venta", GIFT: "Regalo", RETURN: "Devolución",
  ADJUSTMENT: "Ajuste", DAMAGE: "Rotura",
};

export const saleTypeLabel: Record<SaleType, string> = {
  REGULAR: "Minorista", WHOLESALE: "Mayorista", GIFT: "Regalo", GIVEAWAY: "Sorteo", INTERNAL: "Uso interno",
};

export const adjustmentTypeLabel: Record<AdjustmentType, string> = {
  INTEREST: "Interés", DISCOUNT: "Descuento", CARD_SURCHARGE: "Recargo por tarjeta", WRITE_OFF: "Condonación",
};

export const accountTypeLabel: Record<AccountType, string> = {
  CASH: "Efectivo", BANK: "Banco", DIGITAL_WALLET: "Billetera virtual", SAVINGS: "Ahorro",
};

export const costSourceLabel: Record<CostSource, string> = {
  INITIAL: "Inicial", MANUAL: "Manual", PURCHASE_RECEIPT: "Compra",
};

export const expenseKindLabel: Record<ExpenseKind, string> = { FIXED: "Fijo", VARIABLE: "Variable" };

export const expenseStatusLabel: Record<ExpenseStatus, string> = {
  PAID: "Pagado", OVERDUE: "Vencido", IN_INSTALLMENTS: "En cuotas", PENDING: "Pendiente",
};

export const installmentStatusLabel: Record<InstallmentStatus, string> = {
  PAID: "Pagada", OVERDUE: "Vencida", PENDING: "Pendiente",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: "Pendiente", PARTIAL: "Parcial", PAID: "Pagada", "N/A": "No aplica", CANCELLED: "Anulada",
};

export const installmentAlertLabel: Record<"OVERDUE" | "DUE_SOON", string> = { OVERDUE: "Vencida", DUE_SOON: "Vence pronto" };

export const accountEntryTypeLabel: Record<AccountEntryType, string> = {
  SALE: "Venta", PAYMENT: "Pago", RETURN: "Devolución", REFUND: "Reintegro",
};

export const cashSessionStatusLabel: Record<CashSessionStatus, string> = {
  OPEN: "Abierta", PENDING_COUNT: "Pendiente de conteo", CLOSED: "Cerrada",
};

export const cashSessionRowKindLabel: Record<CashSessionRowKind, string> = {
  PAYMENT: "Cobro", REFUND: "Reintegro", EXPENSE_PAYMENT: "Pago de gasto", MOVEMENT: "Movimiento",
};

export const cashMovementTypeLabel: Record<CashMovementType, string> = {
  INCOME: "Ingreso", WITHDRAWAL: "Retiro", TRANSFER: "Pase entre cuentas",
};
