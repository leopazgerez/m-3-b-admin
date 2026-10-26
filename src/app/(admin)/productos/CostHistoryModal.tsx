"use client";

import { ApiErrorBanner, Modal, Pager } from "@/components/ui";
import { usePagedList } from "@/lib/useApi";
import { costSourceLabel } from "@/lib/labels";
import { money } from "@/lib/format";
import { formatInstant } from "@/lib/dateUtils";
import type { CostHistoryEntry, Variant } from "@/lib/apiTypes";

export default function CostHistoryModal({ variant, onClose }: { variant: Variant; onClose: () => void }) {
  const { items, total, loading, error, hasNext, hasPrev, next, prev, reload } = usePagedList<CostHistoryEntry>(
    `/variants/${variant.id}/cost-history`,
    { sortBy: "effectiveAt", sortDir: "desc" },
  );

  return (
    <Modal isOpen onClose={onClose} title={`Historial de costo · ${variant.name === "STANDARD" ? "Estándar" : variant.name}`} maxWidth="max-w-xl">
      <div className="flex flex-col gap-4 text-xs">
        <ApiErrorBanner error={error} onRetry={reload} />
        <div className="border border-[#E7DFD2] rounded-xl overflow-hidden bg-white">
          <div className="bg-[#FBF8F2] px-4 py-2.5 flex items-center gap-3 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
            <div className="flex-1">VIGENTE DESDE</div>
            <div className="w-24 text-right">COSTO UNIT.</div>
            <div className="w-20">ORIGEN</div>
            <div className="w-28">REGISTRADO POR</div>
          </div>
          <div className="divide-y divide-[#F7F3EC]">
            {!loading && !error && items.length === 0 ? (
              <div className="p-6 text-center text-[#7A6F63]">Sin cambios de costo registrados.</div>
            ) : (
              items.map((c) => (
                <div key={c.id} className="px-4 py-2.5 flex items-center gap-3 text-[#231E1A]">
                  <div className="flex-1">{formatInstant(c.effectiveAt)}</div>
                  <div className="w-24 text-right font-semibold">{money(c.unitCost)}</div>
                  <div className="w-20 text-[#7A6F63]">{costSourceLabel[c.source]}</div>
                  <div className="w-28 text-[#7A6F63] truncate">{c.createdBy ?? "—"}</div>
                </div>
              ))
            )}
          </div>
          <Pager flush hasPrev={hasPrev} hasNext={hasNext} onPrev={prev} onNext={next} total={total} loading={loading} />
        </div>
      </div>
    </Modal>
  );
}
