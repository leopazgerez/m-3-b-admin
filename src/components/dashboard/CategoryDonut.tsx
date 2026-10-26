"use client";

import { ApiErrorBanner } from "../ui";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/useApi";
import { money } from "@/lib/format";
import { pctLabel } from "@/lib/reports";
import type { CategorySales } from "@/lib/apiTypes";

const COLORS = ["#9C5A2E", "#C87941", "#3E8E5A", "#D98A2B", "#7A6F63", "#5B7C99"];

export default function CategoryDonut({ params }: { params: { from?: string; to?: string } | null }) {
  const { data, error, reload } = useApiResource(
    async () => (params ? api.getOne<CategorySales>("/reports/sales-by-category", params) : null),
    [params],
  );
  const cats = data?.categories ?? [];
  const empty = !!data && (cats.length === 0 || data.total === 0);

  // Arcs on a circle of circumference 100 (pathLength); null/0 pct omitted.
  const arcs = cats.map((c, i) => ({
    c,
    i,
    len: c.pct ?? 0,
    offset: cats.slice(0, i).reduce((sum, x) => sum + (x.pct ?? 0), 0),
  }));
  const label = `Ventas por categoría: ${cats.map((c) => `${c.name} ${pctLabel(c.pct)}`).join(", ")}`;

  return (
    <div className="bg-white rounded-2xl border border-[#E7DFD2] p-4 sm:p-5 flex flex-col justify-between w-full min-w-0 shadow-xs h-full min-h-[260px]">
      <div className="flex flex-col mb-2">
        <h3 className="font-heading font-bold text-base text-[#231E1A]">Ventas por categoría</h3>
        <span className="text-xs text-[#7A6F63]">Precio de lista, sin descuentos ni recargos</span>
      </div>

      {error && params && <ApiErrorBanner error={error} onRetry={reload} />}
      {params && !error && !data && <div className="p-6 text-center text-xs text-[#7A6F63]">Cargando…</div>}
      {empty && <div className="p-6 text-center text-xs text-[#7A6F63]">Sin ventas en el período</div>}
      {data && !empty && (
        <div className="flex flex-col sm:flex-row items-center gap-5 py-2">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" role="img" aria-label={label}>
              {arcs
                .filter((a) => a.len > 0)
                .map((a) => (
                  <circle
                    key={a.c.categoryId ?? `n-${a.i}`}
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke={COLORS[a.i % COLORS.length]}
                    strokeWidth="4"
                    pathLength={100}
                    strokeDasharray={`${a.len} 100`}
                    strokeDashoffset={-a.offset}
                  />
                ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-heading font-bold text-sm sm:text-base text-[#231E1A] tracking-tight leading-none">
                {money(data.total)}
              </span>
              <span className="text-[10px] text-[#A89C8C] uppercase tracking-wider">total</span>
            </div>
          </div>

          <ul className="flex flex-col gap-2.5 w-full min-w-0 text-xs">
            {cats.map((c, i) => (
              <li key={c.categoryId ?? `n-${i}`} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    aria-hidden="true"
                  />
                  <span className="text-[#7A6F63] font-medium truncate">{c.name}</span>
                </div>
                <span className="font-bold text-[#231E1A] shrink-0 text-right">
                  {money(c.total)} · {c.units} u. · {pctLabel(c.pct)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
