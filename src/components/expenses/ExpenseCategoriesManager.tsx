"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tag, Plus, Pencil, Trash2, ReceiptText, ArrowRight } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, ConfirmDeleteModal, Modal, Pager } from "@/components/ui";
import { api } from "@/lib/api";
import { usePagedList } from "@/lib/useApi";
import type { CategoryFields, ExpenseCategory } from "@/lib/apiTypes";

const inputCls =
  "bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-4 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white min-w-0";
const iconBtn = "p-1.5 rounded-lg hover:bg-[#FBF8F2] transition-colors cursor-pointer disabled:opacity-60";
const tab =
  "px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap";

type Editing = "new" | ExpenseCategory | null;

export default function ExpenseCategoriesManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<ExpenseCategory | null>(null);
  const [formError, setFormError] = useState<unknown>(null); // inside the open modal
  const [deleteError, setDeleteError] = useState<unknown>(null); // above the list

  const [fName, setFName] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fBusiness, setFBusiness] = useState(true);
  const [fCapex, setFCapex] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const list = usePagedList<ExpenseCategory>("/expense-categories", {
    sortBy: "name",
    sortDir: "asc",
    search: search || undefined,
  });

  const write = async (fn: () => Promise<unknown>, onError: (e: unknown) => void, onDone: () => void) => {
    setBusy(true);
    try {
      await fn();
      onDone();
      list.reload();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const open = (c: Editing) => {
    setFormError(null);
    setFName(c && c !== "new" ? c.name : "");
    setFDescription(c && c !== "new" ? (c.description ?? "") : "");
    setFBusiness(c && c !== "new" ? c.isBusiness : true);
    setFCapex(c && c !== "new" ? c.isCapex : false);
    setEditing(c);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const cur = editing === "new" ? null : editing;
    const desc = fDescription.trim();
    const body: CategoryFields = {};
    if (!cur || fName.trim() !== cur.name) body.name = fName.trim();
    if (!cur) {
      if (desc) body.description = desc;
    } else if (desc !== (cur.description ?? "")) {
      body.description = desc || null; // null clears it
    }
    if (!cur || fBusiness !== cur.isBusiness) body.isBusiness = fBusiness;
    if (!cur || fCapex !== cur.isCapex) body.isCapex = fCapex;
    if (cur && Object.keys(body).length === 0) return setEditing(null);
    setFormError(null);
    write(
      () => (cur ? api.patch(`/expense-categories/${cur.id}`, body) : api.post("/expense-categories", body)),
      setFormError,
      () => setEditing(null),
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    setDeleteError(null);
    write(() => api.del(`/expense-categories/${deleting.id}`), setDeleteError, () => setDeleting(null));
  };

  return (
    <>
      <Topbar
        title="Configuración / Gastos"
        subtitle="Administración de categorías de gasto"
        onSearch={setSearchTerm}
      />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-6xl w-full">
        <div className="flex items-center gap-2 bg-white border border-[#E7DFD2] p-1.5 rounded-xl shadow-2xs overflow-x-auto max-w-full">
          <Link href="/configuracion" className={tab}>General</Link>
          <Link href="/configuracion/producto" className={tab}>Producto (Categorías)</Link>
          <Link href="/configuracion/venta" className={tab}>Cobros</Link>
          <Link
            href="/configuracion/gastos"
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#9C5A2E] text-white shadow-xs whitespace-nowrap"
          >
            Gastos (Categorías)
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7DFD2] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#FBEFD9] text-[#D98A2B] flex items-center justify-center shrink-0">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-[#231E1A]">Categorías de Gastos</h3>
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
              disabled={busy}
              onClick={() => open("new")}
              className="flex items-center gap-2 bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva categoría</span>
            </button>
          </div>
        </div>

        <ApiErrorBanner error={deleteError} />

        <div className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs overflow-hidden flex flex-col w-full min-w-0">
          <ApiErrorBanner error={list.error} onRetry={list.reload} />
          <div className="overflow-x-auto w-full">
            <div className="min-w-[780px]">
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                <div className="w-56 shrink-0">CATEGORÍA / RUBRO</div>
                <div className="flex-1 min-w-[260px]">QUÉ REPRESENTA (DESCRIPCIÓN)</div>
                <div className="w-44 shrink-0 text-center">MOVIMIENTOS ASOCIADOS</div>
                <div className="w-24 shrink-0 text-center">ACCIONES</div>
              </div>
              <div className="divide-y divide-[#F7F3EC]">
                {!list.loading && !list.error && list.items.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EAD6] flex items-center justify-center mx-auto mb-3 text-[#9C5A2E]">
                      <Tag className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-[#231E1A]">No se encontraron categorías de gastos</p>
                    <p className="text-xs text-[#7A6F63] mt-1">
                      {search ? `No hay coincidencias con "${search}".` : "Creá tu primera categoría para organizar los gastos."}
                    </p>
                  </div>
                ) : (
                  list.items.map((cat) => (
                    <div key={cat.id} className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors">
                      <div className="w-56 shrink-0 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs bg-[#9C5A2E] text-white">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-[#231E1A] text-sm truncate">{cat.name}</span>
                          <span className="text-[10px] text-[#A89C8C]">
                            {cat.isBusiness ? "Del negocio" : "Personal"}
                            {cat.isCapex ? " · Inversión" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-[260px] text-[#5A5040] text-xs leading-relaxed pr-4">
                        {cat.description || <span className="text-[#A89C8C] italic">Sin descripción registrada</span>}
                      </div>
                      <div className="w-44 shrink-0 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-[#F5EAD6] text-[#7A3F1F] border-[#E7DFD2]">
                          <span className="font-bold">{cat.expenseCount}</span>
                          <span>{cat.expenseCount === 1 ? "gasto" : "gastos"}</span>
                        </span>
                      </div>
                      <div className="w-24 shrink-0 flex items-center justify-center">
                        <button disabled={busy} onClick={() => open(cat)} title="Modificar categoría" className={`${iconBtn} text-[#7A6F63] hover:text-[#9C5A2E]`}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button disabled={busy} onClick={() => setDeleting(cat)} title="Eliminar categoría" className={`${iconBtn} text-[#A89C8C] hover:text-[#C0492F]`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <Pager hasPrev={list.hasPrev} hasNext={list.hasNext} onPrev={list.prev} onNext={list.next} total={list.total} loading={list.loading} />
        </div>
      </main>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Crear nueva categoría de gasto" : "Modificar categoría de gasto"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={save} className="p-6 flex flex-col gap-4 text-xs">
          <label className="flex flex-col gap-1 text-[#7A6F63]">
            Nombre de la categoría
            <input type="text" required autoFocus maxLength={100} value={fName} onChange={(e) => setFName(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-[#7A6F63]">
            Descripción (opcional)
            <textarea rows={3} value={fDescription} onChange={(e) => setFDescription(e.target.value)} className={`${inputCls} resize-none leading-relaxed`} />
          </label>
          <label className="flex items-center gap-2 text-[#231E1A]">
            <input type="checkbox" checked={fBusiness} onChange={(e) => setFBusiness(e.target.checked)} />
            Gasto del negocio
          </label>
          <label className="flex items-center gap-2 text-[#231E1A]">
            <input type="checkbox" checked={fCapex} onChange={(e) => setFCapex(e.target.checked)} />
            Inversión (CAPEX)
          </label>
          <ApiErrorBanner error={formError} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] cursor-pointer disabled:opacity-60">
              {editing === "new" ? "Crear categoría" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        isLoading={busy}
        title="¿Eliminar categoría de gasto?"
        itemName={deleting?.name}
        description={deleting ? `¿Estás seguro de que deseas eliminar "${deleting.name}"?` : undefined}
      />
    </>
  );
}
