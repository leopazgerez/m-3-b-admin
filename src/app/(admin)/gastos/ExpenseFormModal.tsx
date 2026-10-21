"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { ApiErrorBanner, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { useOptions } from "@/lib/useApi";
import { money } from "@/lib/format";
import { pastDayToInstant, toLocalISODate } from "@/lib/dateUtils";
import { expenseKindLabel } from "@/lib/labels";
import type {
  Expense, ExpenseCategory, ExpenseFields, ExpenseKind, FinancialAccount, PaymentMethod, Supplier,
} from "@/lib/apiTypes";

const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white disabled:text-[#A89C8C]";
const label = "font-semibold text-[#231E1A] block mb-1";

/**
 * Create (POST /expenses) or edit the header of an expense (PATCH /expenses/{id}: only changed keys, null clears).
 * Amount and installments cannot change once recorded; they show read-only when editing.
 */
export default function ExpenseFormModal({ expense, onClose, onDone }: {
  expense?: Expense;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const today = toLocalISODate();
  const [description, setDescription] = useState(expense?.description ?? "");
  const [categoryId, setCategoryId] = useState(expense ? String(expense.categoryId) : "");
  const [kind, setKind] = useState<ExpenseKind>(expense?.kind ?? "VARIABLE");
  const [supplierId, setSupplierId] = useState(expense?.supplierId != null ? String(expense.supplierId) : "");
  const [incurredOn, setIncurredOn] = useState(expense?.incurredOn ?? today);
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [payNow, setPayNow] = useState(false);
  const [methodId, setMethodId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const categories = useOptions<ExpenseCategory>("/expense-categories");
  const suppliers = useOptions<Supplier>("/suppliers", { filters: [{ field: "active", operator: "EQUALS", value: true }] });
  const methods = useOptions<PaymentMethod>("/payment-methods");
  const accounts = useOptions<FinancialAccount>("/financial-accounts");
  const optionsError = categories.error ?? suppliers.error ?? methods.error ?? accounts.error;
  const reloadOptions = () => { categories.reload(); suppliers.reload(); methods.reload(); accounts.reload(); };

  const category = categories.options.find((c) => String(c.id) === categoryId);
  // An inactive supplier is not in the options, but an existing expense may still point at it.
  const keepSupplier = expense?.supplierId != null && !suppliers.options.some((s) => s.id === expense.supplierId);

  const send = async (fn: () => Promise<unknown>, message: string) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      onDone(message);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = supplierId ? Number(supplierId) : null;
    const note = notes.trim() || null;

    if (expense) {
      const changes: ExpenseFields = {};
      if (Number(categoryId) !== expense.categoryId) changes.categoryId = Number(categoryId);
      if (kind !== expense.kind) changes.kind = kind;
      if (supplier !== expense.supplierId) changes.supplierId = supplier;
      if (description.trim() !== expense.description) changes.description = description.trim();
      if (incurredOn !== expense.incurredOn) changes.incurredOn = incurredOn;
      if (note !== expense.notes) changes.notes = note;
      if (Object.keys(changes).length === 0) return onClose();
      return send(() => api.patch(`/expenses/${expense.id}`, changes), "Gasto actualizado.");
    }

    const body: ExpenseFields = {
      categoryId: Number(categoryId), kind, description: description.trim(), incurredOn, amount: Number(amount),
    };
    if (supplier != null) body.supplierId = supplier;
    if (installments) body.installments = Number(installments);
    if (firstDueDate) body.firstDueDate = firstDueDate;
    if (note) body.notes = note;
    if (payNow) {
      body.payFirstNow = { paymentMethodId: Number(methodId) };
      if (accountId) body.payFirstNow.accountId = Number(accountId);
      const paidAt = pastDayToInstant(paidOn, today);
      if (paidAt) body.payFirstNow.paidAt = paidAt;
    }
    return send(() => api.post("/expenses", body), "Gasto registrado.");
  };

  return (
    <Modal isOpen onClose={onClose} title={expense ? "Modificar gasto" : "Registrar nuevo gasto"} maxWidth="max-w-2xl">
      <form onSubmit={submit} className="flex flex-col gap-4 text-xs">
        <ApiErrorBanner error={optionsError} onRetry={reloadOptions} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className={label}>Concepto del gasto <span className="text-[#C0492F]">*</span></label>
            <input type="text" required autoFocus maxLength={200} value={description}
              placeholder="Ej. Alquiler taller, Grabadora láser…"
              onChange={(e) => setDescription(e.target.value)} className={`${inputCls} font-medium`} />
          </div>
          <div>
            <label className={label}>Tipo</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as ExpenseKind)} className={inputCls}>
              {(Object.keys(expenseKindLabel) as ExpenseKind[]).map((k) => (
                <option key={k} value={k}>{expenseKindLabel[k]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>Categoría <span className="text-[#C0492F]">*</span></label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className={`${inputCls} font-semibold`}>
              <option value="">Elegí una categoría</option>
              {expense && !category && <option value={expense.categoryId}>{expense.categoryName}</option>}
              {categories.options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Proveedor</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls}>
              <option value="">Sin proveedor</option>
              {keepSupplier && <option value={expense.supplierId!}>{expense.supplierName}</option>}
              {suppliers.options.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {category?.description && (
          <div className="p-2.5 rounded-xl bg-[#FBF8F2] border border-[#E7DFD2] text-[11px] text-[#7A6F63] flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#9C5A2E] shrink-0 mt-0.5" />
            <span><strong>Qué representa:</strong> {category.description}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>Monto total ($) {!expense && <span className="text-[#C0492F]">*</span>}</label>
            {expense ? (
              <input type="text" disabled value={money(expense.total)} className={inputCls} />
            ) : (
              <input type="number" required min="0.01" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} className={`${inputCls} font-bold`} />
            )}
          </div>
          <div>
            <label className={label}>Fecha del gasto <span className="text-[#C0492F]">*</span></label>
            <input type="date" required max={today} value={incurredOn}
              onChange={(e) => setIncurredOn(e.target.value)} className={inputCls} />
          </div>
        </div>

        {expense ? (
          <div className="text-[11px] text-[#7A6F63]">
            {expense.installments.length === 1 ? "Un solo pago" : `${expense.installments.length} cuotas`}. El monto y las cuotas
            no se pueden modificar.
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-[#E7DFD2] bg-[#FBF8F2]/60 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>Cuotas</label>
                <input type="number" min="1" max="24" step="1" placeholder="1" value={installments}
                  onChange={(e) => setInstallments(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={label}>Vencimiento 1ª cuota</label>
                <input type="date" min={incurredOn} value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)} className={inputCls} />
                <span className="text-[10px] text-[#A89C8C]">Las siguientes vencen mes a mes. Vacío = sin vencimiento.</span>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={payNow} onChange={(e) => setPayNow(e.target.checked)}
                className="w-4 h-4 accent-[#9C5A2E]" />
              <span className="font-semibold text-[#231E1A]">Pagar la primera cuota ahora</span>
            </label>
            {payNow && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={label}>Medio de pago <span className="text-[#C0492F]">*</span></label>
                  <select value={methodId} onChange={(e) => setMethodId(e.target.value)} required className={inputCls}>
                    <option value="">Elegí…</option>
                    {methods.options.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Cuenta</label>
                  <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls}>
                    <option value="">La del medio</option>
                    {accounts.options.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Fecha de pago</label>
                  <input type="date" min={incurredOn} max={today} value={paidOn}
                    onChange={(e) => setPaidOn(e.target.value)} className={inputCls} />
                  <span className="text-[10px] text-[#A89C8C]">Vacío u hoy = ahora</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className={label}>Notas</label>
          <textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Número de factura, detalles del pedido…"
            className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl p-3 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white resize-none" />
        </div>

        <ApiErrorBanner error={error} />

        <div className="pt-3 border-t border-[#F7F3EC] flex items-center justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={busy}
            className="bg-[#9C5A2E] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer disabled:opacity-60">
            {busy ? "Guardando…" : expense ? "Guardar cambios" : "Registrar gasto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
