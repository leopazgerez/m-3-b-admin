"use client";

import Topbar from "@/components/layout/Topbar";
import { useState } from "react";
import { ArrowUpRight, Plus, Calendar, Tag } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { initialMovements } from "../page";

export default function IngresosSubmenuPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const ingresos = initialMovements.filter(
    (m) =>
      m.type === "Ingreso" &&
      (m.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.cat.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalIngresos = ingresos.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <>
      <Topbar
        title="Gastos / Ingresos"
        subtitle="Entradas de dinero por ventas y cobros comerciales"
        onSearch={setSearchTerm}
      />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full">
        {/* Navigation & Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-white border border-[#E7DFD2] p-1.5 rounded-xl shadow-2xs overflow-x-auto max-w-full">
            <Link
              href="/gastos"
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
            >
              Todos los movimientos
            </Link>
            <Link
              href="/gastos/ingresos"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#9C5A2E] text-white shadow-xs whitespace-nowrap"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-white" />
              <span>Ingresos</span>
            </Link>
            <Link
              href="/gastos/egresos"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
            >
              <span>Egresos</span>
            </Link>
            <Link
              href="/configuracion/gastos"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
            >
              <Tag className="w-3.5 h-3.5 text-[#D98A2B]" />
              <span>Categorías</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-[#E3F1E8] border border-[#3E8E5A]/20 px-4 py-2 rounded-xl text-xs flex items-center gap-2">
              <span className="text-[#3E8E5A] font-medium">Total Ingresos:</span>
              <span className="font-heading font-bold text-[#3E8E5A] text-sm">
                +${totalIngresos.toLocaleString("es-AR")}
              </span>
            </div>

            <button className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs">
              <Plus className="w-4 h-4" />
              <span>Nuevo ingreso</span>
            </button>
          </div>
        </div>

        {/* List Table */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[700px]">
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                <div className="flex-1 min-w-[180px]">CONCEPTO / DESCRIPCIÓN</div>
                <div className="w-40 shrink-0">CANAL / ORIGEN</div>
                <div className="w-28 shrink-0">FECHA</div>
                <div className="w-32 shrink-0 text-right">MONTO INGRESADO</div>
                <div className="w-28 shrink-0 pl-4">ESTADO</div>
              </div>

              <div className="divide-y divide-[#F7F3EC]">
                {ingresos.length === 0 ? (
                  <div className="p-12 text-center text-[#7A6F63] text-sm">
                    No hay ingresos registrados con los criterios actuales.
                  </div>
                ) : (
                  ingresos.map((m) => (
                    <div
                      key={m.id}
                      className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                    >
                      <div className="flex-1 min-w-[180px] font-semibold text-[#231E1A] text-sm truncate">
                        {m.desc}
                      </div>
                      <div className="w-40 shrink-0 text-[#7A6F63]">
                        <span className="bg-[#E3F1E8] text-[#3E8E5A] font-medium px-2.5 py-1 rounded-md text-xs whitespace-nowrap">
                          {m.cat}
                        </span>
                      </div>
                      <div className="w-28 shrink-0 text-[#7A6F63] flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                        <span>{m.date}</span>
                      </div>
                      <div className="w-32 shrink-0 text-right font-bold text-sm text-[#3E8E5A] whitespace-nowrap">
                        +${m.amount.toLocaleString("es-AR")}
                      </div>
                      <div className="w-28 shrink-0 pl-4">
                        <Badge variant="success">{m.status}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
