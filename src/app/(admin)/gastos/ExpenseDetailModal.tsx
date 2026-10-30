"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, DollarSign, Edit2, Package, Trash2 } from "lucide-react";
import { ApiErrorBanner, Badge, ConfirmDeleteModal, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/useApi";
import { money } from "@/lib/format";
import { formatDate, formatInstant } from "@/lib/dateUtils";
import { expenseKindLabel, expenseStatusLabel, installmentStatusLabel } from "@/lib/labels";
import type { Expense, ExpenseInstallment, ExpenseInstallmentPayment, ExpenseStatus } from "@/lib/apiTypes";
import ExpenseFormModal from "./ExpenseFormModal";
import InstallmentPaymentModal from "./InstallmentPaymentModal";
import { useCashStatus } from "@/lib/cashStatus";

/** Covers InstallmentStatus too (a subset). */
export const statusVariant: Record<ExpenseStatus, "success" | "warning" | "danger"> = {
  PAID: "success", OVERDUE: "danger", IN_INSTALLMENTS: "warning", PENDING: "warning",
};

/** GET /expenses/{id}: header, installments and their payments; pay an installment, void a payment, edit. */
export default function ExpenseDetailModal({ id, onClose, onChanged }: {
  id: number;
  onClose: () => void;
  onChanged: (message: string) => void;
}) {
  const res = useApiResource(() => api.getOne<Expense>(`/expenses/${id}`), [id]);
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState<ExpenseInstallment | null>(null);
  const cashClosed = useCashStatus().closed;
  const [voiding, setVoiding] = useState<ExpenseInstallmentPayment | null>(null);
  const [voidError, setVoidError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const changed = (message: string) => { res.reload(); onChanged(message); };

  const handleVoid = async () => {
    if (!voiding) return;
    const p = voiding;
    setVoidError(null);
    setBusy(true);
    try {
      await api.del(`/expense-payments/${p.id}`);
      changed(`Pago de ${money(p.amount)} anulado.`);
    } catch (e) {
      setVoidError(e);
    } finally {
      setBusy(false);
      setVoiding(null);
    }
  };

  const e = res.data;
  if (e && editing) {
    return <ExpenseFormModal expense={e} onClose={() => setEditing(false)}
      onDone={(m) => { setEditing(false); changed(m); }} />;
  }
  if (e && paying) {
    return <InstallmentPaymentModal expense={e} installment={paying} onClose={() => setPaying(null)}
      onDone={() => { setPaying(null); changed(`Pago de la cuota #${paying.no} registrado.`); }} />;
  }
  if (voiding) {
    return (
      <ConfirmDeleteModal isOpen onClose={() => setVoiding(null)} onConfirm={handleVoid} isLoading={busy}
        title="¿Anular pago?" confirmLabel="Anular pago"
        description={`Se anulará el pago de ${money(voiding.amount)} del ${formatInstant(voiding.paidAt)}. La cuota volverá a deberse.`} />
    );
  }

  return (
    <Modal isOpen onClose={onClose} title={e ? `Gasto #${e.id}` : "Gasto"} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4 text-xs text-[#231E1A]">
        <ApiErrorBanner error={res.error} onRetry={res.reload} />
        {!e ? (
          !res.error && <div className="text-[#A89C8C]">Cargando gasto…</div>
        ) : (
          <>
            <div className="bg-[#FBF8F2] border border-[#E7DFD2] p-4 rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="font-bold text-sm block">{e.description}</span>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#7A6F63]">
                  <span className="bg-white border border-[#E7DFD2] px-2 py-0.5 rounded font-semibold text-[#9C5A2E]">{e.categoryName}</span>
                  <span>{expenseKindLabel[e.kind]}</span>
                  <span>· {formatDate(e.incurredOn)}</span>
                  {e.supplierName && <span>· Proveedor: {e.supplierName}</span>}
                </div>
                {e.notes && <p className="text-[11px] text-[#7A6F63] mt-1.5">{e.notes}</p>}
                {e.restockId != null && (
                  <Link href={`/stock?tab=historial&purchaseOrderId=${e.restockId}`} className="inline-flex items-center gap-1 mt-1.5 text-[#9C5A2E] font-semibold hover:underline">
                    <Package className="w-3.5 h-3.5" />
                    Ver reposición (orden #{e.restockId})
                  </Link>
                )}
              </div>
              <div className="text-right shrink-0">
                <Badge variant={statusVariant[e.status]}>{expenseStatusLabel[e.status]}</Badge>
                <div className="font-heading font-bold text-base mt-1">{money(e.total)}</div>
                <div className="text-[11px] text-[#286B3E]">Pagado {money(e.paid)}</div>
                <div className={`text-[11px] ${e.pending > 0 ? "text-[#C0492F] font-semibold" : "text-[#7A6F63]"}`}>
                  Pendiente {money(e.pending)}
                </div>
              </div>
            </div>

            <ApiErrorBanner error={voidError} />

            <div className="border border-[#E7DFD2] rounded-xl overflow-hidden bg-white divide-y divide-[#F7F3EC]">
              {e.installments.map((i) => (
                <div key={i.no} className="p-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold w-20 shrink-0">Cuota #{i.no}</span>
                    <span className="flex items-center gap-1.5 text-[#7A6F63] w-28 shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-[#A89C8C]" />
                      {formatDate(i.dueDate)}
                    </span>
                    <span className="font-heading font-bold flex-1 text-right">{money(i.amount)}</span>
                    <span className="w-24 shrink-0 text-center">
                      <Badge variant={statusVariant[i.status]}>{installmentStatusLabel[i.status]}</Badge>
                    </span>
                    <span className="w-24 shrink-0 text-right">
                      {i.status !== "PAID" && (
                        <button type="button" onClick={() => setPaying(i)} disabled={busy || cashClosed} title={cashClosed ? "La caja está cerrada" : undefined}
                          className="bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-3 py-1.5 rounded-lg font-semibold cursor-pointer inline-flex items-center gap-1 disabled:opacity-60">
                          <DollarSign className="w-3.5 h-3.5" />
                          Pagar
                        </button>
                      )}
                    </span>
                  </div>
                  {i.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 pl-4 text-[11px] text-[#7A6F63]">
                      <span className="min-w-0 truncate">
                        {formatInstant(p.paidAt)} · {p.paymentMethodName}{p.accountName ? ` (${p.accountName})` : ""}
                        {p.notes ? ` · ${p.notes}` : ""}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-[#286B3E]">{money(p.amount)}</span>
                        <button type="button" onClick={() => { setVoidError(null); setVoiding(p); }} disabled={busy}
                          aria-label="Anular pago" title="Anular pago"
                          className="p-1 rounded-lg text-[#C0492F] hover:bg-[#FBEAE5] cursor-pointer disabled:opacity-60">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="pt-2 flex justify-end gap-2">
          {e && (
            <button type="button" onClick={() => setEditing(true)} disabled={busy}
              className="px-4 py-2 rounded-xl bg-[#FBF8F2] border border-[#E7DFD2] text-[#231E1A] hover:bg-[#F0E9DE] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60">
              <Edit2 className="w-3.5 h-3.5" />
              Modificar
            </button>
          )}
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] hover:text-[#231E1A] transition-colors cursor-pointer">
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
