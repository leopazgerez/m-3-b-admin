"use client";

import Link from "next/link";
import { CheckCircle2, Plus, Printer } from "lucide-react";
import { getAssetPath } from "@/lib/assets";
import { money } from "@/lib/format";
import { round2 } from "@/lib/saleEstimate";
import { formatInstant } from "@/lib/dateUtils";
import { paymentStatusLabel, saleTypeLabel } from "@/lib/labels";
import type { Sale } from "@/lib/apiTypes";

/** The registered sale, with the server's figures. */
export default function ConfirmationView({
  sale, estimated, labels, onNew,
}: {
  sale: Sale;
  estimated: number;
  labels: Map<number, string>;
  onNew: () => void;
}) {
  const diff = round2(sale.totalDue - estimated);
  const row = "flex justify-between text-[#7A6F63]";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-[#231E1A] rounded-2xl border border-[#E7DFD2] w-full max-w-md max-h-[95dvh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="bg-[#3E8E5A] text-white p-6 text-center flex flex-col items-center gap-2">
          <CheckCircle2 className="w-12 h-12 stroke-[2.2]" />
          <h3 className="font-heading font-bold text-lg">Venta #{sale.id} registrada</h3>
          <p className="text-xs text-white/90">Stock descontado y pagos registrados.</p>
        </div>

        <div className="p-6 flex flex-col gap-3 text-xs font-mono bg-[#FBF8F2] border-b border-[#E7DFD2]">
          <div className="text-center pb-3 border-b border-dashed border-[#D5C9B7] flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized images */}
            <img src={getAssetPath("/favicon.png")} alt="Mates Triple B"
              className="w-10 h-10 rounded-full object-contain mb-1.5 border border-[#D5C9B7] bg-white p-0.5" />
            <p className="font-bold text-sm font-sans text-[#231E1A]">MATES TRIPLE B</p>
            <p className="text-[10px] text-[#A89C8C] mt-1">{formatInstant(sale.soldAt)}</p>
          </div>

          <div className={row}><span>Cliente:</span><span className="font-bold text-[#231E1A]">{sale.customerName ?? sale.notes ?? "Consumidor final"}</span></div>
          <div className={row}><span>Tipo:</span><span>{saleTypeLabel[sale.type]}</span></div>

          <div className="border-t border-dashed border-[#D5C9B7] pt-2 flex flex-col gap-1.5">
            {sale.lines.map((l) => (
              <div key={l.id} className="flex justify-between gap-2">
                <span className="truncate">{l.quantity}x {labels.get(l.variantId) ?? `Variante #${l.variantId}`}</span>
                <span className="font-semibold text-[#231E1A]">{money(l.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-[#D5C9B7] pt-2 flex flex-col gap-1.5">
            <div className={row}><span>Subtotal:</span><span>{money(sale.grossTotal)}</span></div>
            {sale.adjustmentTotal !== 0 && (
              <div className={row}><span>Ajustes (descuento/recargo):</span><span>{money(sale.adjustmentTotal)}</span></div>
            )}
            <div className="flex justify-between text-sm font-bold font-sans text-[#231E1A] pt-2 border-t-2 border-[#231E1A]">
              <span>TOTAL:</span><span>{money(sale.totalDue)}</span>
            </div>
            <div className={row}><span>Pagado:</span><span>{money(sale.totalPaid)}</span></div>
            <div className={row}><span>Saldo pendiente:</span><span className={sale.outstanding > 0 ? "text-[#C0492F] font-bold" : ""}>{money(sale.outstanding)}</span></div>
            <div className={row}><span>Estado de pago:</span><span className="font-semibold text-[#231E1A]">{paymentStatusLabel[sale.paymentStatus]}</span></div>
            {diff !== 0 && (
              <div className="text-[#D98A2B] font-semibold pt-1">Diferencia con el estimado: {money(diff)}</div>
            )}
          </div>
        </div>

        <div className="p-4 bg-white flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => window.print()}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E7DFD2] text-xs font-semibold text-[#7A6F63] hover:bg-[#FBF8F2] cursor-pointer">
              <Printer className="w-4 h-4" />
              <span>Imprimir ticket</span>
            </button>
            <button type="button" onClick={onNew}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white text-xs font-semibold shadow-xs cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Nueva venta</span>
            </button>
          </div>
          <Link href="/ventas" className="text-center text-xs text-[#A89C8C] hover:text-[#231E1A] py-1">
            Volver al listado de ventas
          </Link>
        </div>
      </div>
    </div>
  );
}
