"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { ApiErrorBanner } from "@/components/ui";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { liveDifference, toAmounts } from "@/lib/cashSession";
import { useCashStatus } from "@/lib/cashStatus";
import type { CashSession } from "@/lib/apiTypes";
import { cancelBtn, diffCls, diffText, inputCls, primaryBtn } from "@/components/cash/ui";

/**
 * "Hacer caja": one count per account of the session → POST /cash-sessions/{id}/close. A difference never blocks it.
 * Stays disabled while the shared status re-checks after the close, so the closed session can't be submitted twice.
 */
export default function CountForm({ session, onClosed, onCancel }: {
  session: CashSession;
  onClosed: (closed: CashSession) => void;
  onCancel?: () => void;
}) {
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const cash = useCashStatus();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = toAmounts(session.accounts, amounts);
    if ("error" in r) { setError(r.error); return; }
    setError(null);
    setBusy(true);
    try {
      onClosed(await api.post<CashSession>(`/cash-sessions/${session.sessionId}/close`, { counts: r.amounts }, { success: "Caja cerrada." }));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 text-xs">
      <div className="flex flex-col gap-3">
        {session.accounts.map((a) => {
          const diff = liveDifference(amounts[a.accountId] ?? "", a.expected);
          return (
            <div key={a.accountId} className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] sm:grid-cols-[minmax(0,1fr)_8rem_10rem_8rem] gap-x-3 gap-y-1 items-center">
              <label htmlFor={`count-${a.accountId}`} className="font-semibold text-[#231E1A] truncate">
                {a.name} {a.deleted && <span className="text-[#C0492F] font-normal">(eliminada)</span>}
              </label>
              <span className="text-right text-[#7A6F63] sm:order-none">
                <span className="sm:hidden">Esperado </span>{money(a.expected)}
              </span>
              <input id={`count-${a.accountId}`} type="number" step="0.01" inputMode="decimal" required
                value={amounts[a.accountId] ?? ""} onChange={(e) => setAmounts({ ...amounts, [a.accountId]: e.target.value })}
                placeholder="Contado" className={`${inputCls} col-span-2 sm:col-span-1`} />
              <span className={`text-right col-span-2 sm:col-span-1 ${diffCls(diff)}`}>
                {diffText(diff)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-[#A89C8C]">La diferencia es orientativa; al cerrar se muestran las cifras del sistema.</p>

      <ApiErrorBanner error={error} />

      <div className="pt-3 border-t border-[#F7F3EC] flex items-center justify-end gap-2.5">
        {onCancel && (
          <button type="button" onClick={onCancel} className={cancelBtn}>
            Cancelar
          </button>
        )}
        <button type="submit" disabled={busy || cash.loading} className={primaryBtn}>
          <Calculator className="w-4 h-4" />
          <span>{busy ? "Cerrando…" : "Cerrar caja"}</span>
        </button>
      </div>
    </form>
  );
}
