"use client";

import Topbar from "@/components/layout/Topbar";
import { useStore } from "@/lib/store";
import { Mail, Phone, ShoppingBag, ChevronRight, UserCheck } from "lucide-react";
import { useState } from "react";

export default function ClientesPage() {
  const { clients: storeClients, sales } = useStore();
  const [searchTerm, setSearchTerm] = useState("");

  // Map registered clients with purchase metrics
  const clientsList = storeClients.map((sc) => {
    const matchingSales = sales.filter(
      (s) => s.clientId === sc.id || s.clientName.toLowerCase() === sc.name.toLowerCase()
    );
    return {
      id: sc.id,
      name: sc.name,
      initials: sc.initials,
      dni: sc.dni,
      orders: matchingSales.length,
      spent: matchingSales.reduce((acc, curr) => acc + curr.amount, 0),
      email: sc.email || `${sc.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
      phone: sc.phone || "Sin teléfono",
      lastPurchase: matchingSales[0]?.date || "Sin compras",
    };
  });

  // Also include any sales clients that were not yet in registered storeClients (excluding generic "Consumidor Final")
  const salesClientsExtra = sales
    .filter(
      (s) =>
        s.clientName !== "Consumidor Final" &&
        !storeClients.some(
          (sc) => sc.id === s.clientId || sc.name.toLowerCase() === s.clientName.toLowerCase()
        )
    )
    .filter((s, idx, arr) => arr.findIndex((x) => x.clientName === s.clientName) === idx)
    .map((s) => {
      const matchingSales = sales.filter((item) => item.clientName === s.clientName);
      return {
        id: s.clientId || `extra-${s.clientName}`,
        name: s.clientName,
        initials: s.clientInitials || "CL",
        dni: s.clientDni,
        orders: matchingSales.length,
        spent: matchingSales.reduce((acc, curr) => acc + curr.amount, 0),
        email: s.clientEmail || `${s.clientName.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
        phone: s.clientPhone || "Sin teléfono",
        lastPurchase: s.date,
      };
    });

  const allClients = [...clientsList, ...salesClientsExtra];

  const filtered = allClients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.dni && c.dni.includes(searchTerm)) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <>
      <Topbar
        title="Clientes"
        subtitle="Directorio y fidelización de compradores"
        onSearch={setSearchTerm}
      />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full min-w-0">
        {/* Table / List View */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[760px]">
              {/* Header Row */}
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                <div className="flex-1 min-w-[200px]">CLIENTE</div>
                <div className="w-56 shrink-0">CONTACTO (EMAIL)</div>
                <div className="w-40 shrink-0">TELÉFONO</div>
                <div className="w-28 shrink-0 text-center">PEDIDOS</div>
                <div className="w-32 shrink-0 text-right">TOTAL GASTADO</div>
                <div className="w-10 shrink-0"></div>
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
                      key={c.id || c.name}
                      className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <div className="flex-1 min-w-[200px] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center font-bold text-sm shrink-0">
                          {c.initials}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#231E1A] text-sm truncate">
                              {c.name}
                            </span>
                            {c.dni && (
                              <span className="text-[10px] bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] px-1.5 py-0.5 rounded font-mono shrink-0">
                                DNI {c.dni}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#A89C8C] flex items-center gap-1 truncate">
                            <UserCheck className="w-3 h-3 text-[#3E8E5A] shrink-0" />
                            Última compra: {c.lastPurchase}
                          </span>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="w-56 shrink-0 text-[#7A6F63] flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>

                      {/* Phone */}
                      <div className="w-40 shrink-0 text-[#7A6F63] flex items-center gap-1.5 font-mono text-xs">
                        <Phone className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                        <span>{c.phone}</span>
                      </div>

                      {/* Orders */}
                      <div className="w-28 shrink-0 text-center font-medium text-[#231E1A]">
                        <span className="bg-[#FBF8F2] border border-[#E7DFD2] px-2.5 py-1 rounded-full text-xs">
                          {c.orders} pedidos
                        </span>
                      </div>

                      {/* Total Spent */}
                      <div className="w-32 shrink-0 text-right font-bold text-[#231E1A] text-sm">
                        ${c.spent.toLocaleString("es-AR")}
                      </div>

                      {/* Action */}
                      <div className="w-10 shrink-0 flex items-center justify-end">
                        <ChevronRight className="w-4 h-4 text-[#A89C8C]" />
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
