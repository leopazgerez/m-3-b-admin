"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import KpiCard from "@/components/ui/KpiCard";
import BalanceChart from "@/components/dashboard/BalanceChart";
import CategoryDonut from "@/components/dashboard/CategoryDonut";
import RecentSalesTable from "@/components/dashboard/RecentSalesTable";
import StockAlertsCard from "@/components/dashboard/StockAlertsCard";
import Modal from "@/components/ui/Modal";
import { monthlyBalances } from "@/lib/data";
import { useStore } from "@/lib/store";
import { DollarSign, Receipt, TrendingUp, Package, Plus } from "lucide-react";

export default function DashboardPage() {
  const { sales, addSale, products } = useStore();
  const [period, setPeriod] = useState<"Hoy" | "Semana" | "Mes" | "Año">("Mes");
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  // New sale form state
  const [clientName, setClientName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [method, setMethod] = useState<"Efectivo" | "Transferencia" | "Tarjeta de débito" | "Mercado Pago">("Efectivo");
  const [amount, setAmount] = useState("");

  const handleCreateSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !selectedProduct || !amount) return;

    const initials = clientName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CL";

    addSale({
      clientName,
      clientInitials: initials,
      productName: selectedProduct,
      date: "Hoy",
      method,
      amount: parseFloat(amount),
      status: "Completada",
    });

    setClientName("");
    setSelectedProduct("");
    setAmount("");
    setIsSaleModalOpen(false);
  };

  return (
    <>
      <Topbar title="Dashboard" />

      <main className="p-8 flex flex-col gap-6 max-w-7xl w-full">
        {/* Header Section with Timeframe & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h2 className="font-heading font-bold text-2xl text-[#231E1A] tracking-tight">
              Resumen del negocio
            </h2>
            <p className="text-xs text-[#7A6F63]">
              Un vistazo general de tu operación en tiempo real
            </p>
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
            <button
              onClick={() => setIsSaleModalOpen(true)}
              className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva venta</span>
            </button>
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

      {/* Modal: Registrar Nueva Venta */}
      <Modal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        title="Registrar nueva venta"
      >
        <form onSubmit={handleCreateSale} className="flex flex-col gap-4 text-xs">
          <div>
            <label className="font-medium text-[#231E1A] block mb-1">
              Nombre del cliente
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Sofía Martínez"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
            />
          </div>

          <div>
            <label className="font-medium text-[#231E1A] block mb-1">
              Producto vendido
            </label>
            <select
              required
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                const found = products.find((p) => p.name === e.target.value);
                if (found) setAmount(found.price.toString());
              }}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
            >
              <option value="">Seleccionar un producto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} — ${p.price.toLocaleString("es-AR")}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[#231E1A] block mb-1">
                Método de pago
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta de débito">Tarjeta de débito</option>
                <option value="Mercado Pago">Mercado Pago</option>
              </select>
            </div>

            <div>
              <label className="font-medium text-[#231E1A] block mb-1">
                Monto total ($)
              </label>
              <input
                type="number"
                required
                placeholder="18500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 mt-2 border-t border-[#F7F3EC]">
            <button
              type="button"
              onClick={() => setIsSaleModalOpen(false)}
              className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs"
            >
              Guardar venta
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
