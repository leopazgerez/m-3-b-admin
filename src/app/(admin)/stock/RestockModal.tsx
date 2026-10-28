"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { ApiErrorBanner, Modal } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useOptions } from "@/lib/useApi";
import { money, variantLabel } from "@/lib/format";
import type { RestockRequest, RestockResult, StockRow, Supplier } from "@/lib/apiTypes";
import VariantPicker from "./VariantPicker";

const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white";
const label = "font-medium text-[#231E1A] block mb-1";
const badField = "!border-[#C0492F] ring-2 ring-[#C0492F]/20";

// <input type="datetime-local"> value (local time) -> ISO UTC instant
const toInstant = (local: string) => new Date(local).toISOString();

/** POST /stock/restocks: receives merchandise. It records no expense: purchases are loaded in Gastos. */
export default function RestockModal({ row, productId, variantId, onClose, onDone }: {
  row?: StockRow;
  productId?: number;
  variantId?: number;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [variant, setVariant] = useState<StockRow | null>(row ?? null);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState(row?.unitCost != null ? String(row.unitCost) : "");
  const [supplierId, setSupplierId] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const bad = (f: keyof RestockRequest) => (error instanceof ApiError && error.field === f ? badField : "");

  const suppliers = useOptions<Supplier>("/suppliers", { filters: [{ field: "active", operator: "EQUALS", value: true }] });

  const pick = (r: StockRow | null) => {
    setVariant(r);
    if (r) setUnitCost(r.unitCost != null ? String(r.unitCost) : "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant) return;
    const body: RestockRequest = {
      variantId: variant.variantId,
      quantity: Number(quantity),
      unitCost: Number(unitCost),
    };
    if (supplierId) body.supplierId = Number(supplierId);
    if (receivedAt) body.receivedAt = toInstant(receivedAt);
    if (notes.trim()) body.notes = notes.trim();
    setError(null);
    setBusy(true);
    try {
      const r = await api.post<RestockResult>("/stock/restocks", body);
      onDone(`Re-stock de +${r.quantity} u. de ${variantLabel(variant)} (total ${money(r.totalCost)}). Stock actual: ${r.onHand} u.`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Registrar Re-stock" maxWidth="max-w-xl">
      <form onSubmit={submit} className="flex flex-col gap-4 text-xs">
        <ApiErrorBanner error={suppliers.error} onRetry={suppliers.reload} />

        <div>
          <span className={label}>Producto / modelo <span className="text-[#C0492F]">*</span></span>
          <VariantPicker value={variant} onChange={pick} productId={productId} variantId={variantId} disabled={busy} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Cantidad a ingresar <span className="text-[#C0492F]">*</span></label>
            <input type="number" min="1" step="1" required value={quantity}
              onChange={(e) => setQuantity(e.target.value)} className={`${inputCls} ${bad("quantity")}`} />
          </div>
          <div>
            <label className={label}>Costo unitario ($) <span className="text-[#C0492F]">*</span></label>
            <input type="number" min="0" step="0.01" required value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)} className={`${inputCls} ${bad("unitCost")}`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Proveedor {!variant?.supplierName && <span className="text-[#C0492F]">*</span>}</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required={!variant?.supplierName}
              className={`${inputCls} ${bad("supplierId")}`}>
              <option value="">{variant?.supplierName ? `Por defecto: ${variant.supplierName}` : "Elegí un proveedor"}</option>
              {suppliers.options.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Fecha de recepción</label>
            <input type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className={`${inputCls} ${bad("receivedAt")}`} />
            <span className="text-[10px] text-[#A89C8C]">Vacío = ahora</span>
          </div>
        </div>

        <div>
          <label className={label}>Notas (opcional)</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} ${bad("notes")}`} />
        </div>

        <p className="text-[11px] text-[#A89C8C]">
          El re-stock solo ingresa la mercadería: la compra se carga aparte en Gastos.
        </p>

        <ApiErrorBanner error={error} />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F7F3EC]">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={busy || !variant}
            className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-60">
            <PackagePlus className="w-4 h-4" />
            <span>{busy ? "Registrando…" : "Confirmar Re-stock"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
