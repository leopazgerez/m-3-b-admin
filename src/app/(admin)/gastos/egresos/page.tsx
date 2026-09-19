"use client";

import Topbar from "@/components/layout/Topbar";
import { useState } from "react";
import { ArrowDownRight, Plus, Calendar } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { initialMovements } from "../page";

export default function EgresosSubmenuPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const egresos = initialMovements.filter(
    (m) =>
      m.type === "Egreso" &&
      (m.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.cat.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalEgresos = egresos.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <>
      <Topbar
        title="Gastos / Egresos"
        subtitle="Salidas de dinero, proveedores, empaque y logística"
        onSearch={setSearchTerm}
      />

      <main className="p-8 flex flex-col gap-6 max-w-7xl w-full">
        {/* Navigation & Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-white border border-[#E7DFD2] p-1.5 rounded-xl shadow-2xs">
            <Link
              href="/gastos"
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors"
            >
              Todos los movimientos
            </Link>
            <Link
              href="/gastos/ingresos"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors"
            >
              <span>Ingresos</span>
            </Link>
            <Link
              href="/gastos/egresos"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#9C5A2E] text-white shadow-xs"
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-white" />
              <span>Egresos</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-[#F7E3DD] border border-[#C0492F]/20 px-4 py-2 rounded-xl text-xs flex items-center gap-2">
              <span className="text-[#C0492F] font-medium">Total Egresos:</span>
              <span className="font-heading font-bold text-[#C0492F] text-sm">
                -${totalEgresos.toLocaleString("es-AR")}
              </span>
            </div>

            <button className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs">
              <Plus className="w-4 h-4" />
              <span>Nuevo egreso</span>
            </button>
          </div>
        </div>

        {/* List Table */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden">
          <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
            <div className="flex-1">CONCEPTO / DESCRIPCIÓN</div>
            <div className="w-40">RUBRO / PROVEEDOR</div>
            <div className="w-28">FECHA</div>
            <div className="w-32 text-right">MONTO EGRESADO</div>
            <div className="w-28 pl-4">ESTADO</div>
          </div>

          <div className="divide-y divide-[#F7F3EC]">
            {egresos.length === 0 ? (
              <div className="p-12 text-center text-[#7A6F63] text-sm">
                No hay egresos registrados con los criterios actuales.
              </div>
            ) : (
              egresos.map((m) => (
                <div
                  key={m.id}
                  className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                >
                  <div className="flex-1 font-semibold text-[#231E1A] text-sm">
                    {m.desc}
                  </div>
                  <div className="w-40 text-[#7A6F63]">
                    <span className="bg-[#F7E3DD] text-[#C0492F] font-medium px-2.5 py-1 rounded-md text-xs">
                      {m.cat}
                    </span>
                  </div>
                  <div className="w-28 text-[#7A6F63] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#A89C8C]" />
                    <span>{m.date}</span>
                  </div>
                  <div className="w-32 text-right font-bold text-sm text-[#C0492F]">
                    -${m.amount.toLocaleString("es-AR")}
                  </div>
                  <div className="w-28 pl-4">
                    <Badge variant="success">{m.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
