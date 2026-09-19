"use client";

import Topbar from "@/components/layout/Topbar";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ReceiptText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";

export default function ConfigGastosPage() {
  const { expenseTypes, addExpenseType, deleteExpenseType, expenses } = useStore();
  const [newType, setNewType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingType, setDeletingType] = useState<string | null>(null);

  const handleAddExpenseType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.trim()) return;
    addExpenseType(newType.trim());
    setNewType("");
  };

  const filtered = expenseTypes.filter((t) =>
    t.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Topbar
        title="Configuración / Gastos"
        subtitle="Administración de categorías y tipos de gastos comerciales"
        onSearch={setSearchTerm}
      />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-5xl w-full">
        {/* Navigation Bar between Config Submenus */}
        <div className="flex items-center gap-2 bg-white border border-[#E7DFD2] p-1.5 rounded-xl shadow-2xs overflow-x-auto max-w-full">
          <Link
            href="/configuracion"
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
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
            Venta (Tipos)
          </Link>
          <Link
            href="/configuracion/gastos"
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#9C5A2E] text-white shadow-xs whitespace-nowrap"
          >
            Gastos (Tipos)
          </Link>
        </div>

        {/* Create Expense Type Form Card */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FBEFD9] text-[#D98A2B] flex items-center justify-center">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-heading font-bold text-base text-[#231E1A]">
                Crear nuevo tipo o rubro de gasto
              </h3>
              <p className="text-xs text-[#7A6F63]">
                Categorizá tus salidas de dinero (ej. Alquiler Taller, Insumos de Cuero, Fletes, Mantenimiento).
              </p>
            </div>
          </div>

          <form onSubmit={handleAddExpenseType} className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="text"
              required
              placeholder="Nombre del rubro (ej. Herramientas de Cincelado, Servicios Web...)"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="flex-1 bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-4 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white min-w-0"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-[#9C5A2E] text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar tipo de gasto</span>
            </button>
          </form>
        </div>

        {/* Expense Types List */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs overflow-hidden flex flex-col w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[480px]">
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center justify-between text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                <div className="flex-1 min-w-[150px]">RUBRO / TIPO DE GASTO</div>
                <div className="w-44 shrink-0 text-center">MOVIMIENTOS ASOCIADOS</div>
                <div className="w-20 shrink-0 text-center">ACCIONES</div>
              </div>

              <div className="divide-y divide-[#F7F3EC]">
                {filtered.length === 0 ? (
                  <div className="p-12 text-center text-[#7A6F63] text-sm">
                    No se encontraron tipos de gastos.
                  </div>
                ) : (
                  filtered.map((type, idx) => {
                    const count = expenses.filter((e) => e.category === type).length;
                    return (
                      <div
                        key={type}
                        className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                      >
                        <div className="flex-1 min-w-[150px] flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] flex items-center justify-center font-mono text-xs shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-[#231E1A] text-sm truncate">
                            {type}
                          </span>
                        </div>

                        <div className="w-44 shrink-0 text-center">
                          <span className="bg-[#FBEFD9] text-[#D98A2B] font-medium px-3 py-1 rounded-full text-xs whitespace-nowrap">
                            {count} {count === 1 ? "movimiento" : "movimientos"}
                          </span>
                        </div>

                        <div className="w-20 shrink-0 text-center">
                          <button
                            onClick={() => setDeletingType(type)}
                            title="Eliminar tipo de gasto"
                            className="text-[#A89C8C] hover:text-[#C0492F] p-1.5 rounded-lg hover:bg-[#F7E3DD]/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ConfirmDeleteModal
        isOpen={!!deletingType}
        onClose={() => setDeletingType(null)}
        onConfirm={() => {
          if (deletingType) {
            deleteExpenseType(deletingType);
          }
        }}
        title="¿Eliminar rubro de gasto?"
        itemName={deletingType || undefined}
        description={
          deletingType
            ? `¿Estás seguro de que deseas eliminar el tipo de gasto "${deletingType}"? Los gastos históricos registrados mantendrán su valor.`
            : undefined
        }
      />
    </>
  );
}
