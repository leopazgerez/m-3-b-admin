"use client";

import { useState } from "react";
import { ApiErrorBanner, Badge, Modal } from "@/components/ui";
import { CashClosedNotice } from "@/components/cash/CashStatus";
import { cancelBtn, inputCls, primaryBtn } from "@/components/cash/ui";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/useApi";
import { useCashStatus } from "@/lib/cashStatus";
import { feePreview, isAccreditable, parseReceived } from "@/lib/accreditation";
import { money } from "@/lib/format";
import { formatInstant } from "@/lib/dateUtils";
import { accreditationLabel } from "@/lib/labels";
import type { Accreditation, AccreditationFields, Payment } from "@/lib/apiTypes";

/** "A acreditar" / "Acreditado"; nothing for a method that doesn't charge a fee. */
export function AccreditationBadge({ a }: { a: Accreditation }) {
  return isAccreditable(a) ? <Badge variant={a === "PENDING" ? "warning" : "success"}>{accreditationLabel[a]}</Badge> : null;
}

/** "Recibido X · comisión Y · acreditado el Z" of an ACCREDITED payment (or sale payment line); nothing otherwise. */
export function AccreditationSummary({ p }: { p: AccreditationFields }) {
  if (p.accreditation !== "ACCREDITED") return null;
  return (
    <>
      Recibido {money(p.receivedAmount ?? 0)} · comisión {money(p.fee ?? 0)}
      {p.accreditedAt && <> · acreditado el {formatInstant(p.accreditedAt)}</>}
    </>
  );
}

/**
 * PUT /payments/{id}/accreditation: what the bank actually credited. On an ACCREDITED payment it is a correction
 * (prefilled); the backend decides whether it's still allowed and its 409s are shown verbatim. Pass `payment` when the
 * caller already has it (a list row); otherwise it is fetched.
 */
export function AccreditationModal({ paymentId, payment, onClose, onDone }: {
  paymentId: number; payment?: Payment; onClose: () => void; onDone: () => void;
}) {
  const res = useApiResource(
    () => (payment ? Promise.resolve(null) : api.getOne<Payment>(`/payments/${paymentId}`)),
    [paymentId, !!payment],
  );
  const p = payment ?? res.data;
  const loading = !payment && res.loading;
  const [received, setReceived] = useState<string | null>(null); // null = not touched: show the current value
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const value = received ?? (p?.receivedAmount != null ? String(p.receivedAmount) : "");
  const preview = p ? feePreview(value, p.amount) : null;
  const correcting = p?.accreditation === "ACCREDITED";
  const cashClosed = useCashStatus().closed;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!p) return;
    const r = parseReceived(value, p.amount);
    if ("error" in r) return setError(r.error);
    if (correcting && r.amount === p.receivedAmount) return onClose();
    setError(null);
    setBusy(true);
    try {
      await api.put<Payment>(`/payments/${p.id}/accreditation`, { receivedAmount: r.amount }, {
        success: correcting ? "Acreditación corregida." : `Acreditado ${money(r.amount)} en ${p.accountName ?? "la cuenta"}.`,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={correcting ? "Corregir acreditación" : "Acreditar cobro con tarjeta"} maxWidth="max-w-md">
      <ApiErrorBanner error={res.error} onRetry={res.reload} />
      {loading && <div className="p-6 text-center text-xs text-[#A89C8C]">Cargando pago…</div>}
      {p && !loading && (
        <form onSubmit={submit} className="flex flex-col gap-4 text-xs text-[#231E1A]">
          <div className="grid grid-cols-2 gap-3 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E7DFD2]">
            <div><span className="text-[#A89C8C]">Cobrado</span><div className="font-heading font-bold text-sm">{money(p.amount)}</div></div>
            <div><span className="text-[#A89C8C]">Fecha de cobro</span><div className="font-semibold">{formatInstant(p.paidAt)}</div></div>
            <div><span className="text-[#A89C8C]">Medio</span><div className="font-semibold">{p.paymentMethodName}</div></div>
            <div><span className="text-[#A89C8C]">Cuenta</span><div className="font-semibold">{p.accountName ?? "—"}</div></div>
            <div className="col-span-2"><span className="text-[#A89C8C]">Cliente</span><div className="font-semibold">{p.customerName ?? "Venta sin cliente"}</div></div>
            {correcting && (
              <div className="col-span-2 text-[#7A6F63]"><AccreditationSummary p={p} /></div>
            )}
          </div>
          <label className="flex flex-col gap-1 text-[#7A6F63]">
            Recibido en cuenta
            <input type="number" required min="0.01" max={p.amount} step="0.01" inputMode="decimal" autoFocus
              value={value} onChange={(e) => setReceived(e.target.value)} className={inputCls} />
            <span className="text-[11px] text-[#A89C8C]">Lo que muestra el banco por este cobro; la diferencia es la comisión.</span>
          </label>
          <div className="flex justify-between font-semibold">
            <span>Comisión</span>
            <span>{preview ? `${money(preview.fee)} (${preview.pct.toLocaleString("es-AR")} %)` : "—"}</span>
          </div>
          <CashClosedNotice what="registrar la acreditación" />
          <ApiErrorBanner error={error} />
          <div className="flex justify-end gap-3 pt-3 border-t border-[#F7F3EC]">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancelar</button>
            <button type="submit" disabled={busy || cashClosed} className={primaryBtn}>{correcting ? "Guardar corrección" : "Acreditar"}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
