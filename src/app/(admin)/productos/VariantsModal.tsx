"use client";

import { useState } from "react";
import Link from "next/link";
import { Coffee, Truck, Layers, Pencil, Trash2, History, PackagePlus, ScanBarcode, Plus } from "lucide-react";
import { ApiErrorBanner, ConfirmDeleteModal, Modal, StatusBadge } from "@/components/ui";
import { money } from "@/lib/format";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/useApi";
import type { Product, UpdateVariantCommand, Variant, VariantDraft } from "@/lib/apiTypes";
import CostHistoryModal from "./CostHistoryModal";
import BarcodeScanner from "@/components/ui/BarcodeScanner";

const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white";

interface VariantFields { name: string; sku: string; price: string; cost: string }
const STANDARD = "STANDARD"; // backend name of a simple product's only variant
const emptyDraft = { name: "", sku: "", price: "", cost: "", initialStock: "" };

/** Product detail: its variants with inline edit, add, delete, cost history and restock links. */
export default function VariantsModal({ productId, onClose, onChanged }: {
  productId: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: product, error: loadError, reload } = useApiResource(
    () => api.getOne<Product>(`/products/${productId}`),
    [productId],
  );
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<(VariantFields & { id: number; active: boolean }) | null>(null);
  const [editError, setEditError] = useState<unknown>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [addError, setAddError] = useState<unknown>(null);
  const [deleting, setDeleting] = useState<Variant | null>(null);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const [historyFor, setHistoryFor] = useState<Variant | null>(null);
  const [scanning, setScanning] = useState<"edit" | "draft" | null>(null);

  const write = async (fn: () => Promise<unknown>, onError: (e: unknown) => void, onDone?: () => void) => {
    setBusy(true);
    try {
      await fn();
      onDone?.();
      reload();
      onChanged();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (v: Variant) => {
    setEditError(null);
    setEditing({ id: v.id, name: v.name, sku: v.sku ?? "", price: String(v.price), cost: String(v.cost), active: v.active });
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = product?.variants.find((x) => x.id === editing?.id);
    if (!editing || !v) return;
    // PATCH: only changed keys; sku "" clears it.
    const body: UpdateVariantCommand = {};
    if (v.name !== STANDARD && editing.name.trim() !== v.name) body.name = editing.name.trim();
    if (editing.sku.trim() !== (v.sku ?? "")) body.sku = editing.sku.trim();
    if (Number(editing.price) !== v.price) body.price = Number(editing.price);
    if (Number(editing.cost) !== v.cost) body.cost = Number(editing.cost);
    if (editing.active !== v.active) body.active = editing.active;
    if (Object.keys(body).length === 0) return setEditing(null);
    setEditError(null);
    write(() => api.patch(`/variants/${v.id}`, body), setEditError, () => setEditing(null));
  };

  const addVariant = (e: React.FormEvent) => {
    e.preventDefault();
    const body: VariantDraft = { name: draft.name.trim(), price: Number(draft.price), cost: Number(draft.cost) };
    if (draft.sku.trim()) body.sku = draft.sku.trim();
    if (draft.initialStock) body.initialStock = Number(draft.initialStock);
    setAddError(null);
    write(() => api.post(`/products/${productId}/variants`, body), setAddError, () => setDraft(emptyDraft));
  };

  const handleDelete = () => {
    if (!deleting) return;
    setDeleteError(null);
    write(() => api.del(`/variants/${deleting.id}`), setDeleteError);
  };

  if (historyFor) return <CostHistoryModal variant={historyFor} onClose={() => setHistoryFor(null)} />;

  const restockHref = (variantId?: number) =>
    `/stock?productId=${productId}${variantId ? `&variantId=${variantId}` : ""}`;

  return (
    <>
      <Modal isOpen onClose={onClose} title="Ficha del producto" maxWidth="max-w-3xl">
        <div className="flex flex-col gap-5 text-xs">
          <ApiErrorBanner error={loadError} onRetry={reload} />

          {product && (
            <>
              <div className="flex items-start gap-3.5 bg-[#FBF8F2] p-4 rounded-2xl border border-[#E7DFD2]">
                <div className="w-12 h-12 rounded-xl bg-[#EADBC6] text-[#9C5A2E] flex items-center justify-center shrink-0 shadow-inner">
                  <Coffee className="w-6 h-6" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading font-bold text-base text-[#231E1A] truncate">
                      {product.name}
                      {!product.active && <span className="ml-2 text-[10px] font-medium text-[#A89C8C]">(inactivo)</span>}
                    </span>
                    <StatusBadge status={product.status} />
                  </div>
                  {product.subtitle && <span className="text-xs text-[#7A6F63] mt-0.5">{product.subtitle}</span>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-[#A89C8C] flex-wrap">
                    <span>Categoría: {product.categoryName ?? "—"}</span>
                    {product.defaultSupplierName && (
                      <span className="flex items-center gap-1.5 text-[#9C5A2E] font-medium bg-[#EADBC6]/40 border border-[#E7DFD2] px-2 py-0.5 rounded-md">
                        <Truck className="w-3.5 h-3.5" />
                        <span>Proveedor: {product.defaultSupplierName}</span>
                      </span>
                    )}
                    <span>Stock: <strong className="text-[#231E1A]">{product.onHand} u.</strong></span>
                    <span>Mínimo: {product.minStock} u.</span>
                  </div>
                </div>
              </div>

              <ApiErrorBanner error={deleteError} />

              <div className="bg-[#FAF7F2] border border-[#E7DFD2] rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#9C5A2E]" />
                    <span className="font-semibold text-xs text-[#231E1A]">
                      {product.hasVariants ? `Modelos (${product.variants.length})` : "Producto simple"}
                    </span>
                  </div>
                  <Link
                    href={restockHref()}
                    className="flex items-center gap-1.5 bg-[#9C5A2E] text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    <span>Reponer stock</span>
                  </Link>
                </div>

                <div className="bg-white rounded-xl border border-[#E7DFD2] divide-y divide-[#F7F3EC] overflow-x-auto">
                  {product.variants.map((v) =>
                    editing?.id === v.id ? (
                      <form key={v.id} onSubmit={saveEdit} className="p-3 flex flex-col gap-2.5 bg-[#FBF8F2]/60">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {v.name === STANDARD ? (
                            <input disabled value="Estándar" className={`${inputCls} opacity-60`} />
                          ) : (
                            <input required maxLength={80} placeholder="Nombre" value={editing.name}
                              onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} />
                          )}
                          <div className="relative">
                            <input maxLength={40} placeholder="SKU (vacío = sin código)" value={editing.sku}
                              onChange={(e) => setEditing({ ...editing, sku: e.target.value })} className={`${inputCls} font-mono pr-8`} />
                            <button type="button" onClick={() => setScanning("edit")} title="Escanear código"
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[#7A6F63] hover:text-[#9C5A2E] cursor-pointer">
                              <ScanBarcode className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input required type="number" min="0" step="0.01" placeholder="Precio" value={editing.price}
                            onChange={(e) => setEditing({ ...editing, price: e.target.value })} className={inputCls} />
                          <input required type="number" min="0" step="0.01" placeholder="Costo" value={editing.cost}
                            onChange={(e) => setEditing({ ...editing, cost: e.target.value })} className={inputCls} />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2 font-semibold text-[#231E1A] cursor-pointer">
                            <input type="checkbox" checked={editing.active}
                              onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                            Activo
                          </label>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setEditing(null)}
                              className="px-3 py-1.5 rounded-xl text-[#7A6F63] hover:bg-white cursor-pointer">Cancelar</button>
                            <button type="submit" disabled={busy}
                              className="bg-[#9C5A2E] text-white px-4 py-1.5 rounded-xl font-semibold hover:bg-[#7A3F1F] cursor-pointer disabled:opacity-60">Guardar</button>
                          </div>
                        </div>
                        <ApiErrorBanner error={editError} />
                      </form>
                    ) : (
                      <div key={v.id} className="p-3 flex items-center gap-3 hover:bg-[#FBF8F2]/60 min-w-[620px]">
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-[#231E1A] block truncate">
                            {v.name === STANDARD ? "Estándar" : v.name}
                            {!v.active && <span className="ml-2 text-[10px] font-medium text-[#A89C8C]">(inactivo)</span>}
                          </span>
                          <span className="font-mono text-[10px] text-[#7A6F63] flex items-center gap-1 mt-0.5">
                            <ScanBarcode className="w-3 h-3 text-[#A89C8C]" />
                            {v.sku ?? "—"}
                          </span>
                        </div>
                        <div className="w-20 text-right">
                          <span className="font-bold text-[#231E1A] block">{money(v.price)}</span>
                          <span className="text-[10px] text-[#A89C8C]">costo {money(v.cost)}</span>
                        </div>
                        <div className="w-16 text-right font-bold text-[#231E1A]">{v.onHand} u.</div>
                        <div className="w-24 text-center"><StatusBadge status={v.status} /></div>
                        <div className="flex items-center gap-0.5">
                          <button type="button" onClick={() => startEdit(v)} disabled={busy} title="Editar variante"
                            className="text-[#A89C8C] hover:text-[#9C5A2E] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 cursor-pointer">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setHistoryFor(v)} title="Historial de costo"
                            className="text-[#A89C8C] hover:text-[#231E1A] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 cursor-pointer">
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <Link href={restockHref(v.id)} title="Reponer stock de esta variante"
                            className="text-[#A89C8C] hover:text-[#3E8E5A] p-1.5 rounded-lg hover:bg-[#EADBC6]/40">
                            <PackagePlus className="w-3.5 h-3.5" />
                          </Link>
                          <button type="button" onClick={() => { setDeleteError(null); setDeleting(v); }} disabled={busy}
                            title="Eliminar variante"
                            className="text-[#A89C8C] hover:text-[#C0492F] p-1.5 rounded-lg hover:bg-[#F7E3DD]/40 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ),
                  )}
                </div>

                <form onSubmit={addVariant} className="bg-white p-3.5 rounded-xl border border-[#E7DFD2] flex flex-col gap-2.5 shadow-2xs">
                  <span className="text-xs font-semibold text-[#231E1A] flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#9C5A2E]" />
                    Sumar modelo o variante
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <input required maxLength={80} placeholder="Nombre (ej. Negro)" value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} />
                    <div className="relative">
                      <input maxLength={40} placeholder="SKU (opcional)" value={draft.sku}
                        onChange={(e) => setDraft({ ...draft, sku: e.target.value })} className={`${inputCls} font-mono pr-8`} />
                      <button type="button" onClick={() => setScanning("draft")} title="Escanear código"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[#7A6F63] hover:text-[#9C5A2E] cursor-pointer">
                        <ScanBarcode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input required type="number" min="0" step="0.01" placeholder="Precio" value={draft.price}
                      onChange={(e) => setDraft({ ...draft, price: e.target.value })} className={inputCls} />
                    <input required type="number" min="0" step="0.01" placeholder="Costo" value={draft.cost}
                      onChange={(e) => setDraft({ ...draft, cost: e.target.value })} className={inputCls} />
                    <input type="number" min="0" step="1" placeholder="Stock inicial" value={draft.initialStock}
                      onChange={(e) => setDraft({ ...draft, initialStock: e.target.value })} className={inputCls} />
                  </div>
                  <ApiErrorBanner error={addError} />
                  <div className="flex justify-end">
                    <button type="submit" disabled={busy}
                      className="bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer disabled:opacity-60">
                      + Sumar variante
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          <div className="flex items-center justify-end pt-3 border-t border-[#F7F3EC]">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] hover:text-[#231E1A] transition-colors cursor-pointer">
              Cerrar
            </button>
          </div>
        </div>
      </Modal>

      {scanning && (
        <BarcodeScanner
          onClose={() => setScanning(null)}
          onDetected={(code) =>
            scanning === "edit"
              ? setEditing((cur) => (cur ? { ...cur, sku: code } : cur))
              : setDraft((cur) => ({ ...cur, sku: code }))
          }
        />
      )}

      <ConfirmDeleteModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        isLoading={busy}
        title="¿Eliminar variante?"
        itemName={deleting?.name}
      />
    </>
  );
}
