"use client";

import { Plus, Trash2, CreditCard } from "lucide-react";
import { fillPayments } from "@/lib/saleEstimate";
import type { FinancialAccount, PaymentMethod } from "@/lib/apiTypes";

/** One payment part: amount is the base, before the method's surcharge. auto: not typed yet, it follows the balance. */
export interface PaymentRow { key: number; methodId: string; amount: string; accountId: string; auto: boolean }

const fieldCls =
  "bg-[#15110E] border border-[#322A23] rounded-lg px-2 py-1.5 text-xs text-[#F5EAD6] outline-none focus:border-[#C87941]";

export const methodOf = (methods: PaymentMethod[], row: PaymentRow) => methods.find((m) => String(m.id) === row.methodId);

/** Each row's amount to estimate and send; `due` is what the payments must cover (before surcharges). */
export const paymentAmounts = (rows: PaymentRow[], due: number) =>
  fillPayments(rows.map((r) => (r.auto ? null : Number(r.amount) || 0)), due);

export default function PaymentsPanel({
  rows, onChange, methods, accounts, amounts,
}: {
  rows: PaymentRow[];
  onChange: (rows: PaymentRow[]) => void;
  methods: PaymentMethod[];
  accounts: FinancialAccount[];
  /** paymentAmounts(rows, due) */
  amounts: number[];
}) {
  const update = (key: number, patch: Partial<PaymentRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // the new row takes over following the balance; the one that did keeps the amount it shows
  const add = () =>
    onChange([
      ...rows.map((r, i) => (r.auto ? { ...r, auto: false, amount: amounts[i] > 0 ? String(amounts[i]) : "" } : r)),
      { key: Date.now(), methodId: methods[0] ? String(methods[0].id) : "", amount: "", accountId: "", auto: true },
    ]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[#C9BCA9] flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-[#C87941]" />
          <span>Pagos</span>
        </label>
        <button type="button" onClick={add}
          className="text-[11px] text-[#C87941] hover:text-[#F5EAD6] flex items-center gap-1 cursor-pointer font-medium">
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar pago</span>
        </button>
      </div>

      {rows.length === 0 && (
        <p className="text-[11px] text-[#A89C8C]">Sin pagos: queda todo como saldo pendiente del cliente.</p>
      )}

      {rows.map((row, i) => {
        const method = methodOf(methods, row);
        const needsAccount = !!method && method.defaultAccountId == null;
        return (
          <div key={row.key} className="bg-[#15110E] p-2.5 rounded-xl border border-[#322A23] flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <select required value={row.methodId} onChange={(e) => update(row.key, { methodId: e.target.value, accountId: "" })}
                className={`${fieldCls} flex-1 min-w-0`}>
                <option value="">Medio…</option>
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}{m.surchargePct > 0 ? ` (+${m.surchargePct}%)` : ""}</option>
                ))}
              </select>
              <input type="number" required min="0.01" step="0.01" placeholder={row.auto ? "Lo que falta" : "Monto"}
                value={row.auto ? (amounts[i] > 0 ? String(amounts[i]) : "") : row.amount}
                onChange={(e) => update(row.key, { amount: e.target.value, auto: false })}
                className={`${fieldCls} w-28 text-right font-bold`} />
              <button type="button" onClick={() => onChange(rows.filter((r) => r.key !== row.key))} title="Quitar pago"
                className="text-[#A89C8C] hover:text-[#C0492F] p-1 cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {needsAccount && (
              <select required value={row.accountId} onChange={(e) => update(row.key, { accountId: e.target.value })} className={fieldCls}>
                <option value="">Cuenta destino… (el medio no tiene una por defecto)</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
          </div>
        );
      })}
      {rows.length > 0 && (
        <p className="text-[10px] text-[#A89C8C]">El monto es sin recargo; el recargo del medio se suma al total.</p>
      )}
    </div>
  );
}
