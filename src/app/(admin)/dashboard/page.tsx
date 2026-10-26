"use client";

import { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, KpiCard } from "@/components/ui";
import RecentSalesTable from "@/components/dashboard/RecentSalesTable";
import StockAlertsCard from "@/components/dashboard/StockAlertsCard";
import BalanceChart from "@/components/dashboard/BalanceChart";
import CategoryDonut from "@/components/dashboard/CategoryDonut";
import PeriodSelector from "@/components/dashboard/PeriodSelector";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/useApi";
import type { SalesSummary, StockSummary } from "@/lib/apiTypes";
import { formatDate, toLocalISODate } from "@/lib/dateUtils";
import { money } from "@/lib/format";
import { pctLabel, periodParams, type DashboardPeriod } from "@/lib/reports";
import { Banknote, HandCoins, Package, Plus, Receipt, TrendingUp, Wallet, Wallet2 } from "lucide-react";
import { getAssetPath } from "@/lib/assets";

export default function DashboardPage() {
  const summary = useApiResource(() => api.getOne<StockSummary>("/stock/summary"), []);
  const s = summary.data;
  const [period, setPeriod] = useState<DashboardPeriod>({ kind: "current" });
  const params = periodParams(period, toLocalISODate());
  const report = useApiResource(
    async () => (params ? api.getOne<SalesSummary>("/reports/summary", params) : null),
    [params],
  );
  const r = report.data;
  const ph = params ? "…" : "—";
  const alerts = s ? s.lowCount + s.outCount : 0;

  return (
    <>
      <Topbar title="Dashboard" />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full">
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <PeriodSelector value={period} onChange={setPeriod} invalid={!params} />
          {r && params && (
            <span className="text-xs text-[#7A6F63]">
              {formatDate(r.from)} – {formatDate(r.to)}
            </span>
          )}
        </div>

        {/* KPIs */}
        {report.error && params && <ApiErrorBanner error={report.error} onRetry={report.reload} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            label="Ventas"
            value={r ? money(r.sales.total) : ph}
            delta={r ? `${r.sales.count} ventas` : params ? "cargando" : "—"}
            icon={<Receipt className="w-5 h-5" />}
          />
          <KpiCard
            label="Ganancia bruta"
            value={r ? money(r.sales.grossProfit) : ph}
            delta="ventas menos costo"
            badgeText={r && r.sales.grossMarginPct !== null ? pctLabel(r.sales.grossMarginPct) : undefined}
            badgeType={r && r.sales.grossProfit < 0 ? "danger" : "success"}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <KpiCard
            label="Gastos"
            value={r ? money(r.expenses.total) : ph}
            delta="egresos del período"
            icon={<Wallet className="w-5 h-5" />}
          />
          <KpiCard
            label="Neto"
            value={r ? money(r.net) : ph}
            delta="ventas menos gastos"
            badgeText={r && r.netMarginPct !== null ? pctLabel(r.netMarginPct) : undefined}
            badgeType={r && r.net < 0 ? "danger" : "success"}
            icon={<Wallet2 className="w-5 h-5" />}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            label="Cobrado"
            value={r ? money(r.cash.collected) : ph}
            delta="base caja"
            icon={<Banknote className="w-5 h-5" />}
          />
          <KpiCard
            label="Pagado"
            value={r ? money(r.cash.paid) : ph}
            delta="base caja"
            icon={<HandCoins className="w-5 h-5" />}
          />
          <KpiCard
            label="Caja neta"
            value={r ? money(r.cash.net) : ph}
            delta="cobrado menos pagado"
            badgeText={r && r.cash.net < 0 ? "negativa" : undefined}
            badgeType="danger"
            icon={<Wallet className="w-5 h-5" />}
          />
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
            <BalanceChart />
          </div>
          <div className="w-full lg:w-[380px] shrink-0 min-w-0">
            <CategoryDonut params={params} />
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
