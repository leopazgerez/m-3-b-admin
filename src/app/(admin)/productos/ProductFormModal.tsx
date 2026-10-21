"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, Plus, ScanBarcode, Trash2, PackagePlus } from "lucide-react";
import { ApiErrorBanner, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import type {
  CreateProductRequest, Product, ProductCategory, Supplier, UpdateProductCommand, UpdateVariantCommand,
} from "@/lib/apiTypes";
import BarcodeScanner from "./BarcodeScanner";

const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white";
const label = "font-medium text-[#231E1A] block mb-1";

interface Draft { name: string; sku: string; price: string; cost: string; initialStock: string }
const emptyDraft: Draft = { name: "", sku: "", price: "", cost: "", initialStock: "" };

/** Create (simple or with variants) or edit a product. A simple product's price/cost/SKU live in its only variant. */
export default function ProductFormModal({ product, categories, suppliers, onClose, onSaved }: {
  product: Product | null;
  categories: ProductCategory[];
  suppliers: Supplier[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const simpleVariant = product && !product.hasVariants ? product.variants[0] : undefined;
  const [name, setName] = useState(product?.name ?? "");
  const [subtitle, setSubtitle] = useState(product?.subtitle ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ? String(product.categoryId) : "");
  const [supplierId, setSupplierId] = useState(product?.defaultSupplierId ? String(product.defaultSupplierId) : "");
  const [minStock, setMinStock] = useState(product ? String(product.minStock) : "10");
  const [active, setActive] = useState(product?.active ?? true);
  const [hasVariants, setHasVariants] = useState(false); // create only
  const [simple, setSimple] = useState<Draft>({
    ...emptyDraft,
    sku: simpleVariant?.sku ?? "",
    price: simpleVariant ? String(simpleVariant.price) : "",
    cost: simpleVariant ? String(simpleVariant.cost) : "",
  });
  const [drafts, setDrafts] = useState<Draft[]>([{ ...emptyDraft }]);
  const [scanning, setScanning] = useState<"simple" | number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const setDraftAt = (i: number, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const toVariantDraft = (d: Draft) => ({
    ...(d.name.trim() ? { name: d.name.trim() } : {}),
    ...(d.sku.trim() ? { sku: d.sku.trim() } : {}),
    price: Number(d.price),
    cost: Number(d.cost),
    ...(d.initialStock ? { initialStock: Number(d.initialStock) } : {}),
  });

  const create = () => {
    const body: CreateProductRequest = { name: name.trim(), minStock: Number(minStock) };
    if (subtitle.trim()) body.subtitle = subtitle.trim();
    if (categoryId) body.categoryId = Number(categoryId);
    if (supplierId) body.defaultSupplierId = Number(supplierId);
    // Either variants or the top-level sku/price/cost/initialStock, never both.
    if (hasVariants) body.variants = drafts.map(toVariantDraft);
    else Object.assign(body, toVariantDraft({ ...simple, name: "" }));
    return api.post("/products", body);
  };

  const update = async (p: Product) => {
    // PATCH: only changed keys; subtitle "" clears it, sku "" clears it.
    const body: UpdateProductCommand = {};
    if (name.trim() !== p.name) body.name = name.trim();
    if (subtitle.trim() !== (p.subtitle ?? "")) body.subtitle = subtitle.trim();
    if (categoryId && Number(categoryId) !== p.categoryId) body.categoryId = Number(categoryId);
    if (supplierId && Number(supplierId) !== p.defaultSupplierId) body.defaultSupplierId = Number(supplierId);
    if (Number(minStock) !== p.minStock) body.minStock = Number(minStock);
    if (active !== p.active) body.active = active;

    const vBody: UpdateVariantCommand = {};
    if (simpleVariant) {
      if (simple.sku.trim() !== (simpleVariant.sku ?? "")) vBody.sku = simple.sku.trim();
      if (Number(simple.price) !== simpleVariant.price) vBody.price = Number(simple.price);
      if (Number(simple.cost) !== simpleVariant.cost) vBody.cost = Number(simple.cost);
    }
    if (Object.keys(body).length > 0) await api.patch(`/products/${p.id}`, body);
    if (simpleVariant && Object.keys(vBody).length > 0) await api.patch(`/variants/${simpleVariant.id}`, vBody);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await (product ? update(product) : create());
      onSaved();
      onClose();
    } catch (err) {
      setError(err);
      if (product) onSaved(); // the product PATCH may have succeeded before the variant PATCH failed
    } finally {
      setBusy(false);
    }
  };

  // Category and supplier can be changed but not cleared once set.
  const missingSupplier =
    product?.defaultSupplierId && !suppliers.some((s) => s.id === product.defaultSupplierId) ? product : null;

  const skuInput = (value: string, onChange: (v: string) => void, target: "simple" | number) => (
    <div className="relative flex items-center">
      <input type="text" maxLength={40} placeholder="Código o código de barras (opcional)" value={value}
        onChange={(e) => onChange(e.target.value)} className={`${inputCls} pr-10 font-mono`} />
      <button type="button" onClick={() => setScanning(target)} title="Escanear código de barras con la cámara"
        className="absolute right-1.5 p-1.5 text-[#7A6F63] hover:text-[#9C5A2E] hover:bg-[#EADBC6]/40 rounded-lg transition-colors cursor-pointer">
        <ScanBarcode className="w-4 h-4" />
      </button>
    </div>
  );

  const moneyInput = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <input type="number" required min="0" step="0.01" placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)} className={inputCls} />
  );

  return (
    <>
      <Modal isOpen onClose={onClose} title={product ? "Modificar producto" : "Crear nuevo producto"} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div>
            <label className={label}>Nombre del producto <span className="text-[#C0492F]">*</span></label>
            <input type="text" required maxLength={120} placeholder="Ej. Mate Camionero Alpaca" value={name}
              onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={label}>Descripción o detalles</label>
            <input type="text" maxLength={120} placeholder="Ej. Cuero vaqueta con virola lisa" value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)} className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={label}>Categoría</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                {!product?.categoryId && <option value="">Sin categoría</option>}
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Proveedor habitual</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls}>
                {!product?.defaultSupplierId && <option value="">Sin proveedor</option>}
                {missingSupplier && (
                  <option value={missingSupplier.defaultSupplierId!}>{missingSupplier.defaultSupplierName} (inactivo)</option>
                )}
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Stock mínimo de alerta <span className="text-[#C0492F]">*</span></label>
              <input type="number" min="0" step="1" required value={minStock}
                onChange={(e) => setMinStock(e.target.value)} className={inputCls} />
            </div>
          </div>

          {product && (
            <label className="flex items-center gap-2 font-semibold text-[#231E1A] cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Producto activo
            </label>
          )}

          {!product && (
            <div className="bg-[#FAF7F2] border border-[#E7DFD2] rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EADBC6] text-[#9C5A2E] flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-[#231E1A] block">Tiene variantes</span>
                  <span className="text-[10px] text-[#7A6F63] block">
                    Cada modelo (ej. Negro, Marrón) con su propio código, precio, costo y stock
                  </span>
                </div>
              </div>
              <button type="button" role="switch" aria-checked={hasVariants} onClick={() => setHasVariants(!hasVariants)}
                title="Activar o desactivar variantes"
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  hasVariants ? "bg-[#9C5A2E]" : "bg-[#E7DFD2]"
                }`}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                  hasVariants ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
          )}

          {(simpleVariant || (!product && !hasVariants)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={label}>Código / SKU</label>
                {skuInput(simple.sku, (sku) => setSimple({ ...simple, sku }), "simple")}
              </div>
              <div>
                <label className={label}>Precio de venta ($) <span className="text-[#C0492F]">*</span></label>
                {moneyInput(simple.price, (price) => setSimple({ ...simple, price }), "Ej. 19500")}
              </div>
              <div>
                <label className={label}>Costo ($) <span className="text-[#C0492F]">*</span></label>
                {moneyInput(simple.cost, (cost) => setSimple({ ...simple, cost }), "Ej. 12500")}
              </div>
              {!product && (
                <div>
                  <label className={label}>Stock inicial (opcional)</label>
                  <input type="number" min="0" step="1" placeholder="Ej. 20" value={simple.initialStock}
                    onChange={(e) => setSimple({ ...simple, initialStock: e.target.value })} className={inputCls} />
                  <span className="text-[10px] text-[#A89C8C] mt-1 block">
                    Se registrará como &quot;Ingreso inicial&quot; en el historial de stock.
                  </span>
                </div>
              )}
            </div>
          )}

          {!product && hasVariants && (
            <div className="flex flex-col gap-2.5">
              {drafts.map((d, i) => (
                <div key={i} className="bg-white p-3 rounded-xl border border-[#E7DFD2] grid grid-cols-2 sm:grid-cols-[1fr_1.3fr_0.8fr_0.8fr_0.7fr_auto] gap-2 items-end">
                  <div>
                    <label className="text-[11px] font-medium text-[#7A6F63] block mb-1">Modelo *</label>
                    <input required maxLength={80} placeholder="Ej. Negro" value={d.name}
                      onChange={(e) => setDraftAt(i, { name: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#7A6F63] block mb-1">Código</label>
                    {skuInput(d.sku, (sku) => setDraftAt(i, { sku }), i)}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#7A6F63] block mb-1">Precio *</label>
                    {moneyInput(d.price, (price) => setDraftAt(i, { price }), "Precio")}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#7A6F63] block mb-1">Costo *</label>
                    {moneyInput(d.cost, (cost) => setDraftAt(i, { cost }), "Costo")}
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#7A6F63] block mb-1">Stock inicial</label>
                    <input type="number" min="0" step="1" placeholder="0" value={d.initialStock}
                      onChange={(e) => setDraftAt(i, { initialStock: e.target.value })} className={inputCls} />
                  </div>
                  <button type="button" disabled={drafts.length === 1} title="Quitar este modelo"
                    onClick={() => setDrafts(drafts.filter((_, j) => j !== i))}
                    className="text-[#A89C8C] hover:text-[#C0492F] p-2 rounded-lg hover:bg-[#F7E3DD]/40 cursor-pointer disabled:opacity-40">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setDrafts([...drafts, { ...emptyDraft }])}
                className="self-start flex items-center gap-1.5 text-xs font-semibold text-[#9C5A2E] hover:underline cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Sumar otro modelo
              </button>
            </div>
          )}

          {product?.hasVariants && (
            <p className="text-[11px] text-[#7A6F63] bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl p-3">
              El código, precio y costo de cada modelo se editan desde la ficha del producto.
            </p>
          )}

          {product && (
            <Link href={`/stock?productId=${product.id}`} onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9C5A2E] hover:underline">
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Ir a reponer stock de este producto →</span>
            </Link>
          )}

          <ApiErrorBanner error={error} />

          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3.5 bg-white/95 backdrop-blur-xs border-t border-[#F7F3EC] flex items-center justify-end gap-3 z-10">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer text-xs">
              Cancelar
            </button>
            <button type="submit" disabled={busy}
              className="bg-[#9C5A2E] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer text-xs disabled:opacity-60">
              {product ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>
      </Modal>

      {scanning !== null && (
        <BarcodeScanner
          onClose={() => setScanning(null)}
          onDetected={(sku) => (scanning === "simple" ? setSimple((s) => ({ ...s, sku })) : setDraftAt(scanning, { sku }))}
        />
      )}
    </>
  );
}
