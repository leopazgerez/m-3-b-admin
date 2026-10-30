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
import { AlertTriangle, Banknote, HandCoins, Package, Plus, Receipt, TrendingUp, Undo2, Wallet, Wallet2 } from "lucide-react";
import { getAssetPath } from "@/lib/assets";
import { CashStatusCard } from "@/components/cash/CashStatus";

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

        <CashStatusCard />

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
        <Section title="Resultado del período" subtitle="Ventas, ganancia, gastos y neto" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            label="Ventas netas"
            hint="Total de las ventas no anuladas hechas en el período (con descuentos y recargos), menos lo devuelto. Cuenta la venta el día que se hizo, aunque todavía no esté cobrada."
            value={r ? money(r.sales.netTotal) : ph}
            delta={r ? `${r.sales.count} ventas · ${money(r.sales.total)} antes de devoluciones` : params ? "cargando" : "—"}
            icon={<Receipt className="w-5 h-5" />}
          />
          <KpiCard
            label="Ganancia bruta"
            hint="Ventas menos el costo de los productos vendidos, tomado al momento de cada venta. El porcentaje es la ganancia sobre las ventas."
            value={r ? money(r.sales.grossProfit) : ph}
            delta="ventas menos costo"
            badgeText={r && r.sales.grossMarginPct !== null ? pctLabel(r.sales.grossMarginPct) : undefined}
            badgeType={r && r.sales.grossProfit < 0 ? "danger" : "success"}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <KpiCard
            label="Gastos"
            hint="Total de los gastos con fecha en el período, estén pagados o no. Los gastos eliminados no cuentan."
            value={r ? money(r.expenses.total) : ph}
            delta="egresos del período"
            icon={<Wallet className="w-5 h-5" />}
          />
          <KpiCard
            label="Neto"
            hint="Ventas menos gastos del período. El porcentaje es el neto sobre las ventas."
            value={r ? money(r.net) : ph}
            delta="ventas menos gastos"
            badgeText={r && r.netMarginPct !== null ? pctLabel(r.netMarginPct) : undefined}
            badgeType={r && r.net < 0 ? "danger" : "success"}
            icon={<Wallet2 className="w-5 h-5" />}
          />
        </div>
        <Section title="Dinero y stock" subtitle="Lo que entró y salió de las cuentas, y el estado del inventario" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            label="Cobrado"
            hint="Dinero que entró por pagos de clientes en el período (de ventas y de cuenta corriente), según la fecha de cada pago."
            value={r ? money(r.cash.collected) : ph}
            delta={r && r.cash.refunded > 0 ? `base caja · reintegros ${money(r.cash.refunded)} (se restan en Caja neta)` : "base caja"}
            icon={<Banknote className="w-5 h-5" />}
          />
          <KpiCard
            label="Pagado"
            hint="Dinero que salió por pagos de cuotas de gastos en el período, según la fecha de cada pago."
            value={r ? money(r.cash.paid) : ph}
            delta="base caja"
            icon={<HandCoins className="w-5 h-5" />}
          />
          <KpiCard
            label="Caja neta"
            hint="Cobrado menos reintegros a clientes menos pagado: cuánto dinero dejó la operación del período."
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
              hint="Unidades en stock de los productos y variantes activos. Bajo: en o por debajo del stock mínimo. Sin stock: sin unidades."
              value={s ? `${s.totalUnits.toLocaleString("es-AR")} u.` : "…"}
              delta={s ? `${s.lowCount} bajos · ${s.outCount} sin stock` : "cargando"}
              badgeText={alerts > 0 ? `${alerts} alertas` : undefined}
              badgeType="warning"
              icon={<Package className="w-5 h-5" />}
              iconBgColor="bg-[#EADBC6]"
            />
          )}
        </div>

        <Section title="Devoluciones" subtitle="Devoluciones y cambios del período" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            label="Devoluciones"
            hint="Cantidad de devoluciones y cambios registrados en el período."
            value={r ? String(r.returns.count) : ph}
            delta="devoluciones y cambios"
            icon={<Undo2 className="w-5 h-5" />}
          />
          <KpiCard
            label="Valor devuelto"
            hint="Valor de los productos devueltos en el período. Se resta de las ventas para obtener las ventas netas."
            value={r ? money(r.returns.total) : ph}
            delta="restado de las ventas"
            icon={<Receipt className="w-5 h-5" />}
          />
          <KpiCard
            label="Costo repuesto"
            hint="Costo de las unidades devueltas en buen estado que volvieron al stock."
            value={r ? money(r.returns.restockedCost) : ph}
            delta="unidades sanas que volvieron al stock"
            icon={<Package className="w-5 h-5" />}
          />
          <KpiCard
            label="Pérdida por fallados"
            hint="Costo de las unidades devueltas falladas, que no vuelven al stock."
            value={r ? money(r.returns.lossCost) : ph}
            delta="costo de lo que no vuelve al stock"
            badgeText={r && r.returns.lossCost > 0 ? "pérdida" : undefined}
            badgeType="danger"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
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

/** Heading over a row of KPI cards: which part of the business the row summarizes. */
function Section({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="-mb-3">
      <h3 className="font-heading font-bold text-sm text-[#231E1A]">{title}</h3>
      <p className="text-[11px] text-[#7A6F63]">{subtitle}</p>
    </div>
  );
}
