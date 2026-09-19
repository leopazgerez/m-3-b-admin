"use client";

import { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import KpiCard from "@/components/ui/KpiCard";
import BalanceChart from "@/components/dashboard/BalanceChart";
import CategoryDonut from "@/components/dashboard/CategoryDonut";
import RecentSalesTable from "@/components/dashboard/RecentSalesTable";
import StockAlertsCard from "@/components/dashboard/StockAlertsCard";
import { monthlyBalances } from "@/lib/data";
import { useStore } from "@/lib/store";
import { DollarSign, Receipt, TrendingUp, Package, Plus } from "lucide-react";
import { getAssetPath } from "@/lib/assets";

export default function DashboardPage() {
  const { sales, products } = useStore();
  const [period, setPeriod] = useState<"Hoy" | "Semana" | "Mes" | "Año">("Mes");

  return (
    <>
      <Topbar title="Dashboard" />

      <main className="p-8 flex flex-col gap-6 max-w-7xl w-full">
        {/* Header Section with Timeframe & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#E7DFD2] p-1 shadow-2xs flex items-center justify-center shrink-0">
              <img
                src={getAssetPath("/favicon.png")}
                alt="Mates Triple B"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div className="flex flex-col">
              <h2 className="font-heading font-bold text-2xl text-[#231E1A] tracking-tight">
                Resumen del negocio
              </h2>
              <p className="text-xs text-[#7A6F63]">
                Un vistazo general de tu operación en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Segmented Control */}
            <div className="flex items-center bg-white border border-[#E7DFD2] p-1 rounded-xl shadow-2xs">
              {(["Hoy", "Semana", "Mes", "Año"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    period === p
                      ? "bg-[#9C5A2E] text-white font-semibold shadow-xs"
                      : "text-[#7A6F63] hover:text-[#231E1A]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Primary Action */}
            <Link
              href="/ventas/nueva"
              className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva venta</span>
            </Link>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            label="Ventas del mes"
            value="$4.820.500"
            delta="vs. mes anterior"
            badgeText="+12,5%"
            badgeType="success"
            icon={<DollarSign className="w-5 h-5" />}
            iconBgColor="bg-[#EADBC6]"
          />
          <KpiCard
            label="Gastos del mes"
            value="$2.140.300"
            delta="vs. mes anterior"
            badgeText="+8,2%"
            badgeType="danger"
            icon={<Receipt className="w-5 h-5 text-[#D98A2B]" />}
            iconBgColor="bg-[#FBEFD9]"
          />
          <KpiCard
            label="Ganancia neta"
            value="$2.680.200"
            delta="margen 55,6%"
            badgeText="+18,4%"
            badgeType="success"
            icon={<TrendingUp className="w-5 h-5 text-[#3E8E5A]" />}
            iconBgColor="bg-[#E3F1E8]"
          />
          <KpiCard
            label="Estado de stock"
            value="1.284 u."
            delta="en 23 productos"
            badgeText="12 bajos"
            badgeType="warning"
            icon={<Package className="w-5 h-5" />}
            iconBgColor="bg-[#EADBC6]"
          />
        </div>

        {/* Charts Row */}
        <div className="flex flex-col lg:flex-row items-stretch gap-5">
          <BalanceChart data={monthlyBalances} />
          <CategoryDonut />
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col lg:flex-row items-stretch gap-5">
          <RecentSalesTable sales={sales} />
          <StockAlertsCard />
        </div>
      </main>
    </>
  );
}
