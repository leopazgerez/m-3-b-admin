"use client";

import Link from "next/link";
import { ApiErrorBanner, Badge } from "../ui";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/useApi";
import { buyerName, money, paymentStatusVariant } from "@/lib/format";
import { formatInstant } from "@/lib/dateUtils";
import { paymentStatusLabel } from "@/lib/labels";
import type { Sale } from "@/lib/apiTypes";

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

export default function RecentSalesTable() {
  const { data, loading, error, reload } = useApiResource(
    () => api.getPage<Sale>("/sales", { length: 5, sortBy: "soldAt", sortDir: "desc" }),
    [],
  );
  const sales = data?.items ?? [];

  return (
    <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col flex-1 w-full min-w-0 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F7F3EC]">
        <h3 className="font-heading font-bold text-base text-[#231E1A]">
          Ventas recientes
        </h3>
        <Link
          href="/ventas"
          className="text-xs font-semibold text-[#9C5A2E] hover:text-[#7A3F1F] transition-colors"
        >
          Ver todas
        </Link>
      </div>

      {error && (
        <div className="p-4">
          <ApiErrorBanner error={error} onRetry={reload} />
        </div>
      )}

      {/* Table Content with Mobile Scroll */}
      <div className="overflow-x-auto w-full">
        <div className="min-w-[620px]">
          {/* Table Head */}
          <div className="bg-[#FBF8F2] px-5 py-2.5 flex items-center gap-3 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
            <div className="flex-1 min-w-[140px]">CLIENTE</div>
            <div className="w-32 shrink-0">FECHA</div>
            <div className="flex-1 min-w-[110px]">MÉTODO</div>
            <div className="w-24 shrink-0 text-right">MONTO</div>
            <div className="w-28 shrink-0 pl-4">ESTADO</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#F7F3EC]">
            {!loading && !error && sales.length === 0 && (
              <div className="p-6 text-center text-xs text-[#7A6F63]">Todavía no hay ventas registradas.</div>
            )}
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="px-5 py-3 flex items-center gap-3 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
              >
                {/* Client */}
                <div className="flex-1 min-w-[140px] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center font-bold text-xs shrink-0">
                    {initials(buyerName(sale))}
                  </div>
                  <span className="font-medium text-[#231E1A] truncate">
                    {buyerName(sale)}
                  </span>
                </div>

                {/* Date */}
                <div className="w-32 shrink-0 text-[#7A6F63] whitespace-nowrap">{formatInstant(sale.soldAt)}</div>

                {/* Method */}
                <div className="flex-1 min-w-[110px] text-[#7A6F63] truncate">
                  {sale.payments.map((p) => p.paymentMethodName).join(", ") || "—"}
                </div>

                {/* Amount */}
                <div className="w-24 shrink-0 text-right font-bold text-[#231E1A] whitespace-nowrap">
                  {money(sale.totalDue)}
                </div>

                {/* Status */}
                <div className="w-28 shrink-0 pl-4">
                  <Badge variant={paymentStatusVariant[sale.paymentStatus]}>
                    {paymentStatusLabel[sale.paymentStatus]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
