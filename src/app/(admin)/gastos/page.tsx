"use client";

import Topbar from "@/components/layout/Topbar";
import { useState } from "react";
import { ArrowUpRight, ArrowDownRight, Plus, Search, Calendar } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Link from "next/link";

export const initialMovements = [
  {
    id: "mov-1",
    desc: "Venta Mayorista Mate Torpedo x20",
    cat: "Ventas",
    date: "19 Sep",
    type: "Ingreso" as const,
    amount: 280000,
    status: "Pagado",
  },
  {
    id: "mov-2",
    desc: "Compra de calabazas seleccionadas",
    cat: "Proveedores",
    date: "18 Sep",
    type: "Egreso" as const,
    amount: 145000,
    status: "Pagado",
  },
  {
    id: "mov-3",
    desc: "Virolas de alpaca cincelada x50",
    cat: "Proveedores",
    date: "17 Sep",
    type: "Egreso" as const,
    amount: 98000,
    status: "Pagado",
  },
  {
    id: "mov-4",
    desc: "Cajas y bolsas de empaque Kraft",
    cat: "Embalaje",
    date: "16 Sep",
    type: "Egreso" as const,
    amount: 32000,
    status: "Pagado",
  },
  {
    id: "mov-5",
    desc: "Venta personalizada Corporativa",
    cat: "Ventas",
    date: "15 Sep",
    type: "Ingreso" as const,
    amount: 195000,
    status: "Pagado",
  },
  {
    id: "mov-6",
    desc: "Pago logística envíos OCA / Correo",
    cat: "Logística",
    date: "14 Sep",
    type: "Egreso" as const,
    amount: 45600,
    status: "Pagado",
  },
];

export default function GastosPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = initialMovements.filter((m) =>
    m.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Topbar
        title="Gastos y Finanzas"
        subtitle="Control del flujo de caja, ingresos y egresos comerciales"
        onSearch={setSearchTerm}
      />

      <main className="p-8 flex flex-col gap-6 max-w-7xl w-full">
        {/* Navigation to submenus */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-white border border-[#E7DFD2] p-1.5 rounded-xl shadow-2xs">
            <Link
              href="/gastos"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#9C5A2E] text-white shadow-xs"
            >
              Todos los movimientos
            </Link>
            <Link
              href="/gastos/ingresos"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-[#3E8E5A]" />
              <span>Ingresos</span>
            </Link>
            <Link
              href="/gastos/egresos"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors"
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-[#C0492F]" />
              <span>Egresos</span>
            </Link>
          </div>

          <button className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            <span>Registrar movimiento</span>
          </button>
        </div>

        {/* List Table */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden">
          <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
            <div className="flex-1">CONCEPTO / DESCRIPCIÓN</div>
            <div className="w-40">RUBRO O ÁREA</div>
            <div className="w-28">FECHA</div>
            <div className="w-32">TIPO</div>
            <div className="w-32 text-right">MONTO</div>
            <div className="w-28 pl-4">ESTADO</div>
          </div>

          <div className="divide-y divide-[#F7F3EC]">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
              >
                <div className="flex-1 font-semibold text-[#231E1A] text-sm">
                  {m.desc}
                </div>
                <div className="w-40 text-[#7A6F63]">
                  <span className="bg-[#FBF8F2] border border-[#E7DFD2] px-2.5 py-1 rounded-md text-xs">
                    {m.cat}
                  </span>
                </div>
                <div className="w-28 text-[#7A6F63] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#A89C8C]" />
                  <span>{m.date}</span>
                </div>
                <div className="w-32 flex items-center gap-1.5">
                  {m.type === "Ingreso" ? (
                    <span className="flex items-center gap-1 text-[#3E8E5A] font-semibold">
                      <ArrowUpRight className="w-4 h-4" /> Ingreso
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[#C0492F] font-semibold">
                      <ArrowDownRight className="w-4 h-4" /> Egreso
                    </span>
                  )}
                </div>
                <div
                  className={`w-32 text-right font-bold text-sm ${
                    m.type === "Ingreso" ? "text-[#3E8E5A]" : "text-[#231E1A]"
                  }`}
                >
                  {m.type === "Ingreso" ? "+" : "-"}${m.amount.toLocaleString("es-AR")}
                </div>
                <div className="w-28 pl-4">
                  <Badge variant="success">{m.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
