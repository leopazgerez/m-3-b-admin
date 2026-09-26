"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Modal from "@/components/ui/Modal";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { useStore } from "@/lib/store";
import { ExpenseCategory } from "@/lib/types";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Search,
  Package,
  Truck,
  Building2,
  Boxes,
  Cpu,
  ReceiptText,
  Layers,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const categoryIconMap: Record<string, typeof Tag> = {
  Equipamiento: Cpu,
  "Insumos/packaging": Boxes,
  Mercaderia: Package,
  Logistica: Truck,
  "Gastos propios": Building2,
};

const categoryBadgeMap: Record<
  string,
  { bg: string; text: string; border: string; iconBg: string }
> = {
  Equipamiento: {
    bg: "bg-[#EAE8F5]",
    text: "text-[#4B3F8A]",
    border: "border-[#C9C2EB]",
    iconBg: "bg-[#5D4EAE] text-white",
  },
  "Insumos/packaging": {
    bg: "bg-[#FDF3E7]",
    text: "text-[#A8581B]",
    border: "border-[#F3D1AE]",
    iconBg: "bg-[#D9772B] text-white",
  },
  Mercaderia: {
    bg: "bg-[#EBF5EE]",
    text: "text-[#286B3E]",
    border: "border-[#B8DEC3]",
    iconBg: "bg-[#2E7D47] text-white",
  },
  Logistica: {
    bg: "bg-[#EBF2F8]",
    text: "text-[#245D8C]",
    border: "border-[#B6D4EB]",
    iconBg: "bg-[#2B6EA3] text-white",
  },
  "Gastos propios": {
    bg: "bg-[#F6EEF5]",
    text: "text-[#7B326B]",
    border: "border-[#E7BEDF]",
    iconBg: "bg-[#8D3B7B] text-white",
  },
};

const defaultBadge = {
  bg: "bg-[#F5EAD6]",
  text: "text-[#7A3F1F]",
  border: "border-[#E7DFD2]",
  iconBg: "bg-[#9C5A2E] text-white",
};

export default function ConfigGastosPage() {
  const {
    expenseCategories,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    expenses,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ExpenseCategory | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setEditingCategory(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (cat: ExpenseCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingCategory) {
      updateExpenseCategory(editingCategory.id, {
        name: formName.trim(),
        description: formDescription.trim(),
      });
    } else {
      addExpenseCategory({
        name: formName.trim(),
        description: formDescription.trim(),
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const filteredCategories = expenseCategories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Topbar
        title="Configuración / Gastos"
        subtitle="Administración de categorías y rubros comerciales para egresos e ingresos"
        onSearch={setSearchTerm}
      />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-6xl w-full">
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
            Gastos (Categorías)
          </Link>
        </div>

        {/* Action Header Card */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#FBEFD9] text-[#D98A2B] flex items-center justify-center shrink-0">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-heading font-bold text-base text-[#231E1A]">
                  Categorías de Gastos
                </h3>
                <span className="text-xs bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] font-semibold px-2.5 py-0.5 rounded-full">
                  {expenseCategories.length} rubros activos
                </span>
              </div>
              <p className="text-xs text-[#7A6F63] mt-0.5">
                Clasificá tus compras, servicios e insumos con nombre y descripción de lo que representa cada rubro.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/gastos"
              className="text-xs font-medium text-[#7A6F63] hover:text-[#9C5A2E] px-3 py-2 rounded-xl hover:bg-[#FBF8F2] transition-colors flex items-center gap-1.5"
            >
              <span>Ver todos los gastos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva categoría</span>
            </button>
          </div>
        </div>

        {/* Categorías Table List (Maintains project essence: purely table list, NOT cards) */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs overflow-hidden flex flex-col w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[780px]">
              {/* Table Header */}
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                <div className="w-56 shrink-0">CATEGORÍA / RUBRO</div>
                <div className="flex-1 min-w-[260px]">QUÉ REPRESENTA (DESCRIPCIÓN)</div>
                <div className="w-44 shrink-0 text-center">MOVIMIENTOS ASOCIADOS</div>
                <div className="w-24 shrink-0 text-center">ACCIONES</div>
              </div>

              {/* Table Body Rows */}
              <div className="divide-y divide-[#F7F3EC]">
                {filteredCategories.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EAD6] flex items-center justify-center mx-auto mb-3 text-[#9C5A2E]">
                      <Tag className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-[#231E1A]">
                      No se encontraron categorías de gastos
                    </p>
                    <p className="text-xs text-[#7A6F63] mt-1">
                      {searchTerm
                        ? `No hay coincidencias con "${searchTerm}".`
                        : "Creá tu primera categoría para organizar los gastos."}
                    </p>
                  </div>
                ) : (
                  filteredCategories.map((cat, idx) => {
                    const count = expenses.filter((e) => e.category === cat.name).length;
                    const IconComp = categoryIconMap[cat.name] || Tag;
                    const badgeStyle = categoryBadgeMap[cat.name] || defaultBadge;

                    return (
                      <div
                        key={cat.id}
                        className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                      >
                        {/* Name and Icon */}
                        <div className="w-56 shrink-0 flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${badgeStyle.iconBg}`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[#231E1A] text-sm truncate">
                              {cat.name}
                            </span>
                            <span className="text-[10px] text-[#A89C8C] font-mono">
                              #{idx + 1}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="flex-1 min-w-[260px] text-[#5A5040] text-xs leading-relaxed pr-4">
                          {cat.description || (
                            <span className="text-[#A89C8C] italic">
                              Sin descripción registrada
                            </span>
                          )}
                        </div>

                        {/* Associated Movements Badge */}
                        <div className="w-44 shrink-0 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                          >
                            <span className="font-bold">{count}</span>
                            <span>{count === 1 ? "movimiento" : "movimientos"}</span>
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="w-24 shrink-0 flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(cat)}
                            title="Modificar categoría"
                            className="text-[#7A6F63] hover:text-[#9C5A2E] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingCategory(cat)}
                            title="Eliminar categoría"
                            className="text-[#A89C8C] hover:text-[#C0492F] p-1.5 rounded-lg hover:bg-[#F7E3DD]/50 transition-colors cursor-pointer"
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

      {/* Modal: Crear / Editar Categoría */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingCategory
            ? "Modificar categoría de gasto"
            : "Crear nueva categoría de gasto"
        }
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div>
            <label className="font-semibold text-[#231E1A] block mb-1.5">
              Nombre de la categoría <span className="text-[#C0492F]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej. Equipamiento, Insumos/packaging, Mercaderia..."
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white font-medium"
            />
          </div>

          <div>
            <label className="font-semibold text-[#231E1A] block mb-1.5">
              Descripción de lo que representa <span className="text-[#C0492F]">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Explicá detalladamente qué tipos de gastos, compras o salidas de dinero se registran bajo esta categoría..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl p-3.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white resize-none leading-relaxed"
            />
            <span className="text-[11px] text-[#A89C8C] mt-1 block">
              Esta descripción servirá como guía para todo el equipo al imputar egresos en el sistema.
            </span>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3.5 bg-white/95 backdrop-blur-xs border-t border-[#F7F3EC] flex items-center justify-end gap-3 z-10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#9C5A2E] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer text-xs flex items-center gap-1.5"
            >
              {editingCategory ? "Guardar cambios" : "Crear categoría"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={() => {
          if (deletingCategory) {
            deleteExpenseCategory(deletingCategory.id);
            setDeletingCategory(null);
          }
        }}
        title="¿Eliminar categoría de gasto?"
        itemName={deletingCategory?.name}
        description={
          deletingCategory
            ? `¿Estás seguro de que deseas eliminar "${deletingCategory.name}"? Los movimientos de gastos históricos que tengan asignado este rubro mantendrán su registro.`
            : undefined
        }
      />
    </>
  );
}
