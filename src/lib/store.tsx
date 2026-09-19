"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, Sale, Expense, Client } from "./types";
import { initialProducts, initialSales, initialClients } from "./data";
import { initialMovements } from "@/app/(admin)/gastos/page";

interface StoreContextType {
  products: Product[];
  sales: Sale[];
  clients: Client[];
  expenses: Expense[];
  productCategories: string[];
  saleTypes: string[];
  expenseTypes: string[];
  // Product actions
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  // Sale actions
  addSale: (sale: Omit<Sale, "id">) => void;
  updateSale: (id: string, sale: Partial<Sale>) => void;
  deleteSale: (id: string) => void;
  // Client actions
  addClient: (client: Omit<Client, "id">) => Client;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  // Configuration actions
  addProductCategory: (category: string) => void;
  deleteProductCategory: (category: string) => void;
  addSaleType: (type: string) => void;
  deleteSaleType: (type: string) => void;
  addExpenseType: (type: string) => void;
  deleteExpenseType: (type: string) => void;
}

const defaultProductCategories = ["Mates", "Bombillas", "Yerba", "Accesorios", "Termos", "Sets"];
const defaultSaleTypes = ["Efectivo", "Transferencia", "Tarjeta de débito", "Mercado Pago", "Tarjeta de crédito"];
const defaultExpenseTypes = ["Proveedores", "Embalaje", "Logística", "Publicidad", "Servicios", "Impuestos"];

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const initialExpenses: Expense[] = initialMovements.map((m) => ({
  id: m.id,
  description: m.desc,
  category: m.cat,
  date: m.date,
  type: m.type,
  amount: m.amount,
  status: m.status as "Pagado" | "Pendiente",
}));

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [productCategories, setProductCategories] = useState<string[]>(defaultProductCategories);
  const [saleTypes, setSaleTypes] = useState<string[]>(defaultSaleTypes);
  const [expenseTypes, setExpenseTypes] = useState<string[]>(defaultExpenseTypes);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage once on mount (client-side only, avoids SSR hydration mismatch)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedProds = localStorage.getItem("mates_admin_products");
        if (savedProds) {
          const parsed: Product[] = JSON.parse(savedProds);
          // Backfill listPrice for older cached items if missing
          const normalized = parsed.map((p) => ({
            ...p,
            listPrice:
              p.listPrice !== undefined
                ? p.listPrice
                : initialProducts.find((ip) => ip.id === p.id)?.listPrice ?? Math.round(p.price * 0.7),
          }));
          setProducts(normalized);
        }

        const savedSales = localStorage.getItem("mates_admin_sales");
        if (savedSales) setSales(JSON.parse(savedSales));

        const savedClients = localStorage.getItem("mates_admin_clients");
        if (savedClients) setClients(JSON.parse(savedClients));

        const savedExpenses = localStorage.getItem("mates_admin_expenses");
        if (savedExpenses) setExpenses(JSON.parse(savedExpenses));

        const savedCategories = localStorage.getItem("mates_admin_categories");
        if (savedCategories) setProductCategories(JSON.parse(savedCategories));

        const savedSaleTypes = localStorage.getItem("mates_admin_saletypes");
        if (savedSaleTypes) setSaleTypes(JSON.parse(savedSaleTypes));

        const savedExpenseTypes = localStorage.getItem("mates_admin_expensetypes");
        if (savedExpenseTypes) setExpenseTypes(JSON.parse(savedExpenseTypes));
      } catch (e) {
        console.error("Error reading localStorage", e);
      } finally {
        setIsLoaded(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Sync with LocalStorage only AFTER initial load has completed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mates_admin_products", JSON.stringify(products));
    }
  }, [products, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mates_admin_sales", JSON.stringify(sales));
    }
  }, [sales, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mates_admin_clients", JSON.stringify(clients));
    }
  }, [clients, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mates_admin_expenses", JSON.stringify(expenses));
    }
  }, [expenses, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mates_admin_categories", JSON.stringify(productCategories));
    }
  }, [productCategories, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mates_admin_saletypes", JSON.stringify(saleTypes));
    }
  }, [saleTypes, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mates_admin_expensetypes", JSON.stringify(expenseTypes));
    }
  }, [expenseTypes, isLoaded]);

  // Product CRUD
  const addProduct = (newProd: Omit<Product, "id">) => {
    const product: Product = {
      ...newProd,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [product, ...prev]);
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Sale CRUD
  const addSale = (newSale: Omit<Sale, "id">) => {
    const sale: Sale = {
      ...newSale,
      id: `sale-${Date.now()}`,
    };
    setSales((prev) => [sale, ...prev]);

    // Automatically decrement product stock if items were specified (POS checkout)
    if (newSale.items && newSale.items.length > 0) {
      setProducts((prev) =>
        prev.map((prod) => {
          const matchedItem = newSale.items?.find(
            (i) => i.productId === prod.id || i.sku === prod.sku
          );
          if (matchedItem) {
            const nextStock = Math.max(0, prod.stock - matchedItem.quantity);
            const nextStatus =
              nextStock === 0 ? "Agotado" : nextStock <= 10 ? "Bajo stock" : "En stock";
            return {
              ...prod,
              stock: nextStock,
              status: nextStatus,
            };
          }
          return prod;
        })
      );
    }
  };

  const updateSale = (id: string, updated: Partial<Sale>) => {
    setSales((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
    );
  };

  const deleteSale = (id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id));
  };

  // Client CRUD
  const addClient = (newClient: Omit<Client, "id">): Client => {
    const client: Client = {
      ...newClient,
      id: `cli-${Date.now()}`,
    };
    setClients((prev) => [client, ...prev]);
    return client;
  };

  const updateClient = (id: string, updated: Partial<Client>) => {
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  // Config actions
  const addProductCategory = (cat: string) => {
    if (!productCategories.includes(cat)) {
      setProductCategories((prev) => [...prev, cat]);
    }
  };

  const deleteProductCategory = (cat: string) => {
    setProductCategories((prev) => prev.filter((c) => c !== cat));
  };

  const addSaleType = (type: string) => {
    if (!saleTypes.includes(type)) {
      setSaleTypes((prev) => [...prev, type]);
    }
  };

  const deleteSaleType = (type: string) => {
    setSaleTypes((prev) => prev.filter((t) => t !== type));
  };

  const addExpenseType = (type: string) => {
    if (!expenseTypes.includes(type)) {
      setExpenseTypes((prev) => [...prev, type]);
    }
  };

  const deleteExpenseType = (type: string) => {
    setExpenseTypes((prev) => prev.filter((t) => t !== type));
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        sales,
        clients,
        expenses,
        productCategories,
        saleTypes,
        expenseTypes,
        addProduct,
        updateProduct,
        deleteProduct,
        addSale,
        updateSale,
        deleteSale,
        addClient,
        updateClient,
        deleteClient,
        addProductCategory,
        deleteProductCategory,
        addSaleType,
        deleteSaleType,
        addExpenseType,
        deleteExpenseType,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
