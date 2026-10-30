"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ApiErrorBanner, Modal } from "@/components/ui";
import { CashClosedNotice } from "@/components/cash/CashStatus";
import { useCashStatus } from "@/lib/cashStatus";
import { api } from "@/lib/api";
import { useOptions } from "@/lib/useApi";
import { defaultAccountOption, money } from "@/lib/format";
import { formatDate, pastDayToInstant, toLocalISODate } from "@/lib/dateUtils";
import type { Expense, ExpenseInstallment, ExpensePaymentFields, FinancialAccount, PaymentMethod } from "@/lib/apiTypes";

const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white";
const label = "font-semibold text-[#231E1A] block mb-1";

/** POST /expenses/{id}/installments/{no}/payments. Without amount the backend pays what the installment still owes. */
export default function InstallmentPaymentModal({ expense, installment, onClose, onDone }: {
  expense: Expense;
  installment: ExpenseInstallment;
  onClose: () => void;
  onDone: () => void;
}) {
  const [methodId, setMethodId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const cashClosed = useCashStatus().closed;

  const methods = useOptions<PaymentMethod>("/payment-methods");
  const method = methods.options.find((m) => String(m.id) === methodId);
  const accounts = useOptions<FinancialAccount>("/financial-accounts");
  const today = toLocalISODate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: ExpensePaymentFields = { paymentMethodId: Number(methodId) };
    if (accountId) body.accountId = Number(accountId);
    const paidAt = pastDayToInstant(paidOn, today);
    if (paidAt) body.paidAt = paidAt;
    if (amount) body.amount = Number(amount);
    if (notes.trim()) body.notes = notes.trim();
    setError(null);
    setBusy(true);
    try {
      await api.post(`/expenses/${expense.id}/installments/${installment.no}/payments`, body);
      onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Pagar cuota #${installment.no}`} maxWidth="max-w-md">
      <form onSubmit={submit} className="flex flex-col gap-4 text-xs">
        <ApiErrorBanner error={methods.error ?? accounts.error} onRetry={() => { methods.reload(); accounts.reload(); }} />
        <CashClosedNotice what="pagar cuotas" />

        <div className="bg-[#FBF8F2] border border-[#E7DFD2] p-3.5 rounded-xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="font-bold text-[#231E1A] block truncate">{expense.description}</span>
            <span className="text-[11px] text-[#7A6F63]">Vencimiento: {formatDate(installment.dueDate)}</span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-[#A89C8C] block uppercase font-semibold">Monto cuota</span>
            <span className="font-heading font-bold text-base text-[#9C5A2E]">{money(installment.amount)}</span>
            {installment.paid > 0 && <span className="block text-[10px] text-[#7A6F63]">Pagado {money(installment.paid)}</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Medio de pago <span className="text-[#C0492F]">*</span></label>
            <select value={methodId} onChange={(e) => { setMethodId(e.target.value); setAccountId(""); }} required className={inputCls}>
              <option value="">Elegí…</option>
              {methods.options.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Cuenta</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required={method?.defaultAccountId == null} className={inputCls}>
              <option value="">{defaultAccountOption(method)}</option>
              {accounts.options.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Monto ($)</label>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="Lo que debe la cuota" className={inputCls} />
            <span className="text-[10px] text-[#A89C8C]">Vacío = saldo de la cuota</span>
          </div>
          <div>
            <label className={label}>Fecha de pago</label>
            <input type="date" min={expense.incurredOn} max={today} value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)} className={inputCls} />
            <span className="text-[10px] text-[#A89C8C]">Vacío u hoy = ahora</span>
          </div>
        </div>

        <div>
          <label className={label}>Comprobante / notas</label>
          <input type="text" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </div>

        <ApiErrorBanner error={error} />

        <div className="pt-3 border-t border-[#F7F3EC] flex items-center justify-end gap-2.5">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={busy || cashClosed}
            className="bg-[#286B3E] hover:bg-[#1E5230] text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60">
            <CheckCircle2 className="w-4 h-4" />
            <span>{busy ? "Registrando…" : "Confirmar pago"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
