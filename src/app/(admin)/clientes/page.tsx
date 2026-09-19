"use client";

import Topbar from "@/components/layout/Topbar";
import { useStore } from "@/lib/store";
import { Mail, Phone, ShoppingBag, ChevronRight, UserCheck } from "lucide-react";
import { useState } from "react";

export default function ClientesPage() {
  const { sales } = useStore();
  const [searchTerm, setSearchTerm] = useState("");

  const clients = Array.from(
    new Map(sales.map((s) => [s.clientName, s])).values()
  ).map((s, idx) => ({
    name: s.clientName,
    initials: s.clientInitials,
    orders: sales.filter((item) => item.clientName === s.clientName).length,
    spent: sales
      .filter((item) => item.clientName === s.clientName)
      .reduce((acc, curr) => acc + curr.amount, 0),
    email: `${s.clientName.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
    phone: `+54 9 11 ${4500 + idx * 37}-${1000 + idx * 82}`,
    lastPurchase: s.date,
  }));

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Topbar
        title="Clientes"
        subtitle="Directorio y fidelización de compradores"
        onSearch={setSearchTerm}
      />

      <main className="p-8 flex flex-col gap-6 max-w-7xl w-full">
        {/* Table / List View */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden">
          {/* Header Row */}
          <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
            <div className="flex-1">CLIENTE</div>
            <div className="w-56">CONTACTO (EMAIL)</div>
            <div className="w-40">TELÉFONO</div>
            <div className="w-28 text-center">PEDIDOS</div>
            <div className="w-32 text-right">TOTAL GASTADO</div>
            <div className="w-10"></div>
          </div>

          {/* List Rows */}
          <div className="divide-y divide-[#F7F3EC]">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-[#7A6F63] text-sm">
                No se encontraron clientes que coincidan con la búsqueda.
              </div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.name}
                  className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                >
                  {/* Name & Avatar */}
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center font-bold text-sm shrink-0">
                      {c.initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-[#231E1A] text-sm truncate">
                        {c.name}
                      </span>
                      <span className="text-[11px] text-[#A89C8C] flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-[#3E8E5A]" />
                        Última compra: {c.lastPurchase}
                      </span>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="w-56 text-[#7A6F63] flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>

                  {/* Phone */}
                  <div className="w-40 text-[#7A6F63] flex items-center gap-1.5 font-mono text-xs">
                    <Phone className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                    <span>{c.phone}</span>
                  </div>

                  {/* Orders */}
                  <div className="w-28 text-center font-medium text-[#231E1A]">
                    <span className="bg-[#FBF8F2] border border-[#E7DFD2] px-2.5 py-1 rounded-full text-xs">
                      {c.orders} pedidos
                    </span>
                  </div>

                  {/* Total Spent */}
                  <div className="w-32 text-right font-bold text-[#231E1A] text-sm">
                    ${c.spent.toLocaleString("es-AR")}
                  </div>

                  {/* Action */}
                  <div className="w-10 flex items-center justify-end">
                    <ChevronRight className="w-4 h-4 text-[#A89C8C]" />
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
