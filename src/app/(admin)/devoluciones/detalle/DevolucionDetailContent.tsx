"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, Badge, ConfirmDeleteModal } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApi";
import { money, variantLabel } from "@/lib/format";
import { formatInstant } from "@/lib/dateUtils";
import type { ReturnView, StockRow } from "@/lib/apiTypes";
import { ArrowLeft, Ban } from "lucide-react";

const card = "bg-white rounded-2xl border border-[#E7DFD2] p-5 shadow-xs flex flex-col gap-3 text-xs text-[#231E1A]";
const title = "font-heading font-bold text-sm text-[#231E1A]";

export default function DevolucionDetailContent() {
  const id = Number(useSearchParams().get("id")) || 0;
  const res = useApiResource(() => api.getOne<ReturnView>(`/returns/${id}`), [id]);
  const [voided, setVoided] = useState<ReturnView | null>(null);
  const r = voided ?? res.data;
  const variantIds = r ? [...new Set(r.lines.map((l) => l.variantId))] : [];
  const names = useApiResource(
    () =>
      variantIds.length
        ? api.getAll<StockRow>("/stock", { filters: [{ field: "variantId", operator: "IN", value: variantIds }] })
        : Promise.resolve([] as StockRow[]),
    [r?.id],
  );
  const lineName = (variantId: number) => {
    const s = names.data?.find((x) => x.variantId === variantId);
    return s ? variantLabel(s) : `Variante #${variantId}`;
  };

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voidError, setVoidError] = useState<unknown>(null);

  const handleVoid = async () => {
    if (busy || !r) return;
    setBusy(true);
    setVoidError(null);
    try {
      setVoided(await api.post<ReturnView>(`/returns/${r.id}/void`, undefined, { success: `Devolución #${r.id} anulada: se deshizo el reintegro, el cambio y el stock.` }));
      setConfirming(false);
    } catch (e) {
      setVoidError(e);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  // 409 "Returned units are no longer in stock" says which variant is short
  const stockShort = voidError instanceof ApiError
    ? (voidError.details as { variantId?: number; onHand?: number; needed?: number } | undefined) : undefined;

  return (
    <>
      <Topbar title={`Devolución #${id || ""}`} subtitle="Detalle de la devolución o cambio" />
      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-5 max-w-4xl w-full">
        <Link href="/devoluciones"
          className="self-start flex items-center gap-2 text-xs font-semibold text-[#7A6F63] hover:text-[#231E1A] bg-white border border-[#E7DFD2] px-3.5 py-2 rounded-xl transition-all shadow-2xs hover:bg-[#FBF8F2]">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Devoluciones</span>
        </Link>

        <ApiErrorBanner error={res.error} onRetry={res.reload} />
        {!r && !res.error && <div className="p-12 text-center text-xs text-[#A89C8C]">Cargando devolución…</div>}

        {r && (
          <>
            <div className={card}>
              <div className="flex items-center justify-between gap-3">
                <span className={title}>{r.exchangeSaleId ? "Cambio" : "Devolución"} #{r.id}</span>
                {r.voidedAt ? <Badge variant="danger">Anulada</Badge> : <Badge variant="success">Activa</Badge>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E7DFD2]">
                <div><span className="text-[#A89C8C]">Fecha</span><div className="font-semibold">{formatInstant(r.returnedAt)}</div></div>
                <div>
                  <span className="text-[#A89C8C]">Venta original</span>
                  <div><Link href={`/ventas?id=${r.saleId}`} className="font-semibold text-[#9C5A2E] underline">#{r.saleId}</Link></div>
                </div>
                <div>
                  <span className="text-[#A89C8C]">Cliente</span>
                  <div className="font-semibold">
                    {r.customerId
                      ? <Link href={`/clientes/detalle?id=${r.customerId}`} className="text-[#9C5A2E] underline">{r.customerName ?? `#${r.customerId}`}</Link>
                      : "Consumidor final"}
                  </div>
                </div>
                {r.exchangeSaleId && (
                  <div>
                    <span className="text-[#A89C8C]">Venta de cambio</span>
                    <div><Link href={`/ventas?id=${r.exchangeSaleId}`} className="font-semibold text-[#9C5A2E] underline">#{r.exchangeSaleId}</Link></div>
                  </div>
                )}
                <div><span className="text-[#A89C8C]">Valor devuelto</span><div className="font-bold text-sm">{money(r.total)}</div></div>
                <div><span className="text-[#A89C8C]">Saldo a favor restante</span><div className="font-semibold">{money(r.creditLeft)}</div></div>
                <div className="col-span-2 sm:col-span-3"><span className="text-[#A89C8C]">Motivo</span><div>{r.reason}</div></div>
                {r.voidedAt && <div className="col-span-2 sm:col-span-3 text-[#C0492F]">Anulada el {formatInstant(r.voidedAt)}</div>}
              </div>
            </div>

            <div className={card}>
              <span className={title}>Unidades devueltas</span>
              <ApiErrorBanner error={names.error} onRetry={names.reload} />
              <div className="border border-[#E7DFD2] rounded-xl divide-y divide-[#F7F3EC]">
                {r.lines.map((l) => (
                  <div key={l.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{lineName(l.variantId)}</div>
                      <div className="text-[#7A6F63]">{l.quantity} × {money(l.unitValue)}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {l.faulty ? <Badge variant="danger">Fallado</Badge> : <Badge variant="neutral">Vuelve a stock</Badge>}
                      <span className="font-semibold w-24 text-right">{money(l.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={card}>
              <span className={title}>A dónde fue el valor</span>
              {r.allocations.length === 0 && !r.refund && r.creditLeft === 0 && (
                <p className="text-[#7A6F63]">{r.voidedAt ? "Anulada: no aplica a ninguna venta." : "Sin aplicaciones."}</p>
              )}
              {r.allocations.map((a, i) => (
                <div key={i} className="flex justify-between">
                  <span>
                    Venta <Link href={`/ventas?id=${a.saleId}`} className="text-[#9C5A2E] font-semibold underline">#{a.saleId}</Link>
                    {a.saleId === r.exchangeSaleId && " (cambio)"}
                    {a.fromCredit && <span className="text-[#7A6F63]"> · con saldo a favor</span>}
                  </span>
                  <span className="font-semibold">{money(a.amount)}</span>
                </div>
              ))}
              {r.refund && (
                <div className="flex justify-between">
                  <span>
                    Reintegro por {r.refund.paymentMethodName} · {formatInstant(r.refund.refundedAt)}
                    {r.refund.voided && <span className="text-[#C0492F]"> · anulado</span>}
                  </span>
                  <span className="font-semibold">{money(r.refund.amount)}</span>
                </div>
              )}
              {r.creditLeft > 0 && (
                <div className="flex justify-between text-[#3E8E5A]">
                  <span>Saldo a favor del cliente (sin usar)</span>
                  <span className="font-semibold">{money(r.creditLeft)}</span>
                </div>
              )}
            </div>

            <ApiErrorBanner error={voidError} />
            {stockShort?.variantId !== undefined && (
              <p className="text-xs text-[#C0492F] -mt-3">
                {lineName(stockShort.variantId)}: hay {stockShort.onHand} en stock y se necesitan {stockShort.needed} para anular.
              </p>
            )}

            {!r.voidedAt && (
              <button type="button" onClick={() => { setVoidError(null); setConfirming(true); }} disabled={busy}
                className="self-start flex items-center gap-2 bg-white border border-[#C0492F]/40 text-[#C0492F] px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#FBEAE5] cursor-pointer disabled:opacity-60">
                <Ban className="w-4 h-4" />
                <span>Anular devolución</span>
              </button>
            )}
          </>
        )}
      </main>

      <ConfirmDeleteModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleVoid}
        isLoading={busy}
        title="¿Anular devolución?"
        confirmLabel="Anular devolución"
        cancelLabel="Volver"
        description={`Se deshace todo: el reintegro, la venta de cambio${r?.exchangeSaleId ? ` #${r.exchangeSaleId}` : ""} y el stock. Esta acción no se puede deshacer.`}
      />
    </>
  );
}
