"use client";

import Link from "next/link";
import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, Badge, Pager } from "@/components/ui";
import FilterPanel from "@/components/ui/FilterPanel";
import { usePagedList, useOptions } from "@/lib/useApi";
import { instantRangeCriteria, type Criterion } from "@/lib/apiQuery";
import { money } from "@/lib/format";
import { formatInstant } from "@/lib/dateUtils";
import type { Customer, ReturnView } from "@/lib/apiTypes";
import { Calendar, Eye, ArrowUp, ArrowDown } from "lucide-react";

const filterSelectCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer";

export default function DevolucionesPage() {
  const [sortBy, setSortBy] = useState("returnedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [saleFilter, setSaleFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [voidedFilter, setVoidedFilter] = useState("");

  const customers = useOptions<Customer>("/customers", { sortBy: "fullName", sortDir: "asc" });

  const saleId = Number(saleFilter);
  const filters: Criterion[] = [
    ...(Number.isInteger(saleId) && saleId > 0 ? [{ field: "saleId", operator: "EQUALS" as const, value: saleId }] : []),
    ...(customerFilter ? [{ field: "customerId", operator: "EQUALS" as const, value: Number(customerFilter) }] : []),
    ...(voidedFilter ? [{ field: "voided", operator: "EQUALS" as const, value: voidedFilter === "true" }] : []),
    ...instantRangeCriteria("returnedAt", dateFrom || undefined, dateTo || undefined),
  ];

  const { items, total, loading, error, hasNext, hasPrev, next, prev, reload } = usePagedList<ReturnView>("/returns", {
    sortBy, sortDir, filters,
  });

  const activeFilterCount =
    (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (saleFilter ? 1 : 0) + (customerFilter ? 1 : 0) + (voidedFilter ? 1 : 0);
  const handleResetFilters = () => {
    setDateFrom(""); setDateTo(""); setSaleFilter(""); setCustomerFilter(""); setVoidedFilter("");
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

  const th = "text-[11px] text-[#A89C8C] tracking-wide";

  return (
    <>
      <Topbar title="Devoluciones" subtitle="Devoluciones y cambios de ventas" />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full min-w-0">
        <div className="max-w-3xl">
          <FilterPanel
            isOpen={isFilterOpen}
            onToggle={() => setIsFilterOpen(!isFilterOpen)}
            activeCount={activeFilterCount}
            onReset={handleResetFilters}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            dateLabel="Fecha de devolución"
            resultCount={total}
          >
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-[#231E1A]">Venta #:</label>
              <input type="number" min="1" step="1" value={saleFilter} onChange={(e) => setSaleFilter(e.target.value)}
                placeholder="Nro. de venta" className={filterSelectCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-[#231E1A]">Cliente:</label>
              <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className={filterSelectCls}>
                <option value="">Todos los clientes</option>
                {customers.options.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-[#231E1A]">Estado:</label>
              <select value={voidedFilter} onChange={(e) => setVoidedFilter(e.target.value)} className={filterSelectCls}>
                <option value="">Todas</option>
                <option value="false">Activas</option>
                <option value="true">Anuladas</option>
              </select>
            </div>
          </FilterPanel>
        </div>

        <ApiErrorBanner error={error} onRetry={reload} />
        <ApiErrorBanner error={customers.error} onRetry={customers.reload} />

        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[900px]">
              <div className={`bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 border-b border-[#E7DFD2] ${th}`}>
                {sortHeader("id", "ID", "w-16 shrink-0")}
                {sortHeader("returnedAt", "FECHA", "w-36 shrink-0")}
                <div className="w-20 shrink-0 font-semibold">VENTA</div>
                <div className="flex-1 min-w-[160px] font-semibold">CLIENTE / MOTIVO</div>
                <div className="w-24 shrink-0 font-semibold">TIPO</div>
                <div className="w-28 shrink-0 text-right font-semibold">VALOR</div>
                <div className="w-24 shrink-0 pl-4 font-semibold">ESTADO</div>
                <div className="w-14 shrink-0 text-center font-semibold">VER</div>
              </div>

              <div className="divide-y divide-[#F7F3EC]">
                {!loading && !error && items.length === 0 ? (
                  <div className="p-12 text-center text-[#7A6F63] text-sm">No se encontraron devoluciones.</div>
                ) : (
                  items.map((r) => (
                    <div key={r.id} className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors">
                      <div className="w-16 shrink-0 font-mono text-[#A89C8C]">#{r.id}</div>
                      <div className="w-36 shrink-0 text-[#7A6F63] flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                        <span>{formatInstant(r.returnedAt)}</span>
                      </div>
                      <div className="w-20 shrink-0">
                        <Link href={`/ventas?id=${r.saleId}`} className="text-[#9C5A2E] font-semibold hover:underline">#{r.saleId}</Link>
                      </div>
                      <div className="flex-1 min-w-[160px] flex flex-col min-w-0">
                        <span className="font-semibold text-[#231E1A] truncate text-sm">{r.customerName ?? "Consumidor final"}</span>
                        <span className="text-[#A89C8C] truncate">{r.reason}</span>
                      </div>
                      <div className="w-24 shrink-0 text-[#7A6F63]">{r.exchangeSaleId ? "Cambio" : "Devolución"}</div>
                      <div className="w-28 shrink-0 text-right font-bold text-[#231E1A] text-sm whitespace-nowrap">{money(r.total)}</div>
                      <div className="w-24 shrink-0 pl-4">
                        {r.voidedAt ? <Badge variant="danger">Anulada</Badge> : <Badge variant="success">Activa</Badge>}
                      </div>
                      <div className="w-14 shrink-0 flex justify-center">
                        <Link href={`/devoluciones/detalle?id=${r.id}`} aria-label="Ver detalle" title="Ver detalle"
                          className="p-1.5 rounded-lg hover:bg-[#F5EAD6] text-[#7A6A5A]">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
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
    </>
  );
}
