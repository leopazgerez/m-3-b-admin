"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ApiErrorBanner, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { movementBody, toLocalDateTimeInput, type MovementDraft } from "@/lib/cashSession";
import { cashMovementTypeLabel } from "@/lib/labels";
import type { CashMovementType, CashSession } from "@/lib/apiTypes";
import { cancelBtn, inputCls, primaryBtn } from "@/components/cash/ui";
const label = "font-semibold text-[#231E1A] block mb-1";

// no manual WITHDRAWAL: money only leaves through gastos, where it is categorized
const typeHint: Partial<Record<CashMovementType, string>> = { INCOME: "préstamo, aporte", TRANSFER: "de una cuenta a otra" };

/** POST /cash-movements: manual money in, out or between accounts of the open session. */
export default function MovementFormModal({ session, onClose, onDone }: {
  session: CashSession;
  onClose: () => void;
  onDone: () => void;
}) {
  const [d, setD] = useState<MovementDraft>({
    type: "INCOME", fromAccountId: "", toAccountId: "", amount: "", movedAt: "", reason: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const set = (k: keyof MovementDraft) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value });
  const accounts = session.accounts.filter((a) => !a.deleted);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = movementBody(d);
    if ("error" in r) { setError(r.error); return; }
    setError(null);
    setBusy(true);
    try {
      await api.post("/cash-movements", r.body, { success: `${cashMovementTypeLabel[d.type]} registrado.` });
      onDone();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const accountSelect = (k: "fromAccountId" | "toAccountId", text: string) => (
    <div>
      <label className={label}>{text} <span className="text-[#C0492F]">*</span></label>
      <select value={d[k]} onChange={set(k)} required className={inputCls}>
        <option value="">Elegí…</option>
        {accounts.map((a) => <option key={a.accountId} value={a.accountId}>{a.name}</option>)}
      </select>
    </div>
  );

  return (
    <Modal isOpen onClose={onClose} title="Registrar movimiento" maxWidth="max-w-md">
      <form onSubmit={submit} className="flex flex-col gap-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(typeHint) as CashMovementType[]).map((t) => (
            <button key={t} type="button" onClick={() => setD({ ...d, type: t })}
              className={`px-3 py-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                d.type === t ? "border-[#9C5A2E] bg-[#F5EAD6] text-[#7A3F1F]" : "border-[#E7DFD2] text-[#7A6F63] hover:bg-[#FBF8F2]"
              }`}>
              <span className="font-semibold block">{cashMovementTypeLabel[t]}</span>
              <span className="text-[10px]">{typeHint[t]}</span>
            </button>
          ))}
        </div>

        <div className={`grid gap-3 ${d.type === "TRANSFER" ? "grid-cols-2" : "grid-cols-1"}`}>
          {d.type !== "INCOME" && accountSelect("fromAccountId", "Sale de")}
          {d.type !== "WITHDRAWAL" && accountSelect("toAccountId", "Entra a")}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Monto ($) <span className="text-[#C0492F]">*</span></label>
            <input type="number" min="0.01" step="0.01" inputMode="decimal" required value={d.amount} onChange={set("amount")}
              className={inputCls} />
          </div>
          <div>
            <label className={label}>Fecha y hora</label>
            <input type="datetime-local" max={toLocalDateTimeInput()} value={d.movedAt} onChange={set("movedAt")} className={inputCls} />
            <span className="text-[10px] text-[#A89C8C]">Vacío = ahora</span>
          </div>
        </div>

        <div>
          <label className={label}>Motivo <span className="text-[#C0492F]">*</span></label>
          <input type="text" maxLength={500} required value={d.reason} onChange={set("reason")}
            placeholder="Ej: Préstamo Sánchez, Ahorro" className={inputCls} />
        </div>

        <ApiErrorBanner error={error} />

        <div className="pt-3 border-t border-[#F7F3EC] flex items-center justify-end gap-2.5">
          <button type="button" onClick={onClose} className={cancelBtn}>
            Cancelar
          </button>
          <button type="submit" disabled={busy} className={primaryBtn}>
            <CheckCircle2 className="w-4 h-4" />
            <span>{busy ? "Registrando…" : "Registrar"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
