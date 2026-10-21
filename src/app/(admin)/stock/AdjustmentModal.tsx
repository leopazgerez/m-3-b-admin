"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { ApiErrorBanner, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { variantLabel } from "@/lib/format";
import { movementTypeLabel } from "@/lib/labels";
import type { AdjustmentResult, StockAdjustmentRequest, StockRow } from "@/lib/apiTypes";
import VariantPicker from "./VariantPicker";

const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white";
const label = "font-medium text-[#231E1A] block mb-1";

/** POST /stock/adjustments: DAMAGE takes units out (quantity > 0); ADJUSTMENT is signed (≠ 0). */
export default function AdjustmentModal({ row, onClose, onDone }: {
  row?: StockRow;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [variant, setVariant] = useState<StockRow | null>(row ?? null);
  const [type, setType] = useState<StockAdjustmentRequest["type"]>("DAMAGE");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const qty = Number(quantity);
  const valid = Number.isInteger(qty) && (type === "DAMAGE" ? qty > 0 : qty !== 0) && notes.trim() !== "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant || !valid) return;
    setError(null);
    setBusy(true);
    try {
      const body: StockAdjustmentRequest = { variantId: variant.variantId, type, quantity: qty, notes: notes.trim() };
      const r = await api.post<AdjustmentResult>("/stock/adjustments", body);
      onDone(`${movementTypeLabel[r.type]} de ${r.quantity} u. en ${variantLabel(variant)}. Stock actual: ${r.onHand} u.`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Registrar ajuste de stock">
      <form onSubmit={submit} className="flex flex-col gap-4 text-xs">
        <div>
          <span className={label}>Producto / modelo <span className="text-[#C0492F]">*</span></span>
          <VariantPicker value={variant} onChange={setVariant} disabled={busy} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Tipo <span className="text-[#C0492F]">*</span></label>
            <select value={type} onChange={(e) => setType(e.target.value as StockAdjustmentRequest["type"])} className={inputCls}>
              <option value="DAMAGE">{movementTypeLabel.DAMAGE} (resta unidades)</option>
              <option value="ADJUSTMENT">{movementTypeLabel.ADJUSTMENT} (+/−)</option>
            </select>
          </div>
          <div>
            <label className={label}>Cantidad <span className="text-[#C0492F]">*</span></label>
            <input type="number" step="1" min={type === "DAMAGE" ? 1 : undefined} required value={quantity}
              placeholder={type === "DAMAGE" ? "Ej. 2" : "Ej. -3 o 5"}
              onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={label}>Motivo <span className="text-[#C0492F]">*</span></label>
          <textarea required maxLength={500} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            className={`${inputCls} resize-none`} />
        </div>

        <ApiErrorBanner error={error} />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F7F3EC]">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={busy || !variant || !valid}
            className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-60">
            <SlidersHorizontal className="w-4 h-4" />
            <span>{busy ? "Registrando…" : "Confirmar ajuste"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
