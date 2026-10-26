"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, Badge, ConfirmDeleteModal, Modal, Pager } from "@/components/ui";
import FilterPanel from "@/components/ui/FilterPanel";
import { api } from "@/lib/api";
import { useApiResource, usePagedList } from "@/lib/useApi";
import { instantRangeCriteria, type Criterion } from "@/lib/apiQuery";
import { buyerName, money, paymentStatusVariant as statusVariant, variantLabel } from "@/lib/format";
import { formatInstant } from "@/lib/dateUtils";
import { adjustmentTypeLabel, paymentStatusLabel, saleTypeLabel } from "@/lib/labels";
import type { PaymentStatus, Sale, SaleType, StockRow } from "@/lib/apiTypes";
import { Calendar, Edit2, Eye, Plus, Search, Ban, ArrowUp, ArrowDown } from "lucide-react";

const filterSelectCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer";

export default function VentasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("soldAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [detail, setDetail] = useState<Sale | null>(null);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [notes, setNotes] = useState("");
  const [cancelling, setCancelling] = useState<Sale | null>(null);
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState<unknown>(null);
  const [cancelError, setCancelError] = useState<unknown>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filters: Criterion[] = [
    ...(typeFilter ? [{ field: "type", operator: "EQUALS" as const, value: typeFilter }] : []),
    ...(statusFilter ? [{ field: "status", operator: "IN" as const, value: [statusFilter] }] : []),
    ...instantRangeCriteria("soldAt", dateFrom || undefined, dateTo || undefined),
  ];

  const { items, total, loading, error, hasNext, hasPrev, next, prev, reload } = usePagedList<Sale>("/sales", {
    sortBy, sortDir, search: search || undefined, filters,
  });

  // Sale lines only carry variantId: resolve names with one /stock call for the open detail.
  const variantIds = detail ? [...new Set(detail.lines.map((l) => l.variantId))] : [];
  const names = useApiResource(
    () =>
      variantIds.length
        ? api.getAll<StockRow>("/stock", { filters: [{ field: "variantId", operator: "IN", value: variantIds }] })
        : Promise.resolve([] as StockRow[]),
    [detail?.id],
  );
  const lineName = (variantId: number) => {
    const r = names.data?.find((x) => x.variantId === variantId);
    return r ? variantLabel(r) : `Variante #${variantId}`;
  };

  const activeFilterCount = (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (typeFilter ? 1 : 0) + (statusFilter ? 1 : 0);
  const handleResetFilters = () => { setDateFrom(""); setDateTo(""); setTypeFilter(""); setStatusFilter(""); };

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

  const write = async (fn: () => Promise<unknown>, onError: (e: unknown) => void, onDone?: () => void) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      onDone?.();
      reload();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (s: Sale) => { setEditing(s); setNotes(s.notes ?? ""); setEditError(null); };
  const closeEdit = () => setEditing(null);

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const value = notes.trim();
    if (value === (editing.notes ?? "")) return closeEdit();
    setEditError(null);
    write(
      () => api.patch(`/sales/${editing.id}`, { notes: value || null }),
      setEditError,
      () => { closeEdit(); setDetail(null); },
    );
  };

  const handleCancel = () => {
    if (!cancelling) return;
    const id = cancelling.id;
    setCancelError(null);
    write(() => api.post(`/sales/${id}/cancel`), setCancelError, () => setDetail(null));
  };

  const th = "text-[11px] text-[#A89C8C] tracking-wide";
  const canCancel = (s: Sale) => !s.cancelledAt;
  const rowBtn = "p-1.5 rounded-lg hover:bg-[#F5EAD6] cursor-pointer disabled:opacity-60";

  return (
    <>
      <Topbar title="Ventas" subtitle="Historial y seguimiento de ventas" />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full min-w-0">
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
              dateLabel="Fecha de venta"
              resultCount={total}
            >
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[#231E1A]">Tipo:</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={filterSelectCls}>
                  <option value="">Todos los tipos</option>
                  {(Object.keys(saleTypeLabel) as SaleType[]).map((t) => (
                    <option key={t} value={t}>{saleTypeLabel[t]}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[#231E1A]">Estado:</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectCls}>
                  <option value="">Todos los estados</option>
                  {(Object.keys(paymentStatusLabel) as PaymentStatus[]).map((s) => (
                    <option key={s} value={s}>{paymentStatusLabel[s]}</option>
                  ))}
                </select>
              </div>
            </FilterPanel>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89C8C]" />
              <input
                type="text"
                maxLength={100}
                placeholder="Buscar por cliente o notas…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#E7DFD2] rounded-xl text-xs text-[#231E1A] placeholder-[#C9BCA9] outline-none focus:border-[#9C5A2E] transition-colors shadow-2xs"
              />
            </div>
            <Link
              href="/ventas/nueva"
              className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva venta</span>
            </Link>
          </div>
        </div>

        <ApiErrorBanner error={error} onRetry={reload} />
        <ApiErrorBanner error={cancelError} />

        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[960px]">
              <div className={`bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 border-b border-[#E7DFD2] ${th}`}>
                {sortHeader("id", "ID", "w-16 shrink-0")}
                {sortHeader("customerName", "CLIENTE", "flex-1 min-w-[160px]")}
                {sortHeader("soldAt", "FECHA", "w-36 shrink-0")}
                {sortHeader("type", "TIPO", "w-28 shrink-0")}
                <div className="w-28 shrink-0 text-right font-semibold">TOTAL</div>
                {sortHeader("outstanding", "DEUDA", "w-28 shrink-0 justify-end")}
                <div className="w-28 shrink-0 pl-4 font-semibold">ESTADO</div>
                <div className="w-24 shrink-0 text-center font-semibold">ACCIONES</div>
              </div>

              <div className="divide-y divide-[#F7F3EC]">
                {!loading && !error && items.length === 0 ? (
                  <div className="p-12 text-center text-[#7A6F63] text-sm">No se encontraron ventas registradas.</div>
                ) : (
                  items.map((s) => (
                    <div key={s.id} className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors">
                      <div className="w-16 shrink-0 font-mono text-[#A89C8C]">#{s.id}</div>
                      <div className="flex-1 min-w-[160px] font-semibold text-[#231E1A] truncate text-sm">{buyerName(s)}</div>
                      <div className="w-36 shrink-0 text-[#7A6F63] flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                        <span>{formatInstant(s.soldAt)}</span>
                      </div>
                      <div className="w-28 shrink-0 text-[#7A6F63]">{saleTypeLabel[s.type]}</div>
                      <div className="w-28 shrink-0 text-right font-bold text-[#231E1A] text-sm whitespace-nowrap">{money(s.totalDue)}</div>
                      <div className={`w-28 shrink-0 text-right ${s.outstanding > 0 ? "font-bold text-[#C0492F]" : "text-[#7A6F63]"}`}>
                        {money(s.outstanding)}
                      </div>
                      <div className="w-28 shrink-0 pl-4">
                        <Badge variant={statusVariant[s.paymentStatus]}>{paymentStatusLabel[s.paymentStatus]}</Badge>
                      </div>
                      <div className="w-24 shrink-0 flex items-center justify-center gap-1">
                        <button onClick={() => setDetail(s)} aria-label="Ver detalle" title="Ver detalle"
                          className={`${rowBtn} text-[#7A6A5A]`}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(s)} disabled={busy} aria-label="Editar notas" title="Editar notas"
                          className={`${rowBtn} text-[#7A6A5A]`}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {canCancel(s) && (
                          <button onClick={() => { setCancelError(null); setCancelling(s); }} disabled={busy}
                            aria-label="Cancelar venta" title="Cancelar venta"
                            className={`${rowBtn} text-[#C0492F] hover:bg-[#FBEAE5]`}>
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
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

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail ? `Venta #${detail.id}` : "Venta"} maxWidth="max-w-2xl">
        {detail && (
          <div className="flex flex-col gap-4 text-xs text-[#231E1A]">
            <div className="grid grid-cols-2 gap-3 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E7DFD2]">
              <div><span className="text-[#A89C8C]">Cliente</span><div className="font-semibold">{buyerName(detail)}</div></div>
              <div><span className="text-[#A89C8C]">Fecha</span><div className="font-semibold">{formatInstant(detail.soldAt)}</div></div>
              <div><span className="text-[#A89C8C]">Tipo</span><div className="font-semibold">{saleTypeLabel[detail.type]}</div></div>
              <div>
                <span className="text-[#A89C8C]">Estado</span>
                <div><Badge variant={statusVariant[detail.paymentStatus]}>{paymentStatusLabel[detail.paymentStatus]}</Badge></div>
              </div>
              {detail.notes && <div className="col-span-2"><span className="text-[#A89C8C]">Notas</span><div>{detail.notes}</div></div>}
              {detail.cancelledAt && (
                <div className="col-span-2 text-[#C0492F]">Cancelada el {formatInstant(detail.cancelledAt)}</div>
              )}
            </div>

            <ApiErrorBanner error={names.error} onRetry={names.reload} />
            <div className="border border-[#E7DFD2] rounded-xl divide-y divide-[#F7F3EC]">
              {detail.lines.map((l) => (
                <div key={l.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{lineName(l.variantId)}</div>
                    <div className="text-[#7A6F63]">{l.quantity} × {money(l.unitPrice)}</div>
                  </div>
                  <div className="font-semibold shrink-0">{money(l.subtotal)}</div>
                </div>
              ))}
            </div>

            {detail.adjustments.length > 0 && (
              <div className="flex flex-col gap-1">
                {detail.adjustments.map((a, i) => (
                  <div key={i} className="flex justify-between text-[#7A6F63]">
                    <span>{adjustmentTypeLabel[a.type]}{a.notes ? ` · ${a.notes}` : ""}</span>
                    <span>{money(a.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {detail.payments.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Pagos</span>
                {detail.payments.map((p) => (
                  <div key={p.paymentId} className="flex justify-between text-[#7A6F63]">
                    <span>{p.paymentMethodName}</span>
                    <span>{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-1 pt-2 border-t border-[#F7F3EC]">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(detail.grossTotal)}</span></div>
              <div className="flex justify-between"><span>Ajustes</span><span>{money(detail.adjustmentTotal)}</span></div>
              <div className="flex justify-between font-bold text-sm"><span>Total</span><span>{money(detail.totalDue)}</span></div>
              <div className="flex justify-between"><span>Pagado</span><span>{money(detail.totalPaid)}</span></div>
              <div className={`flex justify-between font-semibold ${detail.outstanding > 0 ? "text-[#C0492F]" : ""}`}>
                <span>Deuda</span><span>{money(detail.outstanding)}</span>
              </div>
              <div className="flex justify-between text-[#7A6F63]"><span>Margen bruto</span><span>{money(detail.grossMargin)}</span></div>
            </div>

            <p className="text-[#7A6F63] leading-relaxed">
              Los ítems de una venta no se pueden editar. Para corregirlos, cancelá la venta y{" "}
              <Link href="/ventas/nueva" className="text-[#9C5A2E] font-semibold underline">registrala de nuevo</Link>.
            </p>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!editing} onClose={closeEdit} title={editing ? `Notas de la venta #${editing.id}` : "Notas"}>
        <form onSubmit={handleSaveNotes} className="space-y-4">
          <textarea
            value={notes}
            maxLength={500}
            rows={4}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-colors resize-none"
          />
          <ApiErrorBanner error={editError} />
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F7F3EC]">
            <button type="button" onClick={closeEdit}
              className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={busy}
              className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer disabled:opacity-60">
              Guardar notas
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={handleCancel}
        isLoading={busy}
        title="¿Cancelar venta?"
        confirmLabel="Cancelar venta"
        cancelLabel="Volver"
        description={`Estás por cancelar la venta #${cancelling?.id}. Se devuelve el stock y se anulan sus pagos. Esta acción no se puede deshacer.`}
      />
    </>
  );
}
