export interface Product {
  id: string;
  name: string;
  subtitle: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: "En stock" | "Bajo stock" | "Agotado";
}

export interface Sale {
  id: string;
  clientName: string;
  clientInitials: string;
  productName: string;
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
