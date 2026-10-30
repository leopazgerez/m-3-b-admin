"use client";

import Link from "next/link";
import { ArrowLeft, Eye, History } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, Badge, Pager } from "@/components/ui";
import { usePagedList } from "@/lib/useApi";
import { cashSessionStatusVariant, money } from "@/lib/format";
import { formatInstant } from "@/lib/dateUtils";
import { cashSessionStatusLabel } from "@/lib/labels";
import type { CashSessionSummary } from "@/lib/apiTypes";
import { diffCls, diffText, opt } from "@/components/cash/ui";

/** Every cash session, newest first (the API's default sort: openedAt desc). */
export default function CajaHistorialPage() {
  const list = usePagedList<CashSessionSummary>("/cash-sessions", {});

  return (
    <>
      <Topbar title="Historial de caja" subtitle="Jornadas anteriores y sus diferencias" />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full min-w-0">
        <Link href="/caja" className="flex items-center gap-1.5 text-xs font-semibold text-[#9C5A2E] w-fit">
          <ArrowLeft className="w-4 h-4" /> Volver a la caja
        </Link>

        <ApiErrorBanner error={list.error} onRetry={list.reload} />

        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0 text-xs">
          <div className="hidden md:flex bg-[#FBF8F2] px-6 py-3.5 items-center gap-4 text-[11px] text-[#A89C8C] font-semibold tracking-wide border-b border-[#E7DFD2]">
            <div className="w-36 shrink-0">APERTURA</div>
            <div className="w-36 shrink-0">CIERRE</div>
            <div className="w-36 shrink-0">ESTADO</div>
            <div className="flex-1 text-right">ESPERADO</div>
            <div className="flex-1 text-right">CONTADO</div>
            <div className="flex-1 text-right">DIFERENCIA</div>
            <div className="w-10 shrink-0" />
          </div>
          <div className="divide-y divide-[#F7F3EC]">
            {!list.loading && !list.error && list.items.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#F5EAD6] flex items-center justify-center mx-auto mb-3 text-[#9C5A2E]">
                  <History className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[#231E1A]">Todavía no hay jornadas</p>
              </div>
            ) : (
              list.items.map((s) => (
                <Link key={s.sessionId} href={`/caja/detalle?id=${s.sessionId}`}
                  className="px-4 md:px-6 py-3.5 grid grid-cols-2 md:flex md:items-center gap-x-4 gap-y-1.5 hover:bg-[#FBF8F2]/60 transition-colors">
                  <div className="md:w-36 shrink-0 font-semibold text-[#231E1A]">{formatInstant(s.openedAt)}</div>
                  <div className="md:w-36 shrink-0 text-[#7A6F63] text-right md:text-left">
                    {s.closedAt ? formatInstant(s.closedAt) : "—"}
                  </div>
                  <div className="md:w-36 shrink-0 flex items-center gap-1.5 flex-wrap col-span-2">
                    <Badge variant={cashSessionStatusVariant[s.status]}>{cashSessionStatusLabel[s.status]}</Badge>
                    {s.reconciled && <Badge variant="success">Cuadra</Badge>}
                  </div>
                  <div className="md:flex-1 md:text-right"><span className="md:hidden text-[#A89C8C]">Esperado </span>{money(s.totals.expected)}</div>
                  <div className="md:flex-1 text-right"><span className="md:hidden text-[#A89C8C]">Contado </span>{opt(s.totals.counted)}</div>
                  <div className={`md:flex-1 md:text-right col-span-2 ${diffCls(s.totals.difference)}`}>
                    <span className="md:hidden text-[#A89C8C] font-normal">Diferencia </span>{diffText(s.totals.difference)}
                  </div>
                  <div className="hidden md:flex w-10 shrink-0 justify-center text-[#9C5A2E]"><Eye className="w-4 h-4" /></div>
                </Link>
              ))
            )}
          </div>
          <Pager hasPrev={list.hasPrev} hasNext={list.hasNext} onPrev={list.prev} onNext={list.next}
            total={list.total} loading={list.loading} />
        </div>
      </main>
    </>
  );
}
