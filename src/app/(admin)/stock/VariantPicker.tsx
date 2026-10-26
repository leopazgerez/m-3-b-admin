"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Layers } from "lucide-react";
import { ApiErrorBanner, Pager } from "@/components/ui";
import { usePagedList } from "@/lib/useApi";
import type { Criterion } from "@/lib/apiQuery";
import { variantLabel } from "@/lib/format";
import type { StockRow } from "@/lib/apiTypes";

/**
 * Searchable picker over GET /stock (active variants of active products). productId/variantId preset the list
 * (e.g. coming from Productos) and auto-select a single match once.
 */
export default function VariantPicker({ value, onChange, productId, variantId, disabled }: {
  value: StockRow | null;
  onChange: (row: StockRow | null) => void;
  productId?: number;
  variantId?: number;
  disabled?: boolean;
}) {
  const [scoped, setScoped] = useState(productId !== undefined || variantId !== undefined);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const autoPicked = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const filters: Criterion[] = scoped
    ? [
        ...(productId !== undefined ? [{ field: "productId", operator: "EQUALS" as const, value: productId }] : []),
        ...(variantId !== undefined ? [{ field: "variantId", operator: "EQUALS" as const, value: variantId }] : []),
      ]
    : [];
  const { items, total, loading, error, hasNext, hasPrev, next, prev, reload } = usePagedList<StockRow>("/stock", {
    length: 8,
    search: search || undefined,
    filters,
  });

  useEffect(() => {
    if (!scoped || autoPicked.current || value || loading || items.length !== 1) return;
    autoPicked.current = true;
    onChange(items[0]);
  }, [scoped, value, loading, items, onChange]);

  if (value) {
    return (
      <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E7DFD2] flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-[#231E1A] truncate flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#9C5A2E] shrink-0" />
            {variantLabel(value)}
          </span>
          <span className="text-[11px] text-[#A89C8C] font-mono">
            SKU: {value.sku ?? "—"} · Stock actual: {value.onHand} u.
          </span>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setScoped(false); onChange(null); }}
          className="text-[#9C5A2E] font-semibold hover:underline cursor-pointer disabled:opacity-60 shrink-0"
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="w-4 h-4 text-[#A89C8C] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          maxLength={100}
          placeholder="Buscar producto, modelo o SKU…"
          value={term}
          onChange={(e) => { setTerm(e.target.value); setScoped(false); }}
          className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
        />
      </div>
      <ApiErrorBanner error={error} onRetry={reload} />
      <div className="border border-[#E7DFD2] rounded-xl divide-y divide-[#F7F3EC] max-h-60 overflow-y-auto">
        {!loading && !error && items.length === 0 ? (
          <div className="p-4 text-center text-[#7A6F63]">Sin resultados.</div>
        ) : (
          items.map((r) => (
            <button
              key={r.variantId}
              type="button"
              onClick={() => onChange(r)}
              className="w-full text-left px-3 py-2 hover:bg-[#FBF8F2] flex items-center justify-between gap-3 cursor-pointer"
            >
              <span className="flex flex-col min-w-0">
                <span className="font-medium text-[#231E1A] truncate">{variantLabel(r)}</span>
                <span className="text-[10px] text-[#A89C8C] font-mono">SKU: {r.sku ?? "—"}</span>
              </span>
              <span className="text-[#7A6F63] shrink-0">{r.onHand} u.</span>
            </button>
          ))
        )}
      </div>
      <Pager flush hasPrev={hasPrev} hasNext={hasNext} onPrev={prev} onNext={next} total={total} loading={loading} />
    </div>
  );
}
