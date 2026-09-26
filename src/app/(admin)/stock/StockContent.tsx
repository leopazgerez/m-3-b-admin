"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { useStore } from "@/lib/store";
import { Product, StockMovement } from "@/lib/types";
import {
  Boxes,
  PackagePlus,
  History,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
  Coffee,
  Truck,
  ArrowRight,
  Info,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

export default function StockContent() {
  const searchParams = useSearchParams();
  const {
    products,
    productCategories,
    supplierNames,
    stockMovements,
    restockProduct,
  } = useStore();

  const [activeTab, setActiveTab] = useState<"existencias" | "historial">("existencias");

  // Filter & Search states (Tab Existencias)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [selectedStatus, setSelectedStatus] = useState<string>("Todos");

  // Filter & Search states (Tab Historial)
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("Todos");

  // Re-stock Modal State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProductForRestock, setSelectedProductForRestock] = useState<Product | null>(null);
  const [restockQuantity, setRestockQuantity] = useState<string>("");
  const [restockCostUnit, setRestockCostUnit] = useState<string>("");
  const [restockSupplier, setRestockSupplier] = useState<string>("");
  const [restockNotes, setRestockNotes] = useState<string>("");
  const [restockDate, setRestockDate] = useState<string>("");
  const [registerExpense, setRegisterExpense] = useState<boolean>(true);
  const [restockSuccessFeedback, setRestockSuccessFeedback] = useState<string | null>(null);

  // Auto-open modal if URL query parameter productId is provided
  useEffect(() => {
    const paramProductId = searchParams.get("productId");
    if (paramProductId) {
      const match = products.find(
        (p) => p.id === paramProductId || p.sku.toLowerCase() === paramProductId.toLowerCase()
      );
      if (match) {
        openRestockModal(match);
      }
    }
  }, [searchParams, products]);

  // Open restock modal with clean state
  const openRestockModal = (product?: Product) => {
    const target = product || products[0] || null;
    setSelectedProductForRestock(target);
    setRestockQuantity("10");
    setRestockCostUnit(target?.listPrice ? target.listPrice.toString() : "");
    setRestockSupplier(target?.supplier || "");
    setRestockNotes("");
    setRegisterExpense(true);

    const now = new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    setRestockDate(now);

    setIsRestockModalOpen(true);
  };

  // Handle product selection change inside modal
  const handleProductChangeInModal = (prodId: string) => {
    const found = products.find((p) => p.id === prodId) || null;
    setSelectedProductForRestock(found);
    if (found && found.listPrice) {
      setRestockCostUnit(found.listPrice.toString());
    }
    if (found && found.supplier) {
      setRestockSupplier(found.supplier);
    }
  };

  // Submit restock
  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForRestock) return;

    const qty = parseInt(restockQuantity);
    if (!qty || qty <= 0) return;

    const costUnit = restockCostUnit ? parseFloat(restockCostUnit) : selectedProductForRestock.listPrice;

    restockProduct({
      productId: selectedProductForRestock.id,
      quantity: qty,
      costPerUnit: costUnit,
      supplier: restockSupplier || selectedProductForRestock.supplier || "Proveedor habitual",
      notes: restockNotes || "Reposición de stock",
      date: restockDate,
      registerExpense,
    });

    const successMsg = `¡Re-stock de +${qty} unidades registrado para ${selectedProductForRestock.name}!`;
    setRestockSuccessFeedback(successMsg);
    setTimeout(() => setRestockSuccessFeedback(null), 4000);

    setIsRestockModalOpen(false);
  };

  // KPIs
  const totalUnits = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock || 0), 0);
  }, [products]);

  const totalValuationCost = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock || 0) * (p.listPrice || 0), 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter(
      (p) =>
        p.status === "Bajo stock" ||
        (p.stock > 0 && p.stock <= (p.minStock !== undefined ? p.minStock : 10))
    ).length;
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter((p) => p.status === "Agotado" || p.stock === 0).length;
  }, [products]);

  // Filtered products for Tab Existencias
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === "Todas" || p.category === selectedCategory;
      const matchStatus =
        selectedStatus === "Todos" ||
        (selectedStatus === "En stock" && p.status === "En stock") ||
        (selectedStatus === "Bajo stock" && p.status === "Bajo stock") ||
        (selectedStatus === "Agotado" && (p.status === "Agotado" || p.stock === 0));

      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, searchTerm, selectedCategory, selectedStatus]);

  // Filtered history movements
  const filteredMovements = useMemo(() => {
    return stockMovements.filter((m) => {
      const matchSearch =
        m.productName.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
        m.sku.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
        (m.supplier && m.supplier.toLowerCase().includes(historySearchTerm.toLowerCase())) ||
        (m.notes && m.notes.toLowerCase().includes(historySearchTerm.toLowerCase()));
      const matchType = historyTypeFilter === "Todos" || m.type === historyTypeFilter;

      return matchSearch && matchType;
    });
  }, [stockMovements, historySearchTerm, historyTypeFilter]);

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-[#FBF8F2] min-h-screen">
      <Topbar
        title="Control de Stock"
        subtitle="Monitoreo de existencias, reposición y trazabilidad histórica"
        onSearch={(q) => setSearchTerm(q)}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto flex flex-col gap-6">
        {/* Header with Title and Restock action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading font-bold text-2xl text-[#231E1A] tracking-tight">
                Control de Stock
              </h1>
              <span className="bg-[#EADBC6] text-[#7A3F1F] font-semibold text-xs px-2.5 py-0.5 rounded-full">
                Inventario
              </span>
            </div>
            <p className="text-xs text-[#7A6F63] mt-1">
              Monitoreo de existencias, reposición y trazabilidad histórica de ingresos
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/productos"
              className="px-4 py-2 rounded-xl border border-[#E7DFD2] bg-white text-xs font-semibold text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors shadow-2xs"
            >
              Ver catálogo de productos
            </Link>
            <button
              onClick={() => openRestockModal()}
              className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Registrar re-stock</span>
            </button>
          </div>
        </div>

        {/* Success feedback toast */}
        {restockSuccessFeedback && (
          <div className="bg-[#EAF5EE] border border-[#3E8E5A]/30 text-[#2D6A42] p-4 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#3E8E5A] shrink-0" />
              <span className="font-medium">{restockSuccessFeedback}</span>
            </div>
            <button
              onClick={() => setRestockSuccessFeedback(null)}
              className="text-[#2D6A42] hover:text-[#1F4A2E] font-bold text-sm px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Unidades */}
          <div className="bg-white rounded-2xl p-5 border border-[#E7DFD2] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A6F63] uppercase tracking-wider">
                Unidades en Stock
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EADBC6] flex items-center justify-center text-[#9C5A2E]">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-heading text-[#231E1A]">
                {totalUnits.toLocaleString("es-AR")}{" "}
                <span className="text-xs font-normal text-[#A89C8C]">unidades</span>
              </div>
              <span className="text-[11px] text-[#A89C8C] mt-1 block">
                Distribuidas en {products.length} productos activos
              </span>
            </div>
          </div>

          {/* Valorización al Costo */}
          <div className="bg-white rounded-2xl p-5 border border-[#E7DFD2] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A6F63] uppercase tracking-wider">
                Valor del Stock (Costo)
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EAF5EE] flex items-center justify-center text-[#3E8E5A]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-heading text-[#231E1A]">
                ${totalValuationCost.toLocaleString("es-AR")}
              </div>
              <span className="text-[11px] text-[#3E8E5A] mt-1 block font-medium">
                Capital total inmovilizado
              </span>
            </div>
          </div>

          {/* Bajo stock */}
          <div className="bg-white rounded-2xl p-5 border border-[#E7DFD2] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A6F63] uppercase tracking-wider">
                Bajo Stock
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FBEFD9] flex items-center justify-center text-[#D98A2B]">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-heading text-[#D98A2B]">
                {lowStockCount}{" "}
                <span className="text-xs font-normal text-[#A89C8C]">artículos</span>
              </div>
              <span className="text-[11px] text-[#A89C8C] mt-1 block">
                Por debajo del umbral mínimo de seguridad
              </span>
            </div>
          </div>

          {/* Sin stock / Agotados */}
          <div className="bg-white rounded-2xl p-5 border border-[#E7DFD2] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A6F63] uppercase tracking-wider">
                Sin Stock (Agotados)
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F7E3DD] flex items-center justify-center text-[#C0492F]">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-heading text-[#C0492F]">
                {outOfStockCount}{" "}
                <span className="text-xs font-normal text-[#A89C8C]">artículos</span>
              </div>
              <span className="text-[11px] text-[#A89C8C] mt-1 block">
                Requieren reposición inmediata
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#E7DFD2] pb-1">
          <button
            onClick={() => setActiveTab("existencias")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "existencias"
                ? "bg-[#9C5A2E] text-white shadow-xs"
                : "text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#EADBC6]/30"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Existencias y Estado de Stock</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === "existencias"
                  ? "bg-white/20 text-white"
                  : "bg-[#E7DFD2] text-[#7A6F63]"
              }`}
            >
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("historial")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "historial"
                ? "bg-[#9C5A2E] text-white shadow-xs"
                : "text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#EADBC6]/30"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial de Reposiciones</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === "historial"
                  ? "bg-white/20 text-white"
                  : "bg-[#E7DFD2] text-[#7A6F63]"
              }`}
            >
              {stockMovements.length}
            </span>
          </button>
        </div>

        {/* TAB 1: EXISTENCIAS Y ESTADO DE STOCK */}
        {activeTab === "existencias" && (
          <div className="flex flex-col gap-4">
            {/* Filters bar */}
            <div className="bg-white rounded-2xl border border-[#E7DFD2] p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-[#A89C8C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre o SKU…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-all"
                />
              </div>

              {/* Status and Category Selects */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-[#7A6F63]">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#A89C8C]" />
                  <span>Estado:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-1.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] cursor-pointer"
                  >
                    <option value="Todos">Todos</option>
                    <option value="En stock">En stock</option>
                    <option value="Bajo stock">Bajo stock</option>
                    <option value="Agotado">Agotado</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[#7A6F63]">
                  <span>Categoría:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-1.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] cursor-pointer"
                  >
                    <option value="Todas">Todas</option>
                    {productCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table of Products Stock */}
            <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
              <div className="overflow-x-auto w-full">
                <div className="min-w-[920px]">
                  {/* Table Header */}
                  <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                    <div className="flex-1 min-w-[220px]">PRODUCTO</div>
                    <div className="w-28 shrink-0">CÓDIGO / SKU</div>
                    <div className="w-28 shrink-0">CATEGORÍA</div>
                    <div className="w-24 shrink-0 text-center">STOCK ACTUAL</div>
                    <div className="w-28 shrink-0">NIVEL / ESTADO</div>
                    <div className="w-36 shrink-0">ÚLTIMO RE-STOCK</div>
                    <div className="w-32 shrink-0 text-right">ACCIÓN</div>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-[#F7F3EC]">
                    {filteredProducts.length === 0 ? (
                      <div className="p-12 text-center text-[#7A6F63] text-sm">
                        No se encontraron productos con los filtros seleccionados.
                      </div>
                    ) : (
                      filteredProducts.map((p) => {
                        const minStock = p.minStock || 10;
                        const ratio = Math.min(100, Math.round((p.stock / Math.max(minStock * 2, 20)) * 100));

                        return (
                          <div
                            key={p.id}
                            className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                          >
                            {/* Product Info */}
                            <div className="flex-1 min-w-[220px] flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#EADBC6] flex items-center justify-center text-[#9C5A2E] shrink-0 shadow-inner">
                                <Coffee className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-semibold text-[#231E1A] truncate text-sm">
                                  {p.name}
                                </span>
                                <div className="flex items-center gap-1.5 text-[11px] text-[#A89C8C] truncate">
                                  <span className="truncate">{p.subtitle}</span>
                                  {p.supplier && (
                                    <>
                                      <span>·</span>
                                      <span className="text-[#9C5A2E] font-medium truncate flex items-center gap-1">
                                        <Truck className="w-3 h-3 shrink-0" />
                                        {p.supplier}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* SKU */}
                            <div className="w-28 shrink-0 font-mono text-xs text-[#7A6F63]">
                              {p.sku}
                            </div>

                            {/* Category */}
                            <div className="w-28 shrink-0 text-[#7A6F63]">
                              <span className="bg-[#FBF8F2] border border-[#E7DFD2] px-2.5 py-0.5 rounded-md text-xs">
                                {p.category}
                              </span>
                            </div>

                            {/* Current Stock */}
                            <div className="w-24 shrink-0 text-center">
                              <span
                                className={`text-base font-bold ${
                                  p.stock === 0
                                    ? "text-[#C0492F]"
                                    : p.stock <= minStock
                                    ? "text-[#D98A2B]"
                                    : "text-[#231E1A]"
                                }`}
                              >
                                {p.stock}
                              </span>
                              <span className="text-[10px] text-[#A89C8C] block">
                                mín. {minStock} u.
                              </span>
                            </div>

                            {/* Status with Progress bar */}
                            <div className="w-28 shrink-0 flex flex-col gap-1.5">
                              <Badge
                                variant={
                                  p.status === "En stock"
                                    ? "success"
                                    : p.status === "Bajo stock"
                                    ? "warning"
                                    : "danger"
                                }
                              >
                                {p.status}
                              </Badge>
                              {/* Stock ratio visual bar */}
                              <div className="w-full bg-[#E7DFD2]/60 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    p.stock === 0
                                      ? "bg-[#C0492F] w-0"
                                      : p.stock <= minStock
                                      ? "bg-[#D98A2B]"
                                      : "bg-[#3E8E5A]"
                                  }`}
                                  style={{ width: `${p.stock === 0 ? 0 : Math.max(12, ratio)}%` }}
                                />
                              </div>
                            </div>

                            {/* Last Restock / Ingress Date */}
                            <div className="w-36 shrink-0 flex flex-col text-[11px] text-[#7A6F63]">
                              {p.lastRestockDate ? (
                                <>
                                  <span className="font-medium text-[#231E1A]">
                                    {p.lastRestockDate}
                                  </span>
                                  <span className="text-[10px] text-[#3E8E5A]">Re-stock</span>
                                </>
                              ) : p.initialStockDate ? (
                                <>
                                  <span className="font-medium text-[#231E1A]">
                                    {p.initialStockDate}
                                  </span>
                                  <span className="text-[10px] text-[#7A6F63]">Ingreso inicial</span>
                                </>
                              ) : (
                                <span className="text-[#A89C8C]">Sin registros</span>
                              )}
                            </div>

                            {/* Action: Re-stock button */}
                            <div className="w-32 shrink-0 text-right">
                              <button
                                onClick={() => openRestockModal(p)}
                                className="inline-flex items-center gap-1.5 bg-[#9C5A2E]/10 hover:bg-[#9C5A2E] text-[#9C5A2E] hover:text-white px-3 py-1.5 rounded-xl font-semibold text-xs transition-all cursor-pointer"
                              >
                                <PackagePlus className="w-3.5 h-3.5" />
                                <span>Re-stock</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HISTORIAL DE REPOSICIONES Y MOVIMIENTOS */}
        {activeTab === "historial" && (
          <div className="flex flex-col gap-4">
            {/* Filter bar */}
            <div className="bg-white rounded-2xl border border-[#E7DFD2] p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-[#A89C8C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar en el historial por producto, SKU, proveedor o notas…"
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-all"
                />
              </div>

              {/* Type filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#7A6F63]">Tipo de ingreso:</span>
                <select
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className="bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-1.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] cursor-pointer"
                >
                  <option value="Todos">Todos los tipos</option>
                  <option value="Re-stock">Re-stock (Reposición)</option>
                  <option value="Ingreso inicial">Ingreso inicial (Alta)</option>
                </select>
              </div>
            </div>

            {/* Table of Movements */}
            <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
              <div className="overflow-x-auto w-full">
                <div className="min-w-[960px]">
                  {/* Table Header */}
                  <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                    <div className="w-36 shrink-0">FECHA Y HORA</div>
                    <div className="w-32 shrink-0">TIPO DE INGRESO</div>
                    <div className="flex-1 min-w-[200px]">PRODUCTO</div>
                    <div className="w-24 shrink-0 text-center">CANTIDAD</div>
                    <div className="w-32 shrink-0 text-center">STOCK ANTERIOR → NUEVO</div>
                    <div className="w-32 shrink-0 text-right">COSTO TOTAL</div>
                    <div className="w-48 shrink-0">PROVEEDOR / DETALLE</div>
                  </div>

                  {/* Movements Rows */}
                  <div className="divide-y divide-[#F7F3EC]">
                    {filteredMovements.length === 0 ? (
                      <div className="p-12 text-center text-[#7A6F63] text-sm">
                        No se registraron movimientos con los filtros seleccionados.
                      </div>
                    ) : (
                      filteredMovements.map((m) => (
                        <div
                          key={m.id}
                          className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                        >
                          {/* Date & Time */}
                          <div className="w-36 shrink-0 flex items-center gap-2 text-[#7A6F63]">
                            <Calendar className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                            <span className="font-medium text-[#231E1A]">{m.date}</span>
                          </div>

                          {/* Movement Type */}
                          <div className="w-32 shrink-0">
                            {m.type === "Re-stock" ? (
                              <span className="inline-flex items-center gap-1 bg-[#EAF5EE] text-[#2D6A42] border border-[#3E8E5A]/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                                <PackagePlus className="w-3 h-3 text-[#3E8E5A]" />
                                Re-stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-[#E8EEF5] text-[#2B5480] border border-[#3A6B9B]/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                                <Boxes className="w-3 h-3 text-[#3A6B9B]" />
                                Ingreso inicial
                              </span>
                            )}
                          </div>

                          {/* Product */}
                          <div className="flex-1 min-w-[200px] flex flex-col min-w-0">
                            <span className="font-semibold text-[#231E1A] truncate text-sm">
                              {m.productName}
                            </span>
                            <span className="text-[11px] text-[#A89C8C] font-mono">
                              SKU: {m.sku} · {m.category}
                            </span>
                          </div>

                          {/* Quantity */}
                          <div className="w-24 shrink-0 text-center">
                            <span className="inline-block bg-[#EAF5EE] text-[#2D6A42] font-bold px-2 py-0.5 rounded-md text-xs">
                              +{m.quantity} u.
                            </span>
                          </div>

                          {/* Previous -> New Stock */}
                          <div className="w-32 shrink-0 flex items-center justify-center gap-2 font-mono text-xs text-[#7A6F63]">
                            <span>{m.previousStock}</span>
                            <ArrowRight className="w-3 h-3 text-[#A89C8C]" />
                            <span className="font-bold text-[#231E1A]">{m.newStock}</span>
                          </div>

                          {/* Total Cost */}
                          <div className="w-32 shrink-0 text-right">
                            {m.totalCost ? (
                              <>
                                <span className="font-bold text-[#231E1A] block">
                                  ${m.totalCost.toLocaleString("es-AR")}
                                </span>
                                {m.costPerUnit && (
                                  <span className="text-[10px] text-[#A89C8C] block">
                                    ${m.costPerUnit.toLocaleString("es-AR")} / u.
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[#A89C8C]">—</span>
                            )}
                          </div>

                          {/* Supplier / Notes */}
                          <div className="w-48 shrink-0 flex flex-col min-w-0">
                            <div className="flex items-center gap-1 text-[#231E1A] font-medium truncate">
                              <Truck className="w-3 h-3 text-[#A89C8C] shrink-0" />
                              <span className="truncate">{m.supplier || "—"}</span>
                            </div>
                            {m.notes && (
                              <span className="text-[11px] text-[#A89C8C] truncate italic">
                                {m.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Registrar Re-stock */}
      <Modal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        title="Registrar Re-stock de Producto"
      >
        <form onSubmit={handleRestockSubmit} className="flex flex-col gap-4 text-xs">
          {/* Select Product */}
          <div>
            <label className="font-medium text-[#231E1A] block mb-1">
              Seleccionar Producto <span className="text-[#C0492F]">*</span>
            </label>
            <select
              value={selectedProductForRestock?.id || ""}
              onChange={(e) => handleProductChangeInModal(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Stock actual: {p.stock} u.
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock vs New Stock Preview Card */}
          {selectedProductForRestock && (
            <div className="bg-[#FBF8F2] border border-[#E7DFD2] rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-[#7A6F63] block">Stock actual</span>
                <span className="text-xl font-bold text-[#231E1A]">
                  {selectedProductForRestock.stock}{" "}
                  <span className="text-xs font-normal text-[#A89C8C]">unidades</span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-[#9C5A2E] font-bold">
                <span>+{parseInt(restockQuantity) || 0}</span>
                <ArrowRight className="w-4 h-4 text-[#A89C8C]" />
              </div>

              <div className="text-right">
                <span className="text-[11px] text-[#7A6F63] block">Nuevo stock resultante</span>
                <span className="text-xl font-bold text-[#3E8E5A]">
                  {selectedProductForRestock.stock + (parseInt(restockQuantity) || 0)}{" "}
                  <span className="text-xs font-normal text-[#A89C8C]">unidades</span>
                </span>
              </div>
            </div>
          )}

          {/* Quantity and Unit Cost Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[#231E1A] block mb-1">
                Cantidad a ingresar <span className="text-[#C0492F]">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="Ej. 15"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
            </div>

            <div>
              <label className="font-medium text-[#231E1A] block mb-1">
                Costo unitario ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Ej. 12500"
                value={restockCostUnit}
                onChange={(e) => setRestockCostUnit(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
            </div>
          </div>

          {/* Total Cost preview */}
          {parseInt(restockQuantity) > 0 && parseFloat(restockCostUnit) > 0 && (
            <div className="bg-[#EAF5EE] border border-[#3E8E5A]/20 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-[#2D6A42] font-medium">Inversión total del lote:</span>
              <span className="font-bold text-[#2D6A42] text-sm">
                ${((parseInt(restockQuantity) || 0) * (parseFloat(restockCostUnit) || 0)).toLocaleString("es-AR")}
              </span>
            </div>
          )}

          {/* Supplier and Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[#231E1A] block mb-1">
                Proveedor / Taller
              </label>
              <input
                type="text"
                list="restock-suppliers-list"
                placeholder="Ej. Taller Artesanal Salta"
                value={restockSupplier}
                onChange={(e) => setRestockSupplier(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
              <datalist id="restock-suppliers-list">
                {supplierNames.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="font-medium text-[#231E1A] block mb-1">
                Fecha del re-stock
              </label>
              <input
                type="text"
                value={restockDate}
                onChange={(e) => setRestockDate(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
            </div>
          </div>

          {/* Notes / Reason */}
          <div>
            <label className="font-medium text-[#231E1A] block mb-1">
              Notas / Referencia del lote (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Reposición para temporada alta, calabazas seleccionadas..."
              value={restockNotes}
              onChange={(e) => setRestockNotes(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
            />
          </div>

          {/* Expense checkbox integration */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FBF8F2] border border-[#E7DFD2] cursor-pointer hover:bg-[#F7F3EC] transition-colors">
            <input
              type="checkbox"
              checked={registerExpense}
              onChange={(e) => setRegisterExpense(e.target.checked)}
              className="w-4 h-4 text-[#9C5A2E] rounded border-[#E7DFD2] focus:ring-[#9C5A2E] cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-[#231E1A] text-xs">
                Registrar egreso contable en Gastos
              </span>
              <span className="text-[11px] text-[#7A6F63]">
                Genera automáticamente una entrada de egreso bajo el rubro Proveedores
              </span>
            </div>
          </label>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F7F3EC]">
            <button
              type="button"
              onClick={() => setIsRestockModalOpen(false)}
              className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer flex items-center gap-2"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Confirmar Re-stock</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
