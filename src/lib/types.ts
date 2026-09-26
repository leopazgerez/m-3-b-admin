export interface Product {
  id: string;
  name: string;
  subtitle: string;
  sku: string;
  category: string;
  listPrice?: number; // Precio de lista / costo
  price: number; // Precio de venta al público
  stock: number;
  status: "En stock" | "Bajo stock" | "Agotado";
  minStock?: number; // Umbral de stock mínimo personalizado para alerta de bajo stock
  supplier?: string; // Proveedor principal o taller asociado
  initialStockDate?: string; // Fecha en la que se dio de alta / ingresó por primera vez
  lastRestockDate?: string; // Fecha del último re-stock
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  city?: string;
  category?: string;
  notes?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  type: "Ingreso inicial" | "Re-stock";
  quantity: number; // Unidades agregadas (+)
  previousStock: number;
  newStock: number;
  date: string; // Fecha y hora del movimiento
  costPerUnit?: number; // Costo por unidad al momento del ingreso
  totalCost?: number; // Costo total del lote (quantity * costPerUnit)
  supplier?: string; // Proveedor o taller de procedencia
  notes?: string; // Notas o motivo de la reposición
  registeredBy?: string; // Usuario responsable
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Client {
  id: string;
  name: string;
  initials: string;
  phone?: string;
  email?: string;
  dni?: string;
}

export interface Sale {
  id: string;
  clientId?: string;
  clientName: string;
  clientInitials: string;
  clientPhone?: string;
  clientEmail?: string;
  clientDni?: string;
  productName: string;
  items?: SaleItem[];
  date: string;
  method: string;
  amount: number;
  paidAmount?: number; // Monto ya abonado (para ventas fiadas / pagos parciales)
  status: "Completada" | "Pendiente" | "Cancelada";
}

export interface ClientPayment {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  amount: number;
  method: string; // Efectivo, Transferencia, Mercado Pago, etc.
  saleId?: string; // Si cancela una venta puntual
  notes?: string;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  date: string;
  type: "Ingreso" | "Egreso";
  amount: number;
  status: "Pagado" | "Pendiente";
}

export interface MonthlyBalance {
  month: string;
  income: number;
  expense: number;
}
