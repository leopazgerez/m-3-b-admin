"use client";

import { ApiErrorBanner } from "../ui";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/useApi";
import { money } from "@/lib/format";
import { barRatio, monthLabel } from "@/lib/reports";
import type { MonthlyBalance } from "@/lib/apiTypes";

export default function BalanceChart() {
  const { data, error, reload } = useApiResource(
    () => api.getOne<MonthlyBalance[]>("/reports/monthly-balance", { months: 6 }),
    [],
  );
  const rows = data ?? [];
  const max = Math.max(0, ...rows.flatMap((d) => [d.income, d.expenses]));

  return (
    <div className="bg-white rounded-2xl border border-[#E7DFD2] p-4 sm:p-5 flex flex-col justify-between w-full min-w-0 shadow-xs h-full min-h-[260px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 pb-2 border-b border-[#F7F3EC] sm:border-transparent">
        <div className="flex flex-col">
          <h3 className="font-heading font-bold text-base text-[#231E1A]">Cobrado vs. pagado</h3>
          <span className="text-xs text-[#7A6F63]">Base caja: cobros a clientes y pagos de gastos</span>
        </div>
        <div className="flex items-center gap-4 text-xs shrink-0 self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3E8E5A] shrink-0" />
            <span className="text-[#7A6F63] font-medium">Cobrado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9C5A2E] shrink-0" />
            <span className="text-[#7A6F63] font-medium">Pagado</span>
          </div>
        </div>
      </div>

      {error && <ApiErrorBanner error={error} onRetry={reload} />}
      {!error && !data && <div className="p-6 text-center text-xs text-[#7A6F63]">Cargando…</div>}
      {data && (
        <div className="w-full overflow-x-auto min-w-0 pt-3">
          <div className="min-w-[280px] flex items-end justify-between pt-2 pb-1 border-b border-[#F7F3EC] h-40">
            {rows.map((item) => (
              <div key={item.month} className="flex flex-col items-center gap-2 group flex-1">
                <div className="flex items-end gap-1 sm:gap-1.5 h-32 relative">
                  <div
                    style={{ height: `${Math.round(barRatio(item.income, max) * 100)}%` }}
                    className="w-3.5 sm:w-5 bg-[#3E8E5A] rounded-t-sm hover:brightness-110 transition-all duration-300 cursor-pointer"
                    title={`Cobrado ${monthLabel(item.month)}: ${money(item.income)}`}
                  />
                  <div
                    style={{ height: `${Math.round(barRatio(item.expenses, max) * 100)}%` }}
                    className="w-3.5 sm:w-5 bg-[#9C5A2E] rounded-t-sm hover:brightness-110 transition-all duration-300 cursor-pointer"
                    title={`Pagado ${monthLabel(item.month)}: ${money(item.expenses)}`}
                  />
                </div>
                <span className="text-xs font-medium text-[#7A6F63]">{monthLabel(item.month)}</span>
              </div>
            ))}
          </div>
          {max === 0 && <p className="pt-2 text-center text-xs text-[#7A6F63]">Sin movimientos de caja</p>}
        </div>
      )}
    </div>
  );
}
