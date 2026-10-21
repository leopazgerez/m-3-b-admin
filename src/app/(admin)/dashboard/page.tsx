"use client";

import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, KpiCard, PendingApi } from "@/components/ui";
import RecentSalesTable from "@/components/dashboard/RecentSalesTable";
import StockAlertsCard from "@/components/dashboard/StockAlertsCard";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/useApi";
import type { StockSummary } from "@/lib/apiTypes";
import { Package, Plus } from "lucide-react";
import { getAssetPath } from "@/lib/assets";

export default function DashboardPage() {
  const summary = useApiResource(() => api.getOne<StockSummary>("/stock/summary"), []);
  const s = summary.data;
  const alerts = s ? s.lowCount + s.outCount : 0;

  return (
    <>
      <Topbar title="Dashboard" />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full">
        {/* Header Section with Timeframe & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#E7DFD2] p-1 shadow-2xs flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized images */}
              <img
                src={getAssetPath("/favicon.png")}
                alt="Mates Triple B"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div className="flex flex-col">
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#231E1A] tracking-tight">
                Resumen del negocio
              </h2>
              <p className="text-xs text-[#7A6F63]">
                Un vistazo general de tu operación en tiempo real
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            {/* Primary Action */}
            <Link
              href="/ventas/nueva"
              className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva venta</span>
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-3">
            <PendingApi title="Ventas, gastos y ganancia neta" endpoint="GET /api/reports/summary" />
          </div>
          {summary.error ? (
            <ApiErrorBanner error={summary.error} onRetry={summary.reload} />
          ) : (
            <KpiCard
              label="Estado de stock"
              value={s ? `${s.totalUnits.toLocaleString("es-AR")} u.` : "…"}
              delta={s ? `${s.lowCount} bajos · ${s.outCount} sin stock` : "cargando"}
              badgeText={alerts > 0 ? `${alerts} alertas` : undefined}
              badgeType="warning"
              icon={<Package className="w-5 h-5" />}
              iconBgColor="bg-[#EADBC6]"
            />
          )}
        </div>

        {/* Charts Row */}
        <div className="flex flex-col lg:flex-row items-stretch gap-5 min-w-0 w-full">
          <div className="flex-1 min-w-0 w-full">
            <PendingApi title="Balance mensual" endpoint="GET /api/reports/monthly-balance" />
          </div>
          <div className="w-full lg:w-[380px] shrink-0 min-w-0">
            <PendingApi title="Ventas por categoría" endpoint="GET /api/reports/sales-by-category" />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col lg:flex-row items-stretch gap-5 min-w-0 w-full">
          <div className="flex-1 min-w-0 w-full">
            <RecentSalesTable />
          </div>
          <div className="w-full lg:w-[380px] shrink-0 min-w-0">
            <StockAlertsCard />
          </div>
        </div>
      </main>
    </>
  );
}
