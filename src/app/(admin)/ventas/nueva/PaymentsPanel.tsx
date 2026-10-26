"use client";

import { Plus, Trash2, CreditCard } from "lucide-react";
import type { FinancialAccount, PaymentMethod } from "@/lib/apiTypes";

/** One payment part as typed: amount is the base, before the method's surcharge. */
export interface PaymentRow { key: number; methodId: string; amount: string; accountId: string }

const fieldCls =
  "bg-[#15110E] border border-[#322A23] rounded-lg px-2 py-1.5 text-xs text-[#F5EAD6] outline-none focus:border-[#C87941]";

export const methodOf = (methods: PaymentMethod[], row: PaymentRow) => methods.find((m) => String(m.id) === row.methodId);

export default function PaymentsPanel({
  rows, onChange, methods, accounts, remaining,
}: {
  rows: PaymentRow[];
  onChange: (rows: PaymentRow[]) => void;
  methods: PaymentMethod[];
  accounts: FinancialAccount[];
  remaining: number;
}) {
  const update = (key: number, patch: Partial<PaymentRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const add = () =>
    onChange([
      ...rows,
      { key: Date.now(), methodId: methods[0] ? String(methods[0].id) : "", amount: remaining > 0 ? String(remaining) : "", accountId: "" },
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

      {rows.map((row) => {
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
              <input type="number" required min="0.01" step="0.01" placeholder="Monto" value={row.amount}
                onChange={(e) => update(row.key, { amount: e.target.value })}
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
