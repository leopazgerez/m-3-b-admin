"use client";

import { useState } from "react";
import { Calendar, CreditCard, Pencil } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, Pager } from "@/components/ui";
import { AccreditationBadge, AccreditationModal, AccreditationSummary } from "@/components/payments/Accreditation";
import { usePagedList } from "@/lib/useApi";
import { ACCREDITABLE, ACCREDITED, PENDING_ACCREDITATION } from "@/lib/accreditation";
import { money } from "@/lib/format";
import { formatInstant } from "@/lib/dateUtils";
import type { ListQuery } from "@/lib/apiQuery";
import type { Payment } from "@/lib/apiTypes";

const views: { label: string; empty: string; query: Omit<ListQuery, "cursor" | "before"> }[] = [
  { label: "Pendientes", empty: "No hay cobros pendientes de acreditar",
    query: { sortBy: "paidAt", sortDir: "asc", filters: PENDING_ACCREDITATION } },
  { label: "Acreditados", empty: "No hay cobros acreditados", query: { sortBy: "accreditedAt", sortDir: "desc", filters: ACCREDITED } },
  { label: "Todos", empty: "No hay cobros con tarjeta", query: { sortBy: "paidAt", sortDir: "desc", filters: ACCREDITABLE } },
];

/** Card payments of fee-charging methods: pending ones oldest first (to match against the bank), the rest newest first. */
export default function AcreditacionesPage() {
  const [current, setCurrent] = useState(views[0]);
  const [open, setOpen] = useState<Payment | null>(null);
  const list = usePagedList<Payment>("/payments", current.query);

  const tab = (active: boolean) => `px-4 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer ${active
    ? "font-semibold bg-[#9C5A2E] text-white shadow-xs" : "font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2]"}`;
  const th = "text-[11px] text-[#A89C8C] tracking-wide font-semibold";

  return (
    <>
      <Topbar title="Acreditaciones" subtitle="Cobros con tarjeta: cargá lo que acreditó el banco" />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full min-w-0">
        <div className="flex items-center gap-2 bg-white border border-[#E7DFD2] p-1.5 rounded-xl shadow-2xs overflow-x-auto max-w-full w-fit">
          {views.map((v) => (
            <button key={v.label} type="button" onClick={() => setCurrent(v)} className={tab(current === v)}>{v.label}</button>
          ))}
        </div>

        <ApiErrorBanner error={list.error} onRetry={list.reload} />

        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[960px]">
              <div className={`bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 border-b border-[#E7DFD2] ${th}`}>
                <div className="w-36 shrink-0">FECHA DE COBRO</div>
                <div className="flex-1 min-w-[160px]">CLIENTE</div>
                <div className="w-32 shrink-0">MEDIO</div>
                <div className="w-32 shrink-0">CUENTA</div>
                <div className="w-28 shrink-0 text-right">COBRADO</div>
                <div className="w-44 shrink-0 pl-4">ESTADO</div>
                <div className="w-28 shrink-0 text-center">ACCIONES</div>
              </div>
              <div className="divide-y divide-[#F7F3EC]">
                {!list.loading && !list.error && list.items.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EAD6] flex items-center justify-center mx-auto mb-3 text-[#9C5A2E]">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-[#231E1A]">
                      {current.empty}
                    </p>
                  </div>
                ) : (
                  list.items.map((p) => (
                    <div key={p.id} className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors">
                      <div className="w-36 shrink-0 text-[#7A6F63] flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                        <span>{formatInstant(p.paidAt)}</span>
                      </div>
                      <div className={`flex-1 min-w-[160px] truncate text-sm ${p.customerName ? "font-semibold text-[#231E1A]" : "text-[#7A6F63]"}`}>
                        {p.customerName ?? "Venta sin cliente"}
                      </div>
                      <div className="w-32 shrink-0 text-[#7A6F63] truncate">{p.paymentMethodName}</div>
                      <div className="w-32 shrink-0 text-[#7A6F63] truncate">{p.accountName ?? "—"}</div>
                      <div className="w-28 shrink-0 text-right font-bold text-[#231E1A] text-sm whitespace-nowrap">{money(p.amount)}</div>
                      <div className="w-44 shrink-0 pl-4 flex flex-col gap-0.5">
                        <div><AccreditationBadge a={p.accreditation} /></div>
                        {p.accreditation === "ACCREDITED" && (
                          <span className="text-[11px] text-[#7A6F63]"><AccreditationSummary p={p} /></span>
                        )}
                      </div>
                      <div className="w-28 shrink-0 flex justify-center">
                        <button type="button" onClick={() => setOpen(p)}
                          className={p.accreditation === "PENDING"
                            ? "bg-[#9C5A2E] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#7A3F1F] cursor-pointer"
                            : "flex items-center gap-1 px-2 py-1.5 rounded-lg text-[#7A6A5A] hover:bg-[#F5EAD6] cursor-pointer"}>
                          {p.accreditation === "PENDING" ? "Acreditar" : <><Pencil className="w-3.5 h-3.5" /> Editar</>}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <Pager hasPrev={list.hasPrev} hasNext={list.hasNext} onPrev={list.prev} onNext={list.next} total={list.total} loading={list.loading} />
        </div>
      </main>

      {open && <AccreditationModal paymentId={open.id} payment={open} onClose={() => setOpen(null)} onDone={list.reload} />}
    </>
  );
}
