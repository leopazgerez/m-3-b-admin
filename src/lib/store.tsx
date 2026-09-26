"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, Sale, Expense, Client, ClientPayment, StockMovement, Supplier } from "./types";
import { initialProducts, initialSales, initialClients, initialStockMovements, initialSuppliers } from "./data";
import { initialMovements } from "@/app/(admin)/gastos/page";

interface StoreContextType {
  products: Product[];
  sales: Sale[];
  clients: Client[];
  expenses: Expense[];
  clientPayments: ClientPayment[];
  stockMovements: StockMovement[];
  productCategories: string[];
  suppliers: Supplier[];
  supplierNames: string[];
  saleTypes: string[];
  expenseTypes: string[];
  // Product actions
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  // Stock actions
  restockProduct: (params: {
    productId: string;
    variantId?: string;
    quantity: number;
    costPerUnit?: number;
    supplier?: string;
    notes?: string;
    date?: string;
    registerExpense?: boolean;
  }) => void;
  // Sale actions
  addSale: (sale: Omit<Sale, "id">) => void;
  updateSale: (id: string, sale: Partial<Sale>) => void;
  deleteSale: (id: string) => void;
  // Client actions
  addClient: (client: Omit<Client, "id">) => Client;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  // Payment actions
  registerPayment: (payment: Omit<ClientPayment, "id">) => void;
  settleTotalClientDebt: (clientId: string, clientName: string, method: string) => void;
  // Configuration actions
  addProductCategory: (category: string) => void;
  deleteProductCategory: (category: string) => void;
  addSupplier: (supplier: Omit<Supplier, "id">) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
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

// Bump this string whenever you change initialProducts, initialSales or initialClients
// so that cached localStorage data is replaced with the fresh seed on next load.
const DATA_VERSION = "2026-09-26-v6";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [clientPayments, setClientPayments] = useState<ClientPayment[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(initialStockMovements);
  const [productCategories, setProductCategories] = useState<string[]>(defaultProductCategories);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [saleTypes, setSaleTypes] = useState<string[]>(defaultSaleTypes);
  const [expenseTypes, setExpenseTypes] = useState<string[]>(defaultExpenseTypes);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage once on mount (client-side only, avoids SSR hydration mismatch)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // ── Data versioning: reset seed data when DATA_VERSION changes ──────
        const cachedVersion = localStorage.getItem("mates_admin_data_version");
        if (cachedVersion !== DATA_VERSION) {
          // Clear only the seed collections; preserve user config & payments
          localStorage.removeItem("mates_admin_products");
          localStorage.removeItem("mates_admin_sales");
          localStorage.removeItem("mates_admin_clients");
          localStorage.removeItem("mates_admin_client_payments");
          localStorage.removeItem("mates_admin_stock_movements");
          localStorage.removeItem("mates_admin_suppliers");
          localStorage.setItem("mates_admin_data_version", DATA_VERSION);
          // State is already initialised with initial* values — nothing more to do here
        } else {
          // ── Normal hydration from cache ─────────────────────────────────
          const savedProds = localStorage.getItem("mates_admin_products");
          if (savedProds) {
            const parsed: Product[] = JSON.parse(savedProds);
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

          const savedPayments = localStorage.getItem("mates_admin_client_payments");
          if (savedPayments) setClientPayments(JSON.parse(savedPayments));

          const savedStockMovements = localStorage.getItem("mates_admin_stock_movements");
          if (savedStockMovements) setStockMovements(JSON.parse(savedStockMovements));
        }

        // Config keys are always loaded regardless of data version
        const savedCategories = localStorage.getItem("mates_admin_categories");
        if (savedCategories) setProductCategories(JSON.parse(savedCategories));

        const savedSuppliers = localStorage.getItem("mates_admin_suppliers");
        if (savedSuppliers) {
          const parsed = JSON.parse(savedSuppliers);
          // Migrate legacy string[] to Supplier[] if needed
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
            const migrated: Supplier[] = parsed.map((name: string, i: number) => ({
              id: `sup-legacy-${i}`,
              name,
            }));
            setSuppliers(migrated);
          } else {
            setSuppliers(parsed);
          }
        }

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
      localStorage.setItem("mates_admin_client_payments", JSON.stringify(clientPayments));
    }
  }, [clientPayments, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mates_admin_stock_movements", JSON.stringify(stockMovements));
    }
  }, [stockMovements, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mates_admin_categories", JSON.stringify(productCategories));
    }
  }, [productCategories, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mates_admin_suppliers", JSON.stringify(suppliers));
    }
  }, [suppliers, isLoaded]);

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
    const productId = `prod-${Date.now()}`;
    const nowFormatted = new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

    const hasVariants = Boolean(newProd.hasVariants && newProd.variants && newProd.variants.length > 0);
    const calculatedStock = hasVariants
      ? newProd.variants!.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
      : (Number(newProd.stock) || 0);

    const minStock = newProd.minStock !== undefined ? newProd.minStock : 10;
    const initialStatus =
      calculatedStock === 0 ? "Agotado" : calculatedStock <= minStock ? "Bajo stock" : "En stock";

    const product: Product = {
      ...newProd,
      id: productId,
      stock: calculatedStock,
      minStock,
      status: initialStatus,
      initialStockDate: calculatedStock > 0 ? nowFormatted : undefined,
      lastRestockDate: undefined,
    };
    setProducts((prev) => [product, ...prev]);

    // Register initial stock movement(s)
    if (hasVariants && newProd.variants) {
      newProd.variants.forEach((v, idx) => {
        if (v.stock > 0) {
          const movement: StockMovement = {
            id: `smov-${Date.now()}-${idx}`,
            productId,
            variantId: v.id,
            variantName: v.name,
            productName: `${newProd.name} (${v.name})`,
            sku: v.sku || newProd.sku,
            category: newProd.category,
            type: "Ingreso inicial",
            quantity: v.stock,
            previousStock: 0,
            newStock: v.stock,
            date: nowFormatted,
            costPerUnit: v.listPrice || newProd.listPrice,
            totalCost: (v.listPrice || newProd.listPrice) ? (v.listPrice || newProd.listPrice)! * v.stock : undefined,
            supplier: newProd.supplier || "Ingreso inicial de catálogo",
            notes: `Alta inicial modelo ${v.name}`,
            registeredBy: "Leonel Paz",
          };
          setStockMovements((prev) => [movement, ...prev]);
        }
      });
    } else if (calculatedStock > 0) {
      const movement: StockMovement = {
        id: `smov-${Date.now()}`,
        productId,
        productName: newProd.name,
        sku: newProd.sku,
        category: newProd.category,
        type: "Ingreso inicial",
        quantity: calculatedStock,
        previousStock: 0,
        newStock: calculatedStock,
        date: nowFormatted,
        costPerUnit: newProd.listPrice,
        totalCost: newProd.listPrice ? newProd.listPrice * calculatedStock : undefined,
        supplier: newProd.supplier || "Ingreso inicial de catálogo",
        notes: "Alta inicial del producto en inventario",
        registeredBy: "Leonel Paz",
      };
      setStockMovements((prev) => [movement, ...prev]);
    }
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const hasVariants = updated.hasVariants !== undefined ? updated.hasVariants : p.hasVariants;
        const newVariants = updated.variants !== undefined ? updated.variants : p.variants;

        let newStock: number;
        if (hasVariants && newVariants && newVariants.length > 0) {
          newStock = newVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
        } else {
          newStock = updated.stock !== undefined ? updated.stock : p.stock;
        }

        const minStock = updated.minStock !== undefined ? updated.minStock : p.minStock || 10;
        const newStatus =
          updated.status !== undefined
            ? updated.status
            : newStock === 0
            ? "Agotado"
            : newStock <= minStock
            ? "Bajo stock"
            : "En stock";

        return {
          ...p,
          ...updated,
          hasVariants,
          variants: newVariants,
          stock: newStock,
          status: newStatus,
        };
      })
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Stock / Re-stock actions
  const restockProduct = ({
    productId,
    variantId,
    quantity,
    costPerUnit,
    supplier,
    notes,
    date,
    registerExpense = false,
  }: {
    productId: string;
    variantId?: string;
    quantity: number;
    costPerUnit?: number;
    supplier?: string;
    notes?: string;
    date?: string;
    registerExpense?: boolean;
  }) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct || quantity <= 0) return;

    const previousStock = targetProduct.stock;
    const newStock = previousStock + quantity;
    const minThreshold = targetProduct.minStock !== undefined ? targetProduct.minStock : 10;
    const newStatus =
      newStock === 0 ? "Agotado" : newStock <= minThreshold ? "Bajo stock" : "En stock";

    const movementDate =
      date ||
      new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());

    const unitCost = costPerUnit !== undefined ? costPerUnit : targetProduct.listPrice;
    const totalCost = unitCost ? unitCost * quantity : undefined;
    const resolvedSupplier = supplier || targetProduct.supplier || "Reposición de stock";

    const targetVariant =
      variantId && targetProduct.variants ? targetProduct.variants.find((v) => v.id === variantId) : null;

    const updatedVariants = targetProduct.variants
      ? targetProduct.variants.map((v) =>
          v.id === variantId ? { ...v, stock: v.stock + quantity } : v
        )
      : undefined;

    // 1. Update product with new stock, updated variants and lastRestockDate
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              stock: newStock,
              status: newStatus,
              lastRestockDate: movementDate,
              listPrice: unitCost !== undefined ? unitCost : p.listPrice,
              variants: updatedVariants || p.variants,
            }
          : p
      )
    );

    // 2. Register historical stock movement
    const movement: StockMovement = {
      id: `smov-${Date.now()}`,
      productId: targetProduct.id,
      variantId: targetVariant?.id,
      variantName: targetVariant?.name,
      productName: targetVariant ? `${targetProduct.name} (${targetVariant.name})` : targetProduct.name,
      sku: targetVariant?.sku || targetProduct.sku,
      category: targetProduct.category,
      type: "Re-stock",
      quantity,
      previousStock,
      newStock,
      date: movementDate,
      costPerUnit: unitCost,
      totalCost,
      supplier: resolvedSupplier,
      notes: notes || (targetVariant ? `Re-stock modelo ${targetVariant.name}` : "Reabastecimiento de existencias"),
      registeredBy: "Leonel Paz",
    };
    setStockMovements((prev) => [movement, ...prev]);

    // 3. Optionally register expense in Gastos module
    if (registerExpense && totalCost && totalCost > 0) {
      const expenseItem: Expense = {
        id: `exp-${Date.now()}`,
        description: `Re-stock: ${quantity}u. ${targetVariant ? `${targetProduct.name} (${targetVariant.name})` : targetProduct.name} (${resolvedSupplier})`,
        category: "Proveedores",
        date: movementDate.split(" ")[0] || "Hoy",
        type: "Egreso",
        amount: totalCost,
        status: "Pagado",
      };
      setExpenses((prev) => [expenseItem, ...prev]);
    }
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
            (i) =>
              i.productId === prod.id ||
              i.sku === prod.sku ||
              (prod.variants && prod.variants.some((v) => v.sku === i.sku || v.id === i.variantId))
          );
          if (matchedItem) {
            let nextVariants = prod.variants;
            if (prod.hasVariants && prod.variants) {
              nextVariants = prod.variants.map((v) => {
                if (v.id === matchedItem.variantId || v.sku === matchedItem.sku) {
                  return { ...v, stock: Math.max(0, v.stock - matchedItem.quantity) };
                }
                return v;
              });
            }
            const nextStock =
              nextVariants && prod.hasVariants
                ? nextVariants.reduce((sum, v) => sum + v.stock, 0)
                : Math.max(0, prod.stock - matchedItem.quantity);
            const minThreshold = prod.minStock !== undefined ? prod.minStock : 10;
            const nextStatus =
              nextStock === 0 ? "Agotado" : nextStock <= minThreshold ? "Bajo stock" : "En stock";
            return {
              ...prod,
              stock: nextStock,
              status: nextStatus,
              variants: nextVariants,
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

  // Payment actions
  const registerPayment = (newPayment: Omit<ClientPayment, "id">) => {
    const payment: ClientPayment = {
      ...newPayment,
      id: `pay-${Date.now()}`,
    };
    setClientPayments((prev) => [payment, ...prev]);

    if (newPayment.saleId) {
      // ── Payment tied to a specific sale ──────────────────────────────────
      setSales((prev) =>
        prev.map((s) => {
          if (s.id !== newPayment.saleId) return s;
          const alreadyPaid = s.paidAmount ?? 0;
          const newPaid = Math.min(s.amount, alreadyPaid + newPayment.amount);
          return {
            ...s,
            paidAmount: newPaid,
            status: newPaid >= s.amount ? "Completada" : s.status,
          };
        })
      );
    } else {
      // ── General payment: distribute across pending sales chronologically ──
      // This keeps KPI cards in sync (totalPaid / totalDebt derive from sales).
      let remaining = newPayment.amount;
      setSales((prev) => {
        const result = prev.map((s) => {
          if (remaining <= 0) return s;
          const isClientSale =
            s.clientId === newPayment.clientId ||
            s.clientName.toLowerCase() === newPayment.clientName.toLowerCase();
          if (!isClientSale || s.status !== "Pendiente") return s;

          const alreadyPaid = s.paidAmount ?? 0;
          const stillOwed = s.amount - alreadyPaid;
          const toApply = Math.min(remaining, stillOwed);
          remaining -= toApply;
          const newPaid = alreadyPaid + toApply;
          return {
            ...s,
            paidAmount: newPaid,
            status: newPaid >= s.amount ? ("Completada" as const) : s.status,
          };
        });
        return result;
      });
    }
  };

  const settleTotalClientDebt = (clientId: string, clientName: string, method: string) => {
    // Compute pending sales for this client
    const clientSales = sales.filter(
      (s) =>
        (s.clientId === clientId || s.clientName.toLowerCase() === clientName.toLowerCase()) &&
        s.status === "Pendiente"
    );
    const debtAmount = clientSales.reduce((acc, s) => acc + (s.amount - (s.paidAmount ?? 0)), 0);
    if (debtAmount <= 0) return;

    // Mark all pending sales as Completada
    setSales((prev) =>
      prev.map((s) => {
        const isClientSale =
          s.clientId === clientId || s.clientName.toLowerCase() === clientName.toLowerCase();
        if (isClientSale && s.status === "Pendiente") {
          return { ...s, paidAmount: s.amount, status: "Completada" as const };
        }
        return s;
      })
    );

    // Register a single payment entry for the full amount
    const payment: ClientPayment = {
      id: `pay-${Date.now()}`,
      clientId,
      clientName,
      date: "Hoy",
      amount: debtAmount,
      method,
      notes: "Cancelación total de deuda",
    };
    setClientPayments((prev) => [payment, ...prev]);
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

  const addSupplier = (newSupplier: Omit<Supplier, "id">) => {
    const trimmed = newSupplier.name.trim();
    if (!trimmed) return;
    const exists = suppliers.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      const supplier: Supplier = {
        ...newSupplier,
        id: `sup-${Date.now()}`,
        name: trimmed,
      };
      setSuppliers((prev) => [...prev, supplier]);
    }
  };

  const updateSupplier = (id: string, updated: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
    );
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  const addExpenseType = (type: string) => {
    if (!expenseTypes.includes(type)) {
      setExpenseTypes((prev) => [...prev, type]);
    }
  };

  const deleteExpenseType = (type: string) => {
    setExpenseTypes((prev) => prev.filter((t) => t !== type));
  };

  // Derived: list of supplier names for datalists / autocomplete
  const supplierNames = suppliers.map((s) => s.name);

  return (
    <StoreContext.Provider
      value={{
        products,
        sales,
        clients,
        expenses,
        clientPayments,
        stockMovements,
        productCategories,
        suppliers,
        supplierNames,
        saleTypes,
        expenseTypes,
        addProduct,
        updateProduct,
        deleteProduct,
        restockProduct,
        addSale,
        updateSale,
        deleteSale,
        addClient,
        updateClient,
        deleteClient,
        registerPayment,
        settleTotalClientDebt,
        addProductCategory,
        deleteProductCategory,
        addSupplier,
        updateSupplier,
        deleteSupplier,
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
