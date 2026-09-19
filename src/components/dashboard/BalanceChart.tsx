"use client";

import { MonthlyBalance } from "@/lib/types";

interface BalanceChartProps {
  data: MonthlyBalance[];
}

export default function BalanceChart({ data }: BalanceChartProps) {
  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense])) * 1.15;

  return (
    <div className="bg-white rounded-2xl border border-[#E7DFD2] p-5 flex flex-col justify-between flex-1 shadow-xs h-full min-h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex flex-col">
          <h3 className="font-heading font-bold text-base text-[#231E1A]">
            Balance mensual
          </h3>
          <span className="text-xs text-[#7A6F63]">
            Ingresos vs. egresos · últimos 6 meses
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3E8E5A]" />
            <span className="text-[#7A6F63]">Ingresos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9C5A2E]" />
            <span className="text-[#7A6F63]">Egresos</span>
          </div>
        </div>
      </div>

      {/* Bar Plot */}
      <div className="flex items-end justify-between pt-4 pb-1 border-b border-[#F7F3EC] h-40">
        {data.map((item) => {
          const incomeHeight = Math.round((item.income / maxVal) * 100);
          const expenseHeight = Math.round((item.expense / maxVal) * 100);

          return (
            <div key={item.month} className="flex flex-col items-center gap-2 group">
              <div className="flex items-end gap-1.5 h-32 relative">
                {/* Income Bar */}
                <div
                  style={{ height: `${incomeHeight}%` }}
                  className="w-4 sm:w-5 bg-[#3E8E5A] rounded-t-sm hover:brightness-110 transition-all duration-300 relative cursor-pointer group-hover:shadow-sm"
                  title={`Ingresos ${item.month}: $${item.income.toLocaleString("es-AR")}`}
                />
                {/* Expense Bar */}
                <div
                  style={{ height: `${expenseHeight}%` }}
                  className="w-4 sm:w-5 bg-[#9C5A2E] rounded-t-sm hover:brightness-110 transition-all duration-300 relative cursor-pointer group-hover:shadow-sm"
                  title={`Egresos ${item.month}: $${item.expense.toLocaleString("es-AR")}`}
                />
              </div>
              <span className="text-xs font-medium text-[#7A6F63]">{item.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
