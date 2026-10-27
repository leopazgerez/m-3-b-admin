"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Coffee, Trash2, Edit2, ScanBarcode, Eye, Boxes, Tag, Truck, ArrowUp, ArrowDown, Layers } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, ConfirmDeleteModal, Pager, StatusBadge } from "@/components/ui";
import { money } from "@/lib/format";
import FilterPanel from "@/components/ui/FilterPanel";
import { api } from "@/lib/api";
import { useOptions, usePagedList } from "@/lib/useApi";
import { instantRangeCriteria, type Criterion } from "@/lib/apiQuery";
import { stockStatusLabel } from "@/lib/labels";
import type { Product, ProductCategory, StockStatus, Supplier } from "@/lib/apiTypes";
import ProductFormModal from "./ProductFormModal";
import VariantsModal from "./VariantsModal";

const STATUSES = Object.keys(stockStatusLabel) as StockStatus[];
const filterSelectCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer";

export default function ProductosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockStatus[]>([]);
  const [activeFilter, setActiveFilter] = useState("");

  const [form, setForm] = useState<{ product: Product | null } | null>(null); // null = closed
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filters: Criterion[] = [
    ...(categoryFilter ? [{ field: "categoryId", operator: "EQUALS" as const, value: Number(categoryFilter) }] : []),
    ...(statusFilter.length ? [{ field: "status", operator: "IN" as const, value: statusFilter }] : []),
    ...(activeFilter ? [{ field: "active", operator: "EQUALS" as const, value: activeFilter === "true" }] : []),
    ...instantRangeCriteria("createdAt", dateFrom || undefined, dateTo || undefined),
  ];

  const { items, total, loading, error, hasNext, hasPrev, next, prev, reload } = usePagedList<Product>("/products", {
    sortBy,
    sortDir,
    search: search || undefined,
    filters,
  });
  const categories = useOptions<ProductCategory>("/product-categories", { sortBy: "name", sortDir: "asc" });
  const suppliers = useOptions<Supplier>("/suppliers", {
    sortBy: "name",
    sortDir: "asc",
    filters: [{ field: "active", operator: "EQUALS", value: true }],
  });
  const optionsError = categories.error ?? suppliers.error;

  const activeFilterCount =
    (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (categoryFilter ? 1 : 0) + (statusFilter.length ? 1 : 0) + (activeFilter ? 1 : 0);

  const handleResetFilters = () => {
    setDateFrom(""); setDateTo(""); setCategoryFilter(""); setStatusFilter([]); setActiveFilter("");
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };

  const sortHeader = (field: string, label: string, className: string) => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className={`${className} flex items-center gap-1 font-semibold hover:text-[#9C5A2E] cursor-pointer`}
    >
      {label}
      {sortBy === field && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
    </button>
  );

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    setBusy(true);
    try {
      await api.del(`/products/${deleting.id}`, { success: `Producto "${deleting.name}" eliminado.` });
      reload();
    } catch (e) {
      setDeleteError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Topbar
        title="Catálogo de Productos"
        subtitle="Gestión de artículos, variantes y precios de venta"
        onSearch={setSearchTerm}
      />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0 max-w-3xl">
            <FilterPanel
              isOpen={isFilterOpen}
              onToggle={() => setIsFilterOpen(!isFilterOpen)}
              activeCount={activeFilterCount}
              onReset={handleResetFilters}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              dateLabel="Fecha de alta"
              resultCount={total}
            >
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[#231E1A] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#9C5A2E]" />
                  <span>Categoría:</span>
                </label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={filterSelectCls}>
                  <option value="">Todas</option>
                  {categories.options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[#231E1A] flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-[#9C5A2E]" />
                  <span>Estado de stock:</span>
                </label>
                <div className="flex flex-col gap-1">
                  {STATUSES.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-[#231E1A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statusFilter.includes(s)}
                        onChange={(e) =>
                          setStatusFilter(e.target.checked ? [...statusFilter, s] : statusFilter.filter((x) => x !== s))
                        }
                      />
                      {stockStatusLabel[s]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[#231E1A]">Activo:</label>
                <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className={filterSelectCls}>
                  <option value="">Todos</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </div>
            </FilterPanel>
          </div>

          <div className="flex items-center gap-3 shrink-0 mt-0.5">
            <Link
              href="/stock"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E7DFD2] bg-white text-xs font-semibold text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors shadow-2xs"
            >
              <Boxes className="w-4 h-4 text-[#9C5A2E]" />
              <span>Ver inventario</span>
            </Link>
            <button
              onClick={() => setForm({ product: null })}
              disabled={busy}
              className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo producto</span>
            </button>
          </div>
        </div>

        <ApiErrorBanner error={optionsError} onRetry={() => { categories.reload(); suppliers.reload(); }} />
        <ApiErrorBanner error={error} onRetry={reload} />
        <ApiErrorBanner error={deleteError} />

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[930px]">
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                {sortHeader("name", "PRODUCTO", "flex-1 min-w-[200px]")}
                <div className="w-32 shrink-0 font-semibold">CÓDIGO / MODELOS</div>
                {sortHeader("categoryName", "CATEGORÍA", "w-36 shrink-0")}
                <div className="w-24 shrink-0 text-right font-semibold">PRECIO</div>
                {sortHeader("onHand", "STOCK", "w-16 shrink-0 justify-end")}
                {sortHeader("status", "ESTADO", "w-24 shrink-0 justify-center")}
                <div className="w-24 shrink-0 text-center font-semibold">ACCIONES</div>
              </div>

              <div className="divide-y divide-[#F7F3EC]">
                {!loading && !error && items.length === 0 ? (
                  <div className="p-12 text-center text-[#7A6F63] text-sm">
                    No se encontraron productos con los filtros seleccionados.
                  </div>
                ) : (
                  items.map((p) => (
                    <div key={p.id} className="px-6 py-3.5 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors">
                      <div onClick={() => setViewingId(p.id)} className="flex-1 min-w-[200px] flex items-center gap-3 cursor-pointer group">
                        <div className="w-10 h-10 rounded-lg bg-[#EADBC6] flex items-center justify-center text-[#9C5A2E] shrink-0 group-hover:scale-105 transition-transform">
                          <Coffee className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-semibold text-[#231E1A] truncate text-sm group-hover:text-[#9C5A2E] transition-colors">
                            {p.name}
                            {!p.active && <span className="ml-2 text-[10px] font-medium text-[#A89C8C]">(inactivo)</span>}
                          </span>
                          {p.defaultSupplierName && (
                            <span className="text-[11px] text-[#9C5A2E] font-medium truncate flex items-center gap-1 mt-0.5">
                              <Truck className="w-3 h-3 shrink-0" />
                              <span>{p.defaultSupplierName}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-32 shrink-0 text-[#7A6F63] font-mono text-xs flex items-center gap-1.5 truncate">
                        {p.hasVariants ? (
                          <>
                            <Layers className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                            <span className="font-body">{p.variants.length} modelos</span>
                          </>
                        ) : (
                          <>
                            <ScanBarcode className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                            <span className="truncate">{p.variants[0]?.sku ?? "—"}</span>
                          </>
                        )}
                      </div>

                      <div className="w-36 shrink-0 min-w-0 text-[#7A6F63]">
                        {p.categoryName ? (
                          <span className="inline-block max-w-full bg-[#FBF8F2] border border-[#E7DFD2] px-2 py-0.5 rounded-md text-xs leading-snug break-words">
                            {p.categoryName}
                          </span>
                        ) : "—"}
                      </div>

                      <div className="w-24 shrink-0 text-right font-bold text-[#231E1A] text-sm whitespace-nowrap">
                        {p.hasVariants
                          ? <span className="text-xs font-medium text-[#7A6F63]">desde {money(Math.min(...p.variants.map((v) => v.price)))}</span>
                          : p.variants[0] ? money(p.variants[0].price) : "—"}
                      </div>

                      <div className="w-16 shrink-0 text-right font-semibold text-[#231E1A]">{p.onHand}</div>
                      <div className="w-24 shrink-0 text-center"><StatusBadge status={p.status} /></div>

                      <div className="w-24 shrink-0 flex items-center justify-center gap-1">
                        <button onClick={() => setViewingId(p.id)} title="Ver ficha y variantes"
                          className="text-[#A89C8C] hover:text-[#231E1A] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 transition-colors cursor-pointer">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setForm({ product: p })} disabled={busy} title="Editar producto"
                          className="text-[#A89C8C] hover:text-[#9C5A2E] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 transition-colors cursor-pointer">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setDeleteError(null); setDeleting(p); }} disabled={busy} title="Eliminar producto"
                          className="text-[#A89C8C] hover:text-[#C0492F] p-1.5 rounded-lg hover:bg-[#F7E3DD]/40 transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <Pager hasPrev={hasPrev} hasNext={hasNext} onPrev={prev} onNext={next} total={total} loading={loading} />
        </div>
      </main>

      {form && (
        <ProductFormModal
          product={form.product}
          categories={categories.options}
          suppliers={suppliers.options}
          onClose={() => setForm(null)}
          onSaved={reload}
        />
      )}

      {viewingId !== null && (
        <VariantsModal productId={viewingId} onClose={() => setViewingId(null)} onChanged={reload} />
      )}

      <ConfirmDeleteModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        isLoading={busy}
        title="¿Eliminar producto?"
        itemName={deleting?.name}
      />
    </>
  );
}
