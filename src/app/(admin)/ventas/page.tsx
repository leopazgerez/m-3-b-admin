"use client";

import Topbar from "@/components/layout/Topbar";
import { useStore } from "@/lib/store";
import { Sale } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { useState } from "react";
import { Filter, Calendar, CreditCard, Plus, Edit2, Trash2 } from "lucide-react";

export default function VentasPage() {
  const { sales, products, saleTypes, addSale, updateSale, deleteSale } = useStore();
  const [methodFilter, setMethodFilter] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);

  // Form states
  const [clientName, setClientName] = useState("");
  const [productName, setProductName] = useState("");
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"Completada" | "Pendiente" | "Cancelada">("Completada");

  const openCreateModal = () => {
    setEditingSale(null);
    setClientName("");
    setProductName(products[0]?.name || "");
    setMethod(saleTypes[0] || "Efectivo");
    setAmount(products[0]?.price.toString() || "18500");
    setStatus("Completada");
    setIsModalOpen(true);
  };

  const openEditModal = (s: Sale) => {
    setEditingSale(s);
    setClientName(s.clientName);
    setProductName(s.productName);
    setMethod(s.method);
    setAmount(s.amount.toString());
    setStatus(s.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !productName || !amount) return;

    const initials = clientName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CL";

    if (editingSale) {
      updateSale(editingSale.id, {
        clientName,
        clientInitials: initials,
        productName,
        method: method || saleTypes[0] || "Efectivo",
        amount: parseFloat(amount),
        status,
      });
    } else {
      addSale({
        clientName,
        clientInitials: initials,
        productName,
        date: "Hoy",
        method: method || saleTypes[0] || "Efectivo",
        amount: parseFloat(amount),
        status,
      });
    }

    setIsModalOpen(false);
  };

  const filtered = sales.filter((s) => {
    const matchesSearch =
      s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === "Todos" || s.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const methods = ["Todos", ...saleTypes];

  return (
    <>
      <Topbar
        title="Ventas"
        subtitle="Registro y listado cronológico de operaciones comerciales"
        onSearch={setSearchTerm}
      />

      <main className="p-8 flex flex-col gap-6 max-w-7xl w-full">
        {/* Filters and CTA bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <Filter className="w-4 h-4 text-[#A89C8C] shrink-0 mr-1" />
            {methods.map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  methodFilter === m
                    ? "bg-[#9C5A2E] text-white font-semibold shadow-xs"
                    : "bg-white border border-[#E7DFD2] text-[#7A6F63] hover:text-[#231E1A]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs self-start sm:self-auto cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva venta</span>
          </button>
        </div>

        {/* List View */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden">
          <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
            <div className="w-16">ID</div>
            <div className="flex-1">CLIENTE</div>
            <div className="flex-1">PRODUCTO O SERVICIO</div>
            <div className="w-28">FECHA</div>
            <div className="w-36">MÉTODO</div>
            <div className="w-28 text-right">TOTAL</div>
            <div className="w-28 pl-4">ESTADO</div>
            <div className="w-20 text-center">ACCIONES</div>
          </div>

          <div className="divide-y divide-[#F7F3EC]">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-[#7A6F63] text-sm">
                No se encontraron ventas registradas.
              </div>
            ) : (
              filtered.map((s, idx) => (
                <div
                  key={s.id}
                  className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                >
                  <div className="w-16 font-mono text-xs text-[#A89C8C]">
                    #{String(idx + 1).padStart(4, "0")}
                  </div>

                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center font-bold text-xs shrink-0">
                      {s.clientInitials}
                    </div>
                    <span className="font-semibold text-[#231E1A] truncate text-sm">
                      {s.clientName}
                    </span>
                  </div>

                  <div className="flex-1 text-[#7A6F63] font-medium truncate">
                    {s.productName}
                  </div>

                  <div className="w-28 text-[#7A6F63] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#A89C8C]" />
                    <span>{s.date}</span>
                  </div>

                  <div className="w-36 text-[#7A6F63] flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#A89C8C]" />
                    <span>{s.method}</span>
                  </div>

                  <div className="w-28 text-right font-bold text-[#231E1A] text-sm">
                    ${s.amount.toLocaleString("es-AR")}
                  </div>

                  <div className="w-28 pl-4">
                    <Badge
                      variant={
                        s.status === "Completada"
                          ? "success"
                          : s.status === "Pendiente"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {s.status}
                    </Badge>
                  </div>

                  {/* Actions (Editar / Eliminar) */}
                  <div className="w-20 flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEditModal(s)}
                      title="Editar venta"
                      className="text-[#A89C8C] hover:text-[#9C5A2E] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingSale(s)}
                      title="Eliminar venta"
                      className="text-[#A89C8C] hover:text-[#C0492F] p-1.5 rounded-lg hover:bg-[#F7E3DD]/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Modal: Crear / Modificar Venta */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSale ? "Modificar venta" : "Registrar nueva venta"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
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
              Producto o concepto vendido
            </label>
            <select
              value={productName}
              onChange={(e) => {
                setProductName(e.target.value);
                const found = products.find((p) => p.name === e.target.value);
                if (found && !editingSale) setAmount(found.price.toString());
              }}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
            >
              <option value="">Seleccionar un producto del catálogo...</option>
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
                Tipo / Medio de venta
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              >
                {saleTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-[#231E1A] block mb-1">
                Monto ($)
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

          <div>
            <label className="font-medium text-[#231E1A] block mb-1">
              Estado de la venta
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
            >
              <option value="Completada">Completada</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 mt-2 border-t border-[#F7F3EC]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer"
            >
              {editingSale ? "Guardar cambios" : "Registrar venta"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal Reutilizable */}
      <ConfirmDeleteModal
        isOpen={!!deletingSale}
        onClose={() => setDeletingSale(null)}
        onConfirm={() => {
          if (deletingSale) {
            deleteSale(deletingSale.id);
          }
        }}
        title="¿Eliminar registro de venta?"
        itemName={deletingSale ? `Venta a ${deletingSale.clientName} por $${deletingSale.amount.toLocaleString("es-AR")}` : undefined}
      />
    </>
  );
}
