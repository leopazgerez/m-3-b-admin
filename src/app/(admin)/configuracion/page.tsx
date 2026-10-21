"use client";

import Topbar from "@/components/layout/Topbar";
import { PendingApi } from "@/components/ui";
import { Tag, CreditCard, ReceiptText } from "lucide-react";
import Link from "next/link";

export default function ConfiguracionPage() {
  return (
    <>
      <Topbar
        title="Configuración"
        subtitle="Ajustes del sistema y datos generales del negocio"
      />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-4xl w-full">
        {/* Navigation Bar between Config Submenus */}
        <div className="flex items-center gap-2 bg-white border border-[#E7DFD2] p-1.5 rounded-xl shadow-2xs overflow-x-auto max-w-full">
          <Link
            href="/configuracion"
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#9C5A2E] text-white shadow-xs whitespace-nowrap"
          >
            General
          </Link>
          <Link
            href="/configuracion/producto"
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
          >
            Producto (Categorías)
          </Link>
          <Link
            href="/configuracion/venta"
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
          >
            Cobros
          </Link>
          <Link
            href="/configuracion/gastos"
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
          >
            Gastos (Categorías)
          </Link>
        </div>

        {/* Quick summary cards for submenus */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/configuracion/producto"
            className="bg-white rounded-2xl border border-[#E7DFD2] p-5 flex items-center justify-between shadow-xs hover:border-[#9C5A2E] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-sm text-[#231E1A] group-hover:text-[#9C5A2E] transition-colors">
                  Categorías
                </span>
                <span className="text-[11px] text-[#7A6F63]">
                  Categorías de producto
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/configuracion/venta"
            className="bg-white rounded-2xl border border-[#E7DFD2] p-5 flex items-center justify-between shadow-xs hover:border-[#9C5A2E] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E3F1E8] text-[#3E8E5A] flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-sm text-[#231E1A] group-hover:text-[#9C5A2E] transition-colors">
                  Cobros
                </span>
                <span className="text-[11px] text-[#7A6F63]">
                  Medios de pago y cuentas
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/configuracion/gastos"
            className="bg-white rounded-2xl border border-[#E7DFD2] p-5 flex items-center justify-between shadow-xs hover:border-[#9C5A2E] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FBEFD9] text-[#D98A2B] flex items-center justify-center">
                <ReceiptText className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-sm text-[#231E1A] group-hover:text-[#9C5A2E] transition-colors">
                  Gastos
                </span>
                <span className="text-[11px] text-[#7A6F63]">
                  Categorías de gasto
                </span>
              </div>
            </div>
          </Link>
        </div>

        <PendingApi title="Datos del negocio" endpoint="GET/PUT /api/settings" />
      </main>
    </>
  );
}
