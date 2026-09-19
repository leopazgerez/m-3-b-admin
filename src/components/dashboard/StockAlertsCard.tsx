import { stockAlerts } from "@/lib/data";
import { Package } from "lucide-react";
import Link from "next/link";

export default function StockAlertsCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col w-full lg:w-[380px] min-w-0 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F7F3EC]">
        <h3 className="font-heading font-bold text-base text-[#231E1A]">
          Alertas de stock
        </h3>
        <span className="bg-[#F7E3DD] text-[#C0492F] text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
          4 críticos
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-[#F7F3EC]">
        {stockAlerts.map((item) => (
          <div
            key={item.id}
            className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#FBF8F2]/60 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  item.remaining === 0 ? "bg-[#F7E3DD] text-[#C0492F]" : "bg-[#FBEFD9] text-[#D98A2B]"
                }`}
              >
                <Package className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-[#231E1A] leading-tight truncate">
                  {item.name}
                </span>
                <span className="text-[11px] text-[#A89C8C] truncate">
                  {item.sku} ·{" "}
                  {item.remaining === 0
                    ? "Sin unidades"
                    : `${item.remaining} u. restantes`}
                </span>
              </div>
            </div>

            <Link
              href="/productos"
              className="text-[11px] font-semibold text-[#9C5A2E] hover:underline shrink-0 whitespace-nowrap"
            >
              Reponer
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
