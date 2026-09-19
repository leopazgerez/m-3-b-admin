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
  status: "Completada" | "Pendiente" | "Cancelada";
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
