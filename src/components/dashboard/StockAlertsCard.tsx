"use client";

import { Package, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ApiErrorBanner } from "../ui";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/useApi";
import { variantLabel } from "@/lib/format";
import type { Alerts } from "@/lib/apiTypes";

export default function StockAlertsCard() {
  const { data, loading, error, reload } = useApiResource(
    () => api.getOne<Alerts>("/reports/alerts", { days: 7 }),
    [],
  );
  const stock = data?.stock ?? [];
  const alerts = stock.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col w-full lg:w-[380px] min-w-0 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F7F3EC]">
        <h3 className="font-heading font-bold text-base text-[#231E1A]">
          Alertas de stock
        </h3>
        {data && (
          <Link
            href="/stock"
            className="bg-[#F7E3DD] text-[#C0492F] text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 hover:bg-[#F7E3DD]/80 transition-colors"
          >
            {stock.length} críticos
          </Link>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-[#F7F3EC]">
        {error && (
          <div className="p-4">
            <ApiErrorBanner error={error} onRetry={reload} />
          </div>
        )}
        {!loading && !error && alerts.length === 0 && (
          <div className="p-6 text-center text-xs text-[#7A6F63]">
            ¡Todo el inventario cuenta con stock óptimo!
          </div>
        )}
        {alerts.map((item) => (
          <div
            key={item.variantId}
            className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#FBF8F2]/60 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  item.status === "OUT" ? "bg-[#F7E3DD] text-[#C0492F]" : "bg-[#FBEFD9] text-[#D98A2B]"
                }`}
              >
                <Package className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-[#231E1A] leading-tight truncate">
                  {variantLabel({ productName: item.product, variantName: item.variantName })}
                </span>
                <span className="text-[11px] text-[#A89C8C] truncate">
                  {item.sku ? `${item.sku} · ` : ""}
                  {item.status === "OUT" ? "Sin unidades" : `${item.onHand} u. restantes`}
                </span>
              </div>
            </div>

            <Link
              href={`/stock?productId=${item.productId}&variantId=${item.variantId}`}
              className="text-[11px] font-semibold text-[#9C5A2E] hover:underline shrink-0 whitespace-nowrap"
            >
              Reponer
            </Link>
          </div>
        ))}
      </div>

      <div className="p-3 bg-[#FBF8F2] border-t border-[#F7F3EC] text-center">
        <Link
          href="/stock"
          className="text-xs font-semibold text-[#9C5A2E] hover:underline inline-flex items-center gap-1.5"
        >
          <span>Ver panel completo de stock</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
