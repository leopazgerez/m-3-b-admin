"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, Sale, Expense } from "./types";
import { initialProducts, initialSales } from "./data";
import { initialMovements } from "@/app/(admin)/gastos/page";

interface StoreContextType {
  products: Product[];
  sales: Sale[];
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

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mates_admin_products");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return initialProducts;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mates_admin_sales");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return initialSales;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mates_admin_expenses");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return initialMovements;
  });

  const [productCategories, setProductCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mates_admin_categories");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return defaultProductCategories;
  });

  const [saleTypes, setSaleTypes] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mates_admin_saletypes");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return defaultSaleTypes;
  });

  const [expenseTypes, setExpenseTypes] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mates_admin_expensetypes");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return defaultExpenseTypes;
  });

  // Sync with LocalStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mates_admin_products", JSON.stringify(products));
    }
  }, [products]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mates_admin_sales", JSON.stringify(sales));
    }
  }, [sales]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mates_admin_expenses", JSON.stringify(expenses));
    }
  }, [expenses]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mates_admin_categories", JSON.stringify(productCategories));
    }
  }, [productCategories]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mates_admin_saletypes", JSON.stringify(saleTypes));
    }
  }, [saleTypes]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mates_admin_expensetypes", JSON.stringify(expenseTypes));
    }
  }, [expenseTypes]);

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
  };

  const updateSale = (id: string, updated: Partial<Sale>) => {
    setSales((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
    );
  };

  const deleteSale = (id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id));
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
