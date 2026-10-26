"use client";

import { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, Pager } from "@/components/ui";
import FilterPanel from "@/components/ui/FilterPanel";
import { api } from "@/lib/api";
import { useApiResource, useOptions, usePagedList } from "@/lib/useApi";
import { instantRangeCriteria, type Criterion } from "@/lib/apiQuery";
import { money } from "@/lib/format";
import { formatDate, formatInstant } from "@/lib/dateUtils";
import type { ExpensePaymentRow, ExpensePaymentSummary, PaymentMethod } from "@/lib/apiTypes";
import { CheckCircle2, Receipt, Tag, Wallet } from "lucide-react";
import ExpenseDetailModal from "../ExpenseDetailModal";

const filterSelectCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer";
const tabCls =
  "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap";

/** Money that went out: expense payments by the day they were paid, whatever the expense's date. */
export default function GastosPagosPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filters: Criterion[] = [
    ...(methodFilter ? [{ field: "paymentMethodId", operator: "EQUALS" as const, value: Number(methodFilter) }] : []),
    ...instantRangeCriteria("paidAt", dateFrom || undefined, dateTo || undefined),
  ];

  const list = usePagedList<ExpensePaymentRow>("/expense-payments", { filters });
  const summary = useApiResource(
    () => api.getOne<ExpensePaymentSummary>("/expense-payments/summary", { from: dateFrom || undefined, to: dateTo || undefined }),
    [dateFrom, dateTo],
  );
  const methods = useOptions<PaymentMethod>("/payment-methods");

  const changed = (message: string) => { setSuccess(message); list.reload(); summary.reload(); };

  const activeFilterCount = [dateFrom, dateTo, methodFilter].filter(Boolean).length;
  const handleResetFilters = () => { setDateFrom(""); setDateTo(""); setMethodFilter(""); };

  const s = summary.data;

  return (
    <>
      <Topbar title="Gastos" subtitle="Pagos realizados por fecha y medio de pago" />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full min-w-0">
        <div className="flex items-center gap-2 bg-white border border-[#E7DFD2] p-1.5 rounded-xl shadow-2xs overflow-x-auto max-w-full self-start">
          <Link href="/gastos" className={tabCls}>Todos los gastos</Link>
          <Link href="/gastos/pagos"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#9C5A2E] text-white shadow-xs whitespace-nowrap">
            <Wallet className="w-3.5 h-3.5" />
            <span>Pagos</span>
          </Link>
          <Link href="/configuracion/gastos" className={tabCls}>
            <Tag className="w-3.5 h-3.5 text-[#D98A2B]" />
            <span>Categorías</span>
          </Link>
        </div>

        {success && (
          <div className="bg-[#E3F1E8] border border-[#3E8E5A]/20 text-[#3E8E5A] text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Totals for the same paid-on range as the list (GET /expense-payments/summary) */}
        <ApiErrorBanner error={summary.error} onRetry={summary.reload} />
        {s && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-[#E7DFD2] p-4 shadow-xs">
              <div className="text-[11px] text-[#A89C8C] font-medium">Total pagado</div>
              <div className="font-heading font-bold text-lg text-[#231E1A]">{money(s.total)}</div>
            </div>
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E7DFD2] p-4 shadow-xs text-xs">
              <div className="font-semibold text-[#231E1A] mb-2">
                Por medio de pago {dateFrom || dateTo ? `(${formatDate(dateFrom || null)} – ${formatDate(dateTo || null)})` : "(todo el período)"}
              </div>
              {s.methods.length === 0 ? (
                <div className="text-[#A89C8C]">Sin pagos en el período.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {s.methods.map((m) => (
                    <div key={m.paymentMethodId} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-[#231E1A] font-medium">{m.name}</span>
                      <div className="flex-1 bg-[#F7F3EC] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#9C5A2E] h-full rounded-full" style={{ width: `${m.pct}%` }} />
                      </div>
                      <span className="w-12 shrink-0 text-right text-[#7A6F63]">{m.pct}%</span>
                      <span className="w-28 shrink-0 text-right font-semibold">{money(m.total)}</span>
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
          dateLabel="Fecha de pago"
          resultCount={list.total}
        >
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-[#231E1A]">Medio de pago:</label>
            <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className={filterSelectCls}>
              <option value="">Todos</option>
              {methods.options.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </FilterPanel>

        <ApiErrorBanner error={methods.error} onRetry={methods.reload} />
        <ApiErrorBanner error={list.error} onRetry={list.reload} />

        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[860px]">
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] text-[#A89C8C] tracking-wide border-b border-[#E7DFD2] font-semibold">
                <div className="w-36 shrink-0">FECHA</div>
                <div className="flex-1 min-w-[220px]">GASTO</div>
                <div className="w-20 shrink-0 text-center">CUOTA</div>
                <div className="w-36 shrink-0">MEDIO</div>
                <div className="w-36 shrink-0">CUENTA</div>
                <div className="w-28 shrink-0 text-right">MONTO</div>
              </div>

              <div className="divide-y divide-[#F7F3EC]">
                {!list.loading && !list.error && list.items.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EAD6] flex items-center justify-center mx-auto mb-3 text-[#9C5A2E]">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-[#231E1A]">No se encontraron pagos</p>
                  </div>
                ) : (
                  list.items.map((p) => (
                    <button key={p.id} type="button" onClick={() => { setSuccess(null); setDetailId(p.expenseId); }}
                      title="Ver gasto y cuotas"
                      className="w-full text-left px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors cursor-pointer">
                      <div className="w-36 shrink-0 text-[#7A6F63]">{formatInstant(p.paidAt)}</div>
                      <div className="flex-1 min-w-[220px] flex flex-col min-w-0">
                        <span className="font-bold text-[#231E1A] text-sm truncate">{p.expenseDescription}</span>
                        <span className="text-[11px] text-[#7A3F1F] truncate">{p.categoryName}</span>
                      </div>
                      <div className="w-20 shrink-0 text-center text-[#7A6F63]">
                        {p.installmentCount > 1 ? `${p.installmentNo} de ${p.installmentCount}` : "—"}
                      </div>
                      <div className="w-36 shrink-0 truncate text-[#231E1A] font-medium">{p.paymentMethodName}</div>
                      <div className="w-36 shrink-0 truncate text-[#7A6F63]">{p.accountName ?? "—"}</div>
                      <div className="w-28 shrink-0 text-right font-heading font-bold text-sm text-[#231E1A]">{money(p.amount)}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
          <Pager hasPrev={list.hasPrev} hasNext={list.hasNext} onPrev={list.prev} onNext={list.next}
            total={list.total} loading={list.loading} />
        </div>
      </main>

      {detailId != null && (
        <ExpenseDetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={changed} />
      )}
    </>
  );
}
