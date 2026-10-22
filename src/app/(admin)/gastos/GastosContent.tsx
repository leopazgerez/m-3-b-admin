"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, Badge, ConfirmDeleteModal, Pager } from "@/components/ui";
import FilterPanel from "@/components/ui/FilterPanel";
import { api } from "@/lib/api";
import { useApiResource, useOptions, usePagedList } from "@/lib/useApi";
import { dateRangeCriteria, type Criterion } from "@/lib/apiQuery";
import { money } from "@/lib/format";
import { formatDate } from "@/lib/dateUtils";
import { expenseKindLabel, expenseStatusLabel } from "@/lib/labels";
import type {
  ExpenseCategory, ExpenseKind, ExpenseRow, ExpenseStatus, ExpenseSummary, Supplier,
} from "@/lib/apiTypes";
import {
  ArrowDown, ArrowUp, Calendar, CheckCircle2, Eye, Package, Plus, Receipt, Search, Tag, Trash2, Truck,
} from "lucide-react";
import ExpenseDetailModal, { statusVariant } from "./ExpenseDetailModal";
import ExpenseFormModal from "./ExpenseFormModal";

const filterSelectCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer";

export default function GastosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("incurredOn");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");

  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  // /gastos?expenseId=N (from dashboard alerts) opens that expense once per value
  const expenseParam = searchParams.get("expenseId");
  const [seenExpenseParam, setSeenExpenseParam] = useState<string | null>(null);
  if (seenExpenseParam !== expenseParam) {
    setSeenExpenseParam(expenseParam);
    if (expenseParam && /^\d+$/.test(expenseParam) && Number(expenseParam) > 0) setDetailId(Number(expenseParam));
  }
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filters: Criterion[] = [
    ...(categoryFilter ? [{ field: "categoryId", operator: "EQUALS" as const, value: Number(categoryFilter) }] : []),
    ...(kindFilter ? [{ field: "kind", operator: "EQUALS" as const, value: kindFilter }] : []),
    ...(statusFilter ? [{ field: "status", operator: "IN" as const, value: [statusFilter] }] : []),
    ...(supplierFilter ? [{ field: "supplierId", operator: "EQUALS" as const, value: Number(supplierFilter) }] : []),
    ...dateRangeCriteria("incurredOn", dateFrom || undefined, dateTo || undefined),
  ];

  const list = usePagedList<ExpenseRow>("/expenses", { sortBy, sortDir, search: search || undefined, filters });
  const summary = useApiResource(
    () => api.getOne<ExpenseSummary>("/expenses/summary", { from: dateFrom || undefined, to: dateTo || undefined }),
    [dateFrom, dateTo],
  );
  const categories = useOptions<ExpenseCategory>("/expense-categories");
  const suppliers = useOptions<Supplier>("/suppliers");

  const reloadAll = () => { list.reload(); summary.reload(); };
  const changed = (message: string) => { setSuccess(message); reloadAll(); };

  const activeFilterCount = [dateFrom, dateTo, categoryFilter, kindFilter, statusFilter, supplierFilter].filter(Boolean).length;
  const handleResetFilters = () => {
    setDateFrom(""); setDateTo(""); setCategoryFilter(""); setKindFilter(""); setStatusFilter(""); setSupplierFilter("");
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };
  const sortHeader = (field: string, label: string, className: string) => (
    <button key={field} type="button" onClick={() => toggleSort(field)}
      className={`${className} flex items-center gap-1 text-left font-semibold hover:text-[#9C5A2E] cursor-pointer`}>
      {label}
      {sortBy === field && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
    </button>
  );

  const handleDelete = async () => {
    if (!deleting) return;
    const row = deleting;
    setDeleteError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await api.del(`/expenses/${row.id}`);
      changed(`Gasto "${row.description}" eliminado.`);
    } catch (e) {
      setDeleteError(e);
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  const s = summary.data;
  const rowBtn = "p-1.5 rounded-lg cursor-pointer disabled:opacity-60";

  return (
    <>
      <Topbar title="Gastos" subtitle="Gastos del negocio, cuotas y pagos" />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-white border border-[#E7DFD2] p-1.5 rounded-xl shadow-2xs overflow-x-auto max-w-full">
            <Link href="/gastos"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#9C5A2E] text-white shadow-xs whitespace-nowrap">
              Todos los gastos
            </Link>
            <Link href="/configuracion/gastos"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap">
              <Tag className="w-3.5 h-3.5 text-[#D98A2B]" />
              <span>Categorías</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89C8C]" />
              <input type="text" maxLength={100} placeholder="Buscar por concepto…" value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#E7DFD2] rounded-xl text-xs text-[#231E1A] placeholder-[#C9BCA9] outline-none focus:border-[#9C5A2E] transition-colors shadow-2xs" />
            </div>
            <button onClick={() => { setSuccess(null); setCreating(true); }}
              className="flex items-center gap-2 bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap">
              <Plus className="w-4 h-4" />
              <span>Registrar gasto</span>
            </button>
          </div>
        </div>

        {success && (
          <div className="bg-[#E3F1E8] border border-[#3E8E5A]/20 text-[#3E8E5A] text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Summary for the same date range as the list (GET /expenses/summary) */}
        <ApiErrorBanner error={summary.error} onRetry={summary.reload} />
        {s && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              {[
                { label: "Total", value: s.total, cls: "text-[#231E1A]" },
                { label: "Pagado", value: s.paid, cls: "text-[#286B3E]" },
                { label: "Pendiente", value: s.pending, cls: s.pending > 0 ? "text-[#C0492F]" : "text-[#231E1A]" },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-2xl border border-[#E7DFD2] p-4 shadow-xs">
                  <div className="text-[11px] text-[#A89C8C] font-medium">{k.label}</div>
                  <div className={`font-heading font-bold text-lg ${k.cls}`}>{money(k.value)}</div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E7DFD2] p-4 shadow-xs text-xs">
              <div className="font-semibold text-[#231E1A] mb-2">
                Por categoría {dateFrom || dateTo ? `(${formatDate(dateFrom || null)} – ${formatDate(dateTo || null)})` : "(todo el período)"}
              </div>
              {s.categories.length === 0 ? (
                <div className="text-[#A89C8C]">Sin gastos en el período.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {s.categories.map((c) => (
                    <div key={c.categoryId} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-[#231E1A] font-medium">{c.name}</span>
                      <div className="flex-1 bg-[#F7F3EC] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#9C5A2E] h-full rounded-full" style={{ width: `${c.pct}%` }} />
                      </div>
                      <span className="w-12 shrink-0 text-right text-[#7A6F63]">{c.pct}%</span>
                      <span className="w-28 shrink-0 text-right font-semibold">{money(c.total)}</span>
                      <span className={`w-28 shrink-0 text-right ${c.pending > 0 ? "text-[#C0492F]" : "text-[#A89C8C]"}`}>
                        Pend. {money(c.pending)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <FilterPanel
          isOpen={isFilterOpen}
          onToggle={() => setIsFilterOpen(!isFilterOpen)}
          activeCount={activeFilterCount}
          onReset={handleResetFilters}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          dateLabel="Fecha del gasto"
          resultCount={list.total}
        >
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-[#231E1A]">Categoría:</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={filterSelectCls}>
              <option value="">Todas</option>
              {categories.options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-[#231E1A]">Tipo:</label>
            <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className={filterSelectCls}>
              <option value="">Todos</option>
              {(Object.keys(expenseKindLabel) as ExpenseKind[]).map((k) => (
                <option key={k} value={k}>{expenseKindLabel[k]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-[#231E1A]">Estado:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectCls}>
              <option value="">Todos los estados</option>
              {(Object.keys(expenseStatusLabel) as ExpenseStatus[]).map((k) => (
                <option key={k} value={k}>{expenseStatusLabel[k]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-[#231E1A]">Proveedor:</label>
            <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className={filterSelectCls}>
              <option value="">Todos</option>
              {suppliers.options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </FilterPanel>

        <ApiErrorBanner error={categories.error ?? suppliers.error} onRetry={() => { categories.reload(); suppliers.reload(); }} />
        <ApiErrorBanner error={list.error} onRetry={list.reload} />
        <ApiErrorBanner error={deleteError} />

        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[960px]">
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                {sortHeader("description", "CONCEPTO", "flex-1 min-w-[220px]")}
                {sortHeader("categoryName", "CATEGORÍA", "w-36 shrink-0")}
                <div className="w-40 shrink-0 font-semibold">PROVEEDOR</div>
                {sortHeader("incurredOn", "FECHA", "w-28 shrink-0")}
                {sortHeader("total", "TOTAL", "w-28 shrink-0 justify-end")}
                {sortHeader("pending", "PENDIENTE", "w-28 shrink-0 justify-end")}
                <div className="w-28 shrink-0 text-center font-semibold">ESTADO</div>
                <div className="w-20 shrink-0 text-center font-semibold">ACCIONES</div>
              </div>

              <div className="divide-y divide-[#F7F3EC]">
                {!list.loading && !list.error && list.items.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EAD6] flex items-center justify-center mx-auto mb-3 text-[#9C5A2E]">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-[#231E1A]">No se encontraron gastos</p>
                  </div>
                ) : (
                  list.items.map((m) => (
                    <div key={m.id} className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors">
                      <div className="flex-1 min-w-[220px] flex flex-col min-w-0">
                        <span className="font-bold text-[#231E1A] text-sm truncate">{m.description}</span>
                        <span className="text-[11px] text-[#A89C8C] flex items-center gap-1.5">
                          {expenseKindLabel[m.kind]}
                          {m.installmentCount > 1 && <span>· {m.installmentCount} cuotas</span>}
                          {m.restockId != null && (
                            <span className="flex items-center gap-1"><Package className="w-3 h-3" />Reposición</span>
                          )}
                        </span>
                      </div>
                      <div className="w-36 shrink-0 truncate font-semibold text-[#7A3F1F]">{m.categoryName}</div>
                      <div className="w-40 shrink-0 truncate text-[#7A6F63]">
                        {m.supplierName ? (
                          <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-[#A89C8C] shrink-0" />{m.supplierName}</span>
                        ) : "—"}
                      </div>
                      <div className="w-28 shrink-0 text-[#7A6F63] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                        {formatDate(m.incurredOn)}
                      </div>
                      <div className="w-28 shrink-0 text-right font-heading font-bold text-sm text-[#231E1A]">{money(m.total)}</div>
                      <div className={`w-28 shrink-0 text-right ${m.pending > 0 ? "font-bold text-[#C0492F]" : "text-[#7A6F63]"}`}>
                        {money(m.pending)}
                      </div>
                      <div className="w-28 shrink-0 text-center">
                        <Badge variant={statusVariant[m.status]}>{expenseStatusLabel[m.status]}</Badge>
                      </div>
                      <div className="w-20 shrink-0 flex items-center justify-center gap-1">
                        <button onClick={() => { setSuccess(null); setDetailId(m.id); }} aria-label="Ver detalle y cuotas"
                          title="Ver detalle y cuotas" className={`${rowBtn} text-[#9C5A2E] hover:bg-[#EADBC6]/40`}>
                          <Eye className="w-4 h-4" />
                        </button>
                        {m.restockId == null && (
                          <button onClick={() => { setDeleteError(null); setDeleting(m); }} disabled={busy}
                            aria-label="Eliminar gasto" title="Eliminar gasto"
                            className={`${rowBtn} text-[#A89C8C] hover:text-[#C0492F] hover:bg-[#F7E3DD]/50`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <Pager hasPrev={list.hasPrev} hasNext={list.hasNext} onPrev={list.prev} onNext={list.next}
            total={list.total} loading={list.loading} />
        </div>
      </main>

      {creating && (
        <ExpenseFormModal onClose={() => setCreating(false)} onDone={(msg) => { setCreating(false); changed(msg); }} />
      )}

      {detailId != null && (
        <ExpenseDetailModal id={detailId} onClose={() => { setDetailId(null); if (expenseParam) router.replace("/gastos"); }} onChanged={changed} />
      )}

      <ConfirmDeleteModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        isLoading={busy}
        title="¿Eliminar gasto?"
        itemName={deleting?.description}
        description={deleting ? `Se eliminará el gasto de ${money(deleting.total)}. Un gasto con pagos no se puede eliminar: anulá sus pagos primero.` : undefined}
      />
    </>
  );
}
