"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, Badge } from "@/components/ui";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/useApi";
import { cashSessionStatusVariant } from "@/lib/format";
import { formatInstant } from "@/lib/dateUtils";
import { cashSessionStatusLabel } from "@/lib/labels";
import type { CashSession } from "@/lib/apiTypes";
import { AccountsTable, RowsTable } from "../SessionTables";

/** /caja/detalle?id=N: one session, read only (a closed session never changes). */
export default function SessionDetailContent() {
  const id = useSearchParams().get("id") ?? "";
  const valid = /^\d+$/.test(id);
  const session = useApiResource(
    () => (valid ? api.getOne<CashSession>(`/cash-sessions/${id}`) : Promise.reject(new Error("Jornada inválida"))),
    [id],
  );
  const s = session.data;
  const at = (label: string, v: string | null) => (
    <div>
      <div className="text-[11px] text-[#A89C8C] font-medium">{label}</div>
      <div className="font-semibold text-[#231E1A]">{v ? formatInstant(v) : "—"}</div>
    </div>
  );

  return (
    <>
      <Topbar title={s ? `Jornada #${s.sessionId}` : "Jornada"} subtitle="Detalle de la jornada de caja" />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full min-w-0">
        <Link href="/caja/historial" className="flex items-center gap-1.5 text-xs font-semibold text-[#9C5A2E] w-fit">
          <ArrowLeft className="w-4 h-4" /> Volver al historial
        </Link>

        <ApiErrorBanner error={session.error} onRetry={valid ? session.reload : undefined} />

        {s && (
          <>
            <div className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
              <div>
                <div className="text-[11px] text-[#A89C8C] font-medium">Estado</div>
                <Badge variant={cashSessionStatusVariant[s.status]}>{cashSessionStatusLabel[s.status]}</Badge>
              </div>
              {at("Apertura", s.openedAt)}
              {at("Cierre", s.closedAt)}
              {at("Conteo", s.countedAt)}
              {s.countedAt && (
                <div>
                  <div className="text-[11px] text-[#A89C8C] font-medium">Resultado</div>
                  <Badge variant={s.reconciled ? "success" : "danger"}>{s.reconciled ? "Cuadra" : "Con diferencia"}</Badge>
                </div>
              )}
            </div>
            <AccountsTable s={s} />
            <RowsTable s={s} />
          </>
        )}
      </main>
    </>
  );
}
