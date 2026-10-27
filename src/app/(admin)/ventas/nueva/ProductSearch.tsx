"use client";

import { useEffect, useState, type RefObject } from "react";
import BarcodeScanner from "@/components/ui/BarcodeScanner";
import { ApiErrorBanner, Modal } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApi";
import { money, variantLabel } from "@/lib/format";
import type { Product, Variant, VariantLookup } from "@/lib/apiTypes";
import { ScanBarcode, Plus, CheckCircle2, Camera, X, AlertCircle, Package } from "lucide-react";

/** Scanner input + name search + model chooser; onAdd gets each picked active variant. */
export default function ProductSearch({
  onAdd, inputRef,
}: {
  onAdd: (p: Product, v: Variant) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [chooser, setChooser] = useState<Product | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMsg, setScanMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Product search (debounced) for the suggestions under the scanner input.
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);
  const suggestions = useApiResource(
    () =>
      search
        ? api.getPage<Product>("/products", { length: 8, search, filters: [{ field: "active", operator: "EQUALS", value: true }] })
          .then((p) => p.items)
        : Promise.resolve([] as Product[]),
    [search],
  );

  const addVariant = (p: Product, v: Variant) => {
    onAdd(p, v);
    setScanMsg({ ok: true, text: `+1 ${variantLabel({ productName: p.name, variantName: v.name })}` });
    setSearchTerm("");
    setChooser(null);
    inputRef.current?.focus();
  };

  const pickProduct = (p: Product) => {
    const live = p.variants.filter((v) => v.active);
    if (live.length === 1) addVariant(p, live[0]);
    else if (live.length === 0) setScanMsg({ ok: false, text: `${p.name} no tiene variantes activas` });
    else setChooser(p);
  };

  /** Exact SKU lookup, for the pistol scanner (types the code + Enter) and the camera. */
  const lookup = async (code: string) => {
    if (!code) return;
    setScanMsg(null);
    try {
      const r = await api.getOne<VariantLookup>("/variants/lookup", { code });
      const v = r.product.variants.find((x) => x.id === r.variantId);
      if (!v || !v.active || !r.product.active) setScanMsg({ ok: false, text: `"${code}": producto o variante inactivo` });
      else addVariant(r.product, v);
    } catch (e) {
      const text =
        e instanceof ApiError && e.status === 404 ? `Código no encontrado: "${code}"`
          : e instanceof ApiError ? `Error ${e.status || ""}: ${e.message}` : String(e);
      setScanMsg({ ok: false, text });
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border-2 border-[#9C5A2E]/30 p-4 shadow-xs relative">
        <form onSubmit={(e) => { e.preventDefault(); lookup(searchTerm.trim()); }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 flex items-center">
            <ScanBarcode className="w-5 h-5 text-[#9C5A2E] absolute left-3.5 pointer-events-none" />
            <input ref={inputRef} type="text" maxLength={100} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Escanear código (Enter) o buscar producto por nombre..."
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl pl-11 pr-10 py-3 text-xs sm:text-sm text-[#231E1A] font-medium outline-none focus:border-[#9C5A2E] focus:bg-white shadow-inner" />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm("")} className="absolute right-3 text-[#A89C8C] hover:text-[#231E1A]">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setScannerOpen(true)} title="Escanear con cámara"
              className="flex-1 sm:flex-none bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] hover:text-[#9C5A2E] hover:border-[#9C5A2E] px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shrink-0">
              <Camera className="w-4 h-4" />
              <span>Cámara</span>
            </button>
            <button type="submit"
              className="flex-1 sm:flex-none bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-5 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0">
              <Plus className="w-4 h-4" />
              <span>Agregar código</span>
            </button>
          </div>
        </form>

        {searchTerm.trim() && (suggestions.data?.length || suggestions.error) ? (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-[#E7DFD2] shadow-xl z-30 overflow-hidden divide-y divide-[#F7F3EC]">
            <ApiErrorBanner error={suggestions.error} onRetry={suggestions.reload} />
            {suggestions.data?.map((p) => (
              <button key={p.id} type="button" onClick={() => pickProduct(p)}
                className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[#FBF8F2] cursor-pointer transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#EADBC6] text-[#9C5A2E] flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#231E1A] truncate">
                      {p.name}
                      {p.hasVariants && <span className="ml-2 text-[10px] bg-[#EADBC6]/60 text-[#9C5A2E] font-bold px-1.5 py-0.5 rounded">{p.variants.filter((v) => v.active).length} modelos</span>}
                    </span>
                    <span className="text-[10px] text-[#A89C8C]">{p.categoryName ?? "Sin categoría"} • Stock: {p.onHand}</span>
                  </div>
                </div>
                {!p.hasVariants && p.variants[0] && <span className="text-xs font-bold text-[#231E1A]">{money(p.variants[0].price)}</span>}
              </button>
            ))}
          </div>
        ) : null}

        {scanMsg && (
          <div className={`mt-2 text-xs font-semibold flex items-center gap-1.5 ${scanMsg.ok ? "text-[#3E8E5A]" : "text-[#C0492F]"}`}>
            {scanMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{scanMsg.text}</span>
          </div>
        )}
      </div>

      {scannerOpen && <BarcodeScanner onDetected={(code) => lookup(code)} onClose={() => setScannerOpen(false)} />}

      {chooser && (
        <Modal isOpen onClose={() => setChooser(null)} title={`Elegí el modelo · ${chooser.name}`}>
          <div className="divide-y divide-[#F7F3EC] border border-[#E7DFD2] rounded-xl overflow-hidden">
            {chooser.variants.filter((v) => v.active).map((v) => (
              <div key={v.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-[#231E1A]">{v.name}</span>
                  <span className="text-[11px] text-[#A89C8C]">
                    {v.sku && <span className="font-mono">SKU: {v.sku} • </span>}
                    <span className={v.onHand <= 0 ? "text-[#C0492F]" : ""}>Stock: {v.onHand}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-[#231E1A]">{money(v.price)}</span>
                  <button type="button" onClick={() => addVariant(chooser, v)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Sumar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
