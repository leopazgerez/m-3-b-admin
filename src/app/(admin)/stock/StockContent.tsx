"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  SlidersHorizontal,
  Layers,
  Tag,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, Pager, StatusBadge } from "@/components/ui";
import FilterPanel from "@/components/ui/FilterPanel";
import { api } from "@/lib/api";
import { useApiResource, useOptions, usePagedList } from "@/lib/useApi";
import { instantRangeCriteria, type Criterion } from "@/lib/apiQuery";
import { movementTypeLabel, stockStatusLabel } from "@/lib/labels";
import { money, variantLabel } from "@/lib/format";
import { formatInstant } from "@/lib/dateUtils";
import type {
  MovementType, ProductCategory, StockMovement, StockRow, StockStatus, StockSummary, Supplier,
} from "@/lib/apiTypes";
import RestockModal from "./RestockModal";
import AdjustmentModal from "./AdjustmentModal";

const STATUSES = Object.keys(stockStatusLabel) as StockStatus[];
const MOVEMENT_TYPES = Object.keys(movementTypeLabel) as MovementType[];
const filterSelectCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer";
const searchCls =
  "w-full bg-white border border-[#E7DFD2] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-all shadow-2xs";

// positive integer from a query param, else undefined (old links carried string ids)
const idParam = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

function useDebounced(value: string) {
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 300);
    return () => clearTimeout(t);
  }, [value]);
  return debounced;
}

type Sort = { by: string; dir: "asc" | "desc" };

function SortHeader({ sort, setSort, field, label, className }: {
  sort: Sort; setSort: (s: Sort) => void; field: string; label: string; className: string;
}) {
  return (
    <button
      type="button"
      onClick={() => setSort(sort.by === field ? { by: field, dir: sort.dir === "asc" ? "desc" : "asc" } : { by: field, dir: "asc" })}
      className={`${className} flex items-center gap-1 font-semibold hover:text-[#9C5A2E] cursor-pointer`}
    >
      {label}
      {sort.by === field && (sort.dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
    </button>
  );
}

type RestockState = { row?: StockRow; productId?: number; variantId?: number };

export default function StockContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"existencias" | "historial">("existencias");

  // Existencias
  const [searchTerm, setSearchTerm] = useState("");
  const search = useDebounced(searchTerm);
  const [stockSort, setStockSort] = useState<Sort>({ by: "productName", dir: "asc" });
  const [isStockFilterOpen, setIsStockFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");

  // Historial
  const [historyTerm, setHistoryTerm] = useState("");
  const historySearch = useDebounced(historyTerm);
  const [historySort, setHistorySort] = useState<Sort>({ by: "movedAt", dir: "desc" });
  const [isHistoryFilterOpen, setIsHistoryFilterOpen] = useState(false);
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState<number | undefined>();

  // Modals
  const [restock, setRestock] = useState<RestockState | null>(null);
  const [adjusting, setAdjusting] = useState<{ row?: StockRow } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // /stock?productId=X[&variantId=Y] (from Productos) opens the restock modal with that variant preselected
  const paramKey = searchParams.toString();
  const [seenParams, setSeenParams] = useState<string | null>(null);
  if (seenParams !== paramKey) {
    setSeenParams(paramKey);
    const productId = idParam(searchParams.get("productId"));
    const variantId = idParam(searchParams.get("variantId"));
    if (productId !== undefined || variantId !== undefined) setRestock({ productId, variantId });
    // /stock?tab=historial&purchaseOrderId=N (from a restock expense) lists that purchase's movements
    const po = idParam(searchParams.get("purchaseOrderId"));
    if (po !== undefined) { setPurchaseOrderId(po); setActiveTab("historial"); }
  }

  const stockFilters: Criterion[] = [
    ...(statusFilter ? [{ field: "status", operator: "EQUALS" as const, value: statusFilter }] : []),
    ...(categoryFilter ? [{ field: "categoryId", operator: "EQUALS" as const, value: Number(categoryFilter) }] : []),
    ...(supplierFilter ? [{ field: "supplierId", operator: "EQUALS" as const, value: Number(supplierFilter) }] : []),
  ];
  const stock = usePagedList<StockRow>("/stock", {
    sortBy: stockSort.by,
    sortDir: stockSort.dir,
    search: search || undefined,
    filters: stockFilters,
  });

  const historyFilters: Criterion[] = [
    ...(typeFilter ? [{ field: "type", operator: "EQUALS" as const, value: typeFilter }] : []),
    ...(purchaseOrderId !== undefined ? [{ field: "purchaseOrderId", operator: "EQUALS" as const, value: purchaseOrderId }] : []),
    ...instantRangeCriteria("movedAt", historyDateFrom || undefined, historyDateTo || undefined),
  ];
  const movements = usePagedList<StockMovement>("/stock/movements", {
    sortBy: historySort.by,
    sortDir: historySort.dir,
    search: historySearch || undefined,
    filters: historyFilters,
  });

  const summary = useApiResource(() => api.getOne<StockSummary>("/stock/summary"), []);
  const categories = useOptions<ProductCategory>("/product-categories");
  const suppliers = useOptions<Supplier>("/suppliers");
  const optionsError = categories.error ?? suppliers.error;

  const stockActiveCount = (statusFilter ? 1 : 0) + (categoryFilter ? 1 : 0) + (supplierFilter ? 1 : 0);
  const historyActiveCount = (historyDateFrom ? 1 : 0) + (historyDateTo ? 1 : 0) + (typeFilter ? 1 : 0) + (purchaseOrderId !== undefined ? 1 : 0);

  const handleDone = (message: string) => {
    setRestock(null);
    setAdjusting(null);
    setFeedback(message);
    stock.reload();
    movements.reload();
    summary.reload();
  };

  const s = summary.data;

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-[#FBF8F2] min-h-screen">
      <Topbar
        title="Control de Stock"
        subtitle="Monitoreo de existencias, reposición y trazabilidad histórica"
        onSearch={setSearchTerm}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto flex flex-col gap-6">
        {/* Header with Title and actions */}
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
              Monitoreo de existencias, reposición y trazabilidad histórica de movimientos
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
              onClick={() => setAdjusting({})}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E7DFD2] bg-white text-xs font-semibold text-[#9C5A2E] hover:bg-[#FBF8F2] transition-colors shadow-2xs cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Registrar ajuste</span>
            </button>
            <button
              onClick={() => setRestock({})}
              className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Registrar re-stock</span>
            </button>
          </div>
        </div>

        {/* Success feedback */}
        {feedback && (
          <div className="bg-[#EAF5EE] border border-[#3E8E5A]/30 text-[#2D6A42] p-4 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#3E8E5A] shrink-0" />
              <span className="font-medium">{feedback}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-[#2D6A42] hover:text-[#1F4A2E] font-bold text-sm px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <ApiErrorBanner error={summary.error} onRetry={summary.reload} />

        {/* KPI Cards (GET /stock/summary) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#E7DFD2] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A6F63] uppercase tracking-wider">Unidades en Stock</span>
              <div className="w-8 h-8 rounded-lg bg-[#EADBC6] flex items-center justify-center text-[#9C5A2E]">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-heading text-[#231E1A]">
                {s ? s.totalUnits.toLocaleString("es-AR") : "—"}{" "}
                <span className="text-xs font-normal text-[#A89C8C]">unidades</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E7DFD2] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A6F63] uppercase tracking-wider">Valor del Stock (Costo)</span>
              <div className="w-8 h-8 rounded-lg bg-[#EAF5EE] flex items-center justify-center text-[#3E8E5A]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-heading text-[#231E1A]">{s ? money(s.costValuation) : "—"}</div>
              <span className="text-[11px] text-[#3E8E5A] mt-1 block font-medium">Capital total inmovilizado</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E7DFD2] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A6F63] uppercase tracking-wider">Bajo Stock</span>
              <div className="w-8 h-8 rounded-lg bg-[#FBEFD9] flex items-center justify-center text-[#D98A2B]">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-heading text-[#D98A2B]">
                {s ? s.lowCount : "—"} <span className="text-xs font-normal text-[#A89C8C]">artículos</span>
              </div>
              <span className="text-[11px] text-[#A89C8C] mt-1 block">En o por debajo del stock mínimo</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E7DFD2] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A6F63] uppercase tracking-wider">Sin Stock (Agotados)</span>
              <div className="w-8 h-8 rounded-lg bg-[#F7E3DD] flex items-center justify-center text-[#C0492F]">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-heading text-[#C0492F]">
                {s ? s.outCount : "—"} <span className="text-xs font-normal text-[#A89C8C]">artículos</span>
              </div>
              <span className="text-[11px] text-[#A89C8C] mt-1 block">Requieren reposición inmediata</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#E7DFD2] pb-1">
          {([
            ["existencias", Boxes, "Existencias y Estado de Stock"],
            ["historial", History, "Historial de Movimientos"],
          ] as const).map(([tab, Icon, text]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-[#9C5A2E] text-white shadow-xs"
                  : "text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#EADBC6]/30"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{text}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: EXISTENCIAS */}
        {activeTab === "existencias" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1 min-w-0 max-w-3xl">
                <FilterPanel
                  isOpen={isStockFilterOpen}
                  onToggle={() => setIsStockFilterOpen(!isStockFilterOpen)}
                  activeCount={stockActiveCount}
                  onReset={() => { setStatusFilter(""); setCategoryFilter(""); setSupplierFilter(""); }}
                  resultCount={stock.total}
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#231E1A] flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-[#9C5A2E]" />
                      <span>Estado:</span>
                    </label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectCls}>
                      <option value="">Todos los estados</option>
                      {STATUSES.map((st) => <option key={st} value={st}>{stockStatusLabel[st]}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#231E1A] flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#9C5A2E]" />
                      <span>Categoría:</span>
                    </label>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={filterSelectCls}>
                      <option value="">Todas las categorías</option>
                      {categories.options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#231E1A] flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#9C5A2E]" />
                      <span>Proveedor:</span>
                    </label>
                    <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className={filterSelectCls}>
                      <option value="">Todos los proveedores</option>
                      {suppliers.options.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                    </select>
                  </div>
                </FilterPanel>
              </div>

              <div className="relative w-full sm:w-72 shrink-0">
                <Search className="w-4 h-4 text-[#A89C8C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Buscar producto, modelo o SKU…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={searchCls}
                />
              </div>
            </div>

            <ApiErrorBanner error={optionsError} onRetry={() => { categories.reload(); suppliers.reload(); }} />
            <ApiErrorBanner error={stock.error} onRetry={stock.reload} />

            <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
              <div className="overflow-x-auto w-full">
                <div className="min-w-[920px]">
                  <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                    <SortHeader sort={stockSort} setSort={setStockSort} field="productName" label="PRODUCTO" className="flex-1 min-w-[220px]" />
                    <SortHeader sort={stockSort} setSort={setStockSort} field="sku" label="CÓDIGO / SKU" className="w-28 shrink-0" />
                    <SortHeader sort={stockSort} setSort={setStockSort} field="categoryName" label="CATEGORÍA" className="w-28 shrink-0" />
                    <SortHeader sort={stockSort} setSort={setStockSort} field="onHand" label="STOCK ACTUAL" className="w-24 shrink-0 justify-center" />
                    <SortHeader sort={stockSort} setSort={setStockSort} field="status" label="ESTADO" className="w-28 shrink-0" />
                    <SortHeader sort={stockSort} setSort={setStockSort} field="unitCost" label="COSTO UNIT." className="w-24 shrink-0 justify-end" />
                    <div className="w-44 shrink-0 text-right font-semibold">ACCIÓN</div>
                  </div>

                  <div className="divide-y divide-[#F7F3EC]">
                    {!stock.loading && !stock.error && stock.items.length === 0 ? (
                      <div className="p-12 text-center text-[#7A6F63] text-sm">
                        No se encontraron productos con los filtros seleccionados.
                      </div>
                    ) : (
                      stock.items.map((r) => (
                        <div key={r.variantId} className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors">
                          <div className="flex-1 min-w-[220px] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#EADBC6] flex items-center justify-center text-[#9C5A2E] shrink-0 shadow-inner">
                              <Coffee className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-semibold text-[#231E1A] truncate text-sm">{r.productName}</span>
                              {r.variantName !== "STANDARD" && (
                                <span className="text-[11px] text-[#7A6F63] truncate flex items-center gap-1">
                                  <Layers className="w-3 h-3 shrink-0" />
                                  <span>{r.variantName}</span>
                                </span>
                              )}
                              {r.supplierName && (
                                <span className="text-[11px] text-[#9C5A2E] font-medium truncate flex items-center gap-1 mt-0.5">
                                  <Truck className="w-3 h-3 shrink-0" />
                                  <span>{r.supplierName}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="w-28 shrink-0 font-mono text-xs text-[#7A6F63] truncate">{r.sku ?? "—"}</div>

                          <div className="w-28 shrink-0 text-[#7A6F63]">
                            {r.categoryName ? (
                              <span className="bg-[#FBF8F2] border border-[#E7DFD2] px-2.5 py-0.5 rounded-md text-xs">{r.categoryName}</span>
                            ) : "—"}
                          </div>

                          <div className="w-24 shrink-0 text-center">
                            <span className={`text-base font-bold ${
                              r.status === "OUT" ? "text-[#C0492F]" : r.status === "LOW" ? "text-[#D98A2B]" : "text-[#231E1A]"
                            }`}>
                              {r.onHand}
                            </span>
                            <span className="text-[10px] text-[#A89C8C] block">mín. {r.minStock} u.</span>
                          </div>

                          <div className="w-28 shrink-0"><StatusBadge status={r.status} /></div>

                          <div className="w-24 shrink-0 text-right text-[#231E1A]">
                            {r.unitCost != null ? money(r.unitCost) : "—"}
                          </div>

                          <div className="w-44 shrink-0 flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setAdjusting({ row: r })}
                              title="Registrar ajuste o rotura"
                              className="inline-flex items-center gap-1 text-[#7A6F63] hover:text-[#9C5A2E] px-2 py-1.5 rounded-xl hover:bg-[#EADBC6]/40 font-semibold text-xs transition-all cursor-pointer"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              <span>Ajuste</span>
                            </button>
                            <button
                              onClick={() => setRestock({ row: r })}
                              className="inline-flex items-center gap-1.5 bg-[#9C5A2E]/10 hover:bg-[#9C5A2E] text-[#9C5A2E] hover:text-white px-3 py-1.5 rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-2xs"
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                              <span>Re-stock</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <Pager hasPrev={stock.hasPrev} hasNext={stock.hasNext} onPrev={stock.prev} onNext={stock.next} total={stock.total} loading={stock.loading} />
            </div>
          </div>
        )}

        {/* TAB 2: HISTORIAL DE MOVIMIENTOS */}
        {activeTab === "historial" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1 min-w-0 max-w-3xl">
                <FilterPanel
                  isOpen={isHistoryFilterOpen}
                  onToggle={() => setIsHistoryFilterOpen(!isHistoryFilterOpen)}
                  activeCount={historyActiveCount}
                  onReset={() => { setHistoryDateFrom(""); setHistoryDateTo(""); setTypeFilter(""); setPurchaseOrderId(undefined); }}
                  dateFrom={historyDateFrom}
                  dateTo={historyDateTo}
                  onDateFromChange={setHistoryDateFrom}
                  onDateToChange={setHistoryDateTo}
                  resultCount={movements.total}
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#231E1A] flex items-center gap-1.5">
                      <PackagePlus className="w-3.5 h-3.5 text-[#9C5A2E]" />
                      <span>Tipo de movimiento:</span>
                    </label>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={filterSelectCls}>
                      <option value="">Todos los tipos</option>
                      {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{movementTypeLabel[t]}</option>)}
                    </select>
                  </div>
                </FilterPanel>
              </div>

              <div className="relative w-full sm:w-80 shrink-0">
                <Search className="w-4 h-4 text-[#A89C8C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Buscar por producto, SKU, proveedor, notas…"
                  value={historyTerm}
                  onChange={(e) => setHistoryTerm(e.target.value)}
                  className={searchCls}
                />
              </div>
            </div>

            <ApiErrorBanner error={movements.error} onRetry={movements.reload} />

            <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
              <div className="overflow-x-auto w-full">
                <div className="min-w-[960px]">
                  <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                    <SortHeader sort={historySort} setSort={setHistorySort} field="movedAt" label="FECHA Y HORA" className="w-36 shrink-0" />
                    <SortHeader sort={historySort} setSort={setHistorySort} field="type" label="TIPO" className="w-32 shrink-0" />
                    <SortHeader sort={historySort} setSort={setHistorySort} field="productName" label="PRODUCTO" className="flex-1 min-w-[200px]" />
                    <SortHeader sort={historySort} setSort={setHistorySort} field="quantity" label="CANTIDAD" className="w-24 shrink-0 justify-center" />
                    <SortHeader sort={historySort} setSort={setHistorySort} field="totalCost" label="COSTO TOTAL" className="w-32 shrink-0 justify-end" />
                    <div className="w-48 shrink-0 font-semibold">PROVEEDOR / DETALLE</div>
                  </div>

                  <div className="divide-y divide-[#F7F3EC]">
                    {!movements.loading && !movements.error && movements.items.length === 0 ? (
                      <div className="p-12 text-center text-[#7A6F63] text-sm">
                        No se registraron movimientos con los filtros seleccionados.
                      </div>
                    ) : (
                      movements.items.map((m) => (
                        <div key={m.id} className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors">
                          <div className="w-36 shrink-0 flex items-center gap-2 text-[#7A6F63]">
                            <Calendar className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                            <span className="font-medium text-[#231E1A]">{formatInstant(m.movedAt)}</span>
                          </div>

                          <div className="w-32 shrink-0">
                            <span className="inline-flex items-center bg-[#FBF8F2] text-[#7A3F1F] border border-[#E7DFD2] px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                              {movementTypeLabel[m.type]}
                            </span>
                          </div>

                          <div className="flex-1 min-w-[200px] flex flex-col min-w-0">
                            <span className="font-semibold text-[#231E1A] truncate text-sm">{variantLabel(m)}</span>
                            <span className="text-[11px] text-[#A89C8C] font-mono">SKU: {m.sku ?? "—"}</span>
                          </div>

                          <div className="w-24 shrink-0 text-center">
                            <span className={`inline-block font-bold px-2 py-0.5 rounded-md text-xs ${
                              m.quantity > 0 ? "bg-[#EAF5EE] text-[#2D6A42]" : "bg-[#F7E3DD] text-[#C0492F]"
                            }`}>
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity} u.
                            </span>
                          </div>

                          <div className="w-32 shrink-0 text-right">
                            {m.totalCost != null ? (
                              <>
                                <span className="font-bold text-[#231E1A] block">{money(m.totalCost)}</span>
                                {m.unitCost != null && (
                                  <span className="text-[10px] text-[#A89C8C] block">{money(m.unitCost)} / u.</span>
                                )}
                              </>
                            ) : (
                              <span className="text-[#A89C8C]">—</span>
                            )}
                          </div>

                          <div className="w-48 shrink-0 flex flex-col min-w-0">
                            <div className="flex items-center gap-1 text-[#231E1A] font-medium truncate">
                              <Truck className="w-3 h-3 text-[#A89C8C] shrink-0" />
                              <span className="truncate">{m.supplierName ?? "—"}</span>
                            </div>
                            {m.notes && <span className="text-[11px] text-[#A89C8C] truncate italic">{m.notes}</span>}
                            {m.createdBy && <span className="text-[10px] text-[#A89C8C] truncate">por {m.createdBy}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <Pager hasPrev={movements.hasPrev} hasNext={movements.hasNext} onPrev={movements.prev} onNext={movements.next} total={movements.total} loading={movements.loading} />
            </div>
          </div>
        )}
      </main>

      {restock && (
        <RestockModal
          row={restock.row}
          productId={restock.productId}
          variantId={restock.variantId}
          onClose={() => setRestock(null)}
          onDone={handleDone}
        />
      )}

      {adjusting && <AdjustmentModal row={adjusting.row} onClose={() => setAdjusting(null)} onDone={handleDone} />}
    </div>
  );
}
