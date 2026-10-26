// Shapes of m3b-api's JSON, from the Java records under com.m3b.api.**. Instants are ISO UTC strings,
// LocalDate is YYYY-MM-DD. Request bodies: an absent key is Java null (backend defaults apply).

// ── Enums ──
export type StockStatus = "IN_STOCK" | "LOW" | "OUT";
export type SupplierType = "MERCHANDISE" | "MARKETPLACE" | "SERVICE" | "PERSON" | "OTHER";
export type MovementType = "PURCHASE_RECEIPT" | "SALE" | "GIFT" | "RETURN" | "ADJUSTMENT" | "DAMAGE";
export type SaleType = "REGULAR" | "WHOLESALE" | "GIFT" | "GIVEAWAY" | "INTERNAL";
export type AdjustmentType = "INTEREST" | "DISCOUNT" | "CARD_SURCHARGE" | "WRITE_OFF";
export type AccountType = "CASH" | "BANK" | "DIGITAL_WALLET" | "SAVINGS";
export type CostSource = "INITIAL" | "MANUAL" | "PURCHASE_RECEIPT";
export type ExpenseKind = "FIXED" | "VARIABLE";
export type ExpenseStatus = "PAID" | "OVERDUE" | "IN_INSTALLMENTS" | "PENDING";
export type InstallmentStatus = "PAID" | "OVERDUE" | "PENDING";
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "N/A" | "CANCELLED";
export type AccountEntryType = "SALE" | "PAYMENT";

// ── Auth ── (UserResponse, LoginResponse)
export interface CurrentUser { id: number; email: string; fullName: string }
export interface LoginResponse { accessToken: string; expiresAt: string; user: CurrentUser }
export interface LoginRequest { email: string; password: string }

// ── Catalog ── (catalog CategoryView, ProductView, VariantView, VariantLookup, CostEntryView)
export interface ProductCategory { id: number; name: string; productCount: number }
export interface Variant {
  id: number; name: string; sku: string | null; price: number; cost: number; active: boolean;
  onHand: number; status: StockStatus;
}
export interface Product {
  id: number; name: string; subtitle: string | null; categoryId: number | null; categoryName: string | null;
  minStock: number; defaultSupplierId: number | null; defaultSupplierName: string | null; active: boolean;
  hasVariants: boolean; onHand: number; status: StockStatus; createdAt: string; variants: Variant[];
}
export interface VariantLookup { variantId: number; product: Product }
export interface CostHistoryEntry {
  id: number; unitCost: number; effectiveAt: string; source: CostSource; movementId: number | null;
  createdAt: string; createdBy: string | null;
}
export interface CategoryRequest { name: string }
export interface VariantDraft { name?: string; sku?: string; price?: number; cost?: number; initialStock?: number }
/** Simple product: sku/price/cost/initialStock at top level; with models: variants. Not both. */
export interface CreateProductRequest {
  name: string; subtitle?: string; categoryId?: number; minStock?: number; defaultSupplierId?: number;
  sku?: string; price?: number; cost?: number; initialStock?: number; variants?: VariantDraft[];
}
/** PATCH: absent keeps the value; subtitle "" clears it. */
export interface UpdateProductCommand {
  name?: string; subtitle?: string; categoryId?: number; minStock?: number; defaultSupplierId?: number; active?: boolean;
}
/** PATCH: absent keeps the value; sku "" clears it. */
export interface UpdateVariantCommand { name?: string; sku?: string; price?: number; cost?: number; active?: boolean }

// ── Suppliers ── (SupplierView, SupplierFields)
export interface Supplier {
  id: number; name: string; type: SupplierType | null; contactName: string | null; phone: string | null;
  email: string | null; city: string | null; category: string | null; notes: string | null; active: boolean;
  productCount: number; lastActivityOn: string | null;
}
/** Create: name required. PATCH: absent keeps the value, "" clears an optional field. */
export interface SupplierFields {
  name?: string; type?: SupplierType; contactName?: string; phone?: string; email?: string; city?: string;
  category?: string; notes?: string; active?: boolean;
}

// ── Inventory ── (StockItemView, StockSummary, MovementView, RestockResult, StockAdjustmentResult)
export interface StockRow {
  variantId: number; productId: number; productName: string; variantName: string; sku: string | null;
  categoryId: number | null; categoryName: string | null; supplierId: number | null; supplierName: string | null;
  onHand: number; minStock: number; status: StockStatus; unitCost: number | null;
}
export interface StockSummary { totalUnits: number; costValuation: number; lowCount: number; outCount: number }
export interface StockMovement {
  id: number; movedAt: string; type: MovementType; quantity: number; variantId: number; productId: number;
  productName: string; variantName: string; sku: string | null; unitCost: number | null; totalCost: number | null;
  supplierId: number | null; supplierName: string | null; purchaseOrderId: number | null; saleId: number | null;
  notes: string | null; createdBy: string | null;
}
export interface RestockResult {
  movementId: number; purchaseOrderId: number; variantId: number; quantity: number; unitCost: number;
  totalCost: number; onHand: number; expenseId: number | null;
}
/** quantity is signed; onHand is the stock after the movement. */
export interface AdjustmentResult { movementId: number; variantId: number; type: MovementType; quantity: number; onHand: number }
/** accountId absent → the method's default account; paidAt absent → now. */
export interface PayNow { paymentMethodId: number; accountId?: number; paidAt?: string }
/** supplierId absent → product's default supplier; receivedAt absent → now; expenseCategoryId required. */
export interface RestockRequest {
  variantId: number; quantity: number; unitCost: number; supplierId?: number; receivedAt?: string; notes?: string;
  expenseCategoryId: number; installments?: number; firstDueDate?: string; payFirstNow?: PayNow;
}
/** DAMAGE: quantity > 0 units out; ADJUSTMENT: signed, ≠ 0. notes (the reason) required, ≤ 500. */
export interface StockAdjustmentRequest { variantId: number; type: "DAMAGE" | "ADJUSTMENT"; quantity: number; notes: string }

// ── Customers & finance ── (CustomerView, AccountEntry, PaymentView, PaymentMethodView, FinancialAccountView)
export interface Customer {
  id: number; firstName: string; lastName: string | null; fullName: string; dni: string | null; phone: string | null;
  email: string | null; notes: string | null; orderCount: number; totalPurchased: number; totalPaid: number;
  outstanding: number; lastPurchaseAt: string | null; createdAt: string;
}
/** POST: firstName required. PATCH: a key sent as null clears that field. */
export interface CustomerFields {
  firstName?: string; lastName?: string | null; dni?: string | null; phone?: string | null; email?: string | null;
  notes?: string | null;
}
/** balance: the customer's debt right after this entry. */
export interface AccountEntry {
  type: AccountEntryType; id: number; at: string; description: string; debit: number; credit: number; balance: number;
}
export interface PaymentAllocation { saleId: number; amount: number }
export interface Payment {
  id: number; customerId: number | null; customerName: string | null; amount: number; paymentMethodId: number;
  paymentMethodName: string; accountId: number | null; accountName: string | null; paidAt: string;
  notes: string | null; allocations: PaymentAllocation[];
}
/** amount and paymentMethodId required; accountId defaults to the method's, paidAt to now. */
export interface PaymentFields {
  amount: number; paymentMethodId: number; accountId?: number; paidAt?: string; notes?: string; saleId?: number;
}
/** surchargePct: 10 = 10%. */
export interface PaymentMethod {
  id: number; code: string; name: string; surchargePct: number; defaultAccountId: number | null;
  defaultAccountName: string | null;
}
/** Create: all required. PATCH: absent keeps the value. */
export interface PaymentMethodFields { name?: string; surchargePct?: number; defaultAccountId?: number }
export interface FinancialAccount { id: number; name: string; type: AccountType }
export interface FinancialAccountFields { name?: string; type?: AccountType }

// ── Sales ── (SaleResponse)
export interface SaleLine {
  id: number; variantId: number; promotionId: number | null; quantity: number; unitPrice: number; unitCost: number;
  subtotal: number;
}
export interface SaleAdjustment { type: AdjustmentType; amount: number; appliedAt: string; notes: string | null }
export interface SalePaymentLine { paymentId: number; amount: number; paymentMethodName: string }
export interface Sale {
  id: number; customerId: number | null; customerName: string | null; soldAt: string; type: SaleType;
  notes: string | null; lines: SaleLine[]; adjustments: SaleAdjustment[]; grossTotal: number;
  adjustmentTotal: number; totalDue: number; costTotal: number; grossMargin: number; paymentStatus: PaymentStatus;
  totalPaid: number; outstanding: number; cancelledAt: string | null; payments: SalePaymentLine[];
}
export interface RegisterSaleRequest {
  customerId?: number; soldAt?: string; type: SaleType; notes?: string;
  lines: { variantId: number; quantity: number; promotionId?: number }[];
  adjustments?: { type: AdjustmentType; amount: number; notes?: string }[];
  payments?: { paymentMethodId: number; amount: number; accountId?: number; notes?: string }[];
}

// ── Expenses ── (expense CategoryView, ExpenseRow, ExpenseView, ExpenseSummary)
export interface ExpenseCategory {
  id: number; name: string; description: string | null; isBusiness: boolean; isCapex: boolean; expenseCount: number;
}
/** POST: name required; isBusiness defaults to true, isCapex to false. PATCH: null clears description. */
export interface CategoryFields { name?: string; description?: string | null; isBusiness?: boolean; isCapex?: boolean }
export interface ExpenseRow {
  id: number; categoryId: number; categoryName: string; kind: ExpenseKind; supplierId: number | null;
  supplierName: string | null; description: string; incurredOn: string; restockId: number | null; total: number;
  paid: number; pending: number; status: ExpenseStatus; installmentCount: number;
}
export interface ExpenseInstallmentPayment {
  id: number; amount: number; paymentMethodName: string; accountName: string | null; paidAt: string; notes: string | null;
}
export interface ExpenseInstallment {
  no: number; dueDate: string | null; amount: number; paid: number; status: InstallmentStatus;
  payments: ExpenseInstallmentPayment[];
}
export interface Expense {
  id: number; categoryId: number; categoryName: string; kind: ExpenseKind; supplierId: number | null;
  supplierName: string | null; description: string; incurredOn: string; notes: string | null;
  restockId: number | null; total: number; paid: number; pending: number; status: ExpenseStatus;
  installments: ExpenseInstallment[];
}
/** POST: kind defaults to VARIABLE, installments to 1. PATCH: header fields only, null clears. */
export interface ExpenseFields {
  categoryId?: number; kind?: ExpenseKind; supplierId?: number | null; description?: string; incurredOn?: string;
  amount?: number; installments?: number; firstDueDate?: string; notes?: string | null; payFirstNow?: PayNow;
}
/** accountId absent → method's default; paidAt → now; amount → what the installment still owes. */
export interface ExpensePaymentFields {
  paymentMethodId: number; accountId?: number; paidAt?: string; amount?: number; notes?: string;
}
export interface ExpenseSummaryLine {
  categoryId: number; name: string; isBusiness: boolean; total: number; paid: number; pending: number; pct: number;
}
export interface ExpenseSummary {
  from: string | null; to: string | null; total: number; paid: number; pending: number; categories: ExpenseSummaryLine[];
}
/** One line of GET /expense-payments; installmentCount is the expense's, for "cuota 2 de 3". */
export interface ExpensePaymentRow {
  id: number; paidAt: string; amount: number; paymentMethodId: number; paymentMethodName: string;
  accountId: number | null; accountName: string | null; notes: string | null; expenseId: number;
  expenseDescription: string; categoryName: string; installmentNo: number; installmentCount: number;
}
export interface ExpensePaymentSummaryLine { paymentMethodId: number; name: string; total: number; pct: number }
export interface ExpensePaymentSummary {
  from: string | null; to: string | null; total: number; methods: ExpensePaymentSummaryLine[];
}

export interface SalesSummary {
  from: string; to: string;
  sales: { count: number; total: number; cost: number; grossProfit: number; grossMarginPct: number | null };
  expenses: { total: number };
  net: number; netMarginPct: number | null;
  cash: { collected: number; paid: number; net: number };
}
export interface MonthlyBalance { month: string; income: number; expenses: number }
export interface CategorySalesLine { categoryId: number | null; name: string; units: number; total: number; pct: number | null }
export interface CategorySales { from: string; to: string; total: number; categories: CategorySalesLine[] }
export interface AlertStock {
  variantId: number; productId: number; product: string; variantName: string; sku: string | null;
  onHand: number; minStock: number; status: "OUT" | "LOW";
}
export interface AlertInstallment {
  expenseId: number; installmentNo: number; description: string; dueDate: string;
  amount: number; pending: number; status: "OVERDUE" | "DUE_SOON";
}
export interface Alerts { stock: AlertStock[]; installments: AlertInstallment[] }
