"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { ApiErrorBanner, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { useOptions } from "@/lib/useApi";
import { money, variantLabel } from "@/lib/format";
import type {
  ExpenseCategory, FinancialAccount, PaymentMethod, RestockRequest, RestockResult, StockRow, Supplier,
} from "@/lib/apiTypes";
import VariantPicker from "./VariantPicker";

const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white";
const label = "font-medium text-[#231E1A] block mb-1";

// <input type="datetime-local"> value (local time) -> ISO UTC instant
const toInstant = (local: string) => new Date(local).toISOString();

/** POST /stock/restocks: receives merchandise and records its expense (optionally in installments, first paid now). */
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
  const [categoryId, setCategoryId] = useState("");
  const [installments, setInstallments] = useState("");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [payNow, setPayNow] = useState(false);
  const [methodId, setMethodId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const suppliers = useOptions<Supplier>("/suppliers", { filters: [{ field: "active", operator: "EQUALS", value: true }] });
  const categories = useOptions<ExpenseCategory>("/expense-categories");
  const methods = useOptions<PaymentMethod>("/payment-methods");
  const accounts = useOptions<FinancialAccount>("/financial-accounts");
  const optionsError = suppliers.error ?? categories.error ?? methods.error ?? accounts.error;
  const reloadOptions = () => { suppliers.reload(); categories.reload(); methods.reload(); accounts.reload(); };

  const pick = (r: StockRow | null) => {
    setVariant(r);
    if (r && unitCost === "" && r.unitCost != null) setUnitCost(String(r.unitCost));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant) return;
    const body: RestockRequest = {
      variantId: variant.variantId,
      quantity: Number(quantity),
      unitCost: Number(unitCost),
      expenseCategoryId: Number(categoryId),
    };
    if (supplierId) body.supplierId = Number(supplierId);
    if (receivedAt) body.receivedAt = toInstant(receivedAt);
    if (notes.trim()) body.notes = notes.trim();
    if (installments) body.installments = Number(installments);
    if (firstDueDate) body.firstDueDate = firstDueDate;
    if (payNow) {
      body.payFirstNow = { paymentMethodId: Number(methodId) };
      if (accountId) body.payFirstNow.accountId = Number(accountId);
      if (paidAt) body.payFirstNow.paidAt = toInstant(paidAt);
    }
    setError(null);
    setBusy(true);
    try {
      const r = await api.post<RestockResult>("/stock/restocks", body);
      onDone(
        `Re-stock de +${r.quantity} u. de ${variantLabel(variant)} (total ${money(r.totalCost)}). Stock actual: ${r.onHand} u.` +
          (r.expenseId != null ? ` Gasto #${r.expenseId} registrado.` : ""),
      );
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Registrar Re-stock" maxWidth="max-w-xl">
      <form onSubmit={submit} className="flex flex-col gap-4 text-xs">
        <ApiErrorBanner error={optionsError} onRetry={reloadOptions} />

        <div>
          <span className={label}>Producto / modelo <span className="text-[#C0492F]">*</span></span>
          <VariantPicker value={variant} onChange={pick} productId={productId} variantId={variantId} disabled={busy} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Cantidad a ingresar <span className="text-[#C0492F]">*</span></label>
            <input type="number" min="1" step="1" required value={quantity}
              onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={label}>Costo unitario ($) <span className="text-[#C0492F]">*</span></label>
            <input type="number" min="0" step="0.01" required value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Proveedor {!variant?.supplierName && <span className="text-[#C0492F]">*</span>}</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required={!variant?.supplierName}
              className={inputCls}>
              <option value="">{variant?.supplierName ? `Por defecto: ${variant.supplierName}` : "Elegí un proveedor"}</option>
              {suppliers.options.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Fecha de recepción</label>
            <input type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className={inputCls} />
            <span className="text-[10px] text-[#A89C8C]">Vacío = ahora</span>
          </div>
        </div>

        <div>
          <label className={label}>Notas (opcional)</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </div>

        <div className="bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl p-3 flex flex-col gap-3">
          <span className="font-semibold text-[#231E1A]">Gasto de la compra</span>
          <div>
            <label className={label}>Categoría de gasto <span className="text-[#C0492F]">*</span></label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className={inputCls}>
              <option value="">Elegí una categoría</option>
              {categories.options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Cuotas (opcional)</label>
              <input type="number" min="1" max="24" step="1" placeholder="1" value={installments}
                onChange={(e) => setInstallments(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={label}>Vencimiento 1ª cuota (opcional)</label>
              <input type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={payNow} onChange={(e) => setPayNow(e.target.checked)} />
            <span className="font-medium text-[#231E1A]">Pagar la primera cuota ahora</span>
          </label>
          {payNow && (
            <div className="grid grid-cols-3 gap-3">
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
                <input type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}
        </div>

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
