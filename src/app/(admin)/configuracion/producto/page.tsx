"use client";

import Topbar from "@/components/layout/Topbar";
import { useEffect, useState } from "react";
import { Tag, Plus, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { ApiErrorBanner, ConfirmDeleteModal, Modal, Pager } from "@/components/ui";
import { api } from "@/lib/api";
import { usePagedList } from "@/lib/useApi";
import type { ProductCategory } from "@/lib/apiTypes";

export default function ConfigProductoPage() {
  const [newCat, setNewCat] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [deletingCat, setDeletingCat] = useState<ProductCategory | null>(null);
  const [editingCat, setEditingCat] = useState<ProductCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [writeError, setWriteError] = useState<unknown>(null); // create / delete (page level)
  const [editError, setEditError] = useState<unknown>(null); // rename (inside modal)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { items, total, loading, error, hasNext, hasPrev, next, prev, reload } =
    usePagedList<ProductCategory>("/product-categories", {
      sortBy: "name",
      sortDir: "asc",
      search: search || undefined,
    });

  // Runs a write; on success reload, on failure hand the error to onError.
  const write = async (fn: () => Promise<unknown>, onError: (e: unknown) => void, onDone?: () => void) => {
    setBusy(true);
    try {
      await fn();
      onDone?.();
      reload();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setWriteError(null);
    write(() => api.post("/product-categories", { name: newCat.trim() }), setWriteError, () => setNewCat(""));
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat) return;
    setEditError(null);
    write(
      () => api.patch(`/product-categories/${editingCat.id}`, { name: editName.trim() }),
      setEditError,
      () => setEditingCat(null),
    );
  };

  const handleDelete = () => {
    if (!deletingCat) return;
    setWriteError(null);
    write(() => api.del(`/product-categories/${deletingCat.id}`), setWriteError);
  };

  return (
    <>
      <Topbar
        title="Configuración / Producto"
        subtitle="Administración de categorías del catálogo de productos"
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
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#9C5A2E] text-white shadow-xs whitespace-nowrap"
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
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
          >
            Gastos (Tipos)
          </Link>
        </div>

        {/* Create Category Form Card */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-heading font-bold text-base text-[#231E1A]">
                Crear nueva categoría de producto
              </h3>
              <p className="text-xs text-[#7A6F63]">
                Las categorías se asociarán a los productos y estarán disponibles en filtros y creación de catálogo.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="text"
              required
              maxLength={100}
              placeholder="Nombre de la categoría (ej. Bombillones, Materas de Cuero, Cuencos...)"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              className="flex-1 bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-4 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white min-w-0"
            />
            <button
              type="submit"
              disabled={busy}
              className="flex items-center justify-center gap-2 bg-[#9C5A2E] text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar categoría</span>
            </button>
          </form>
          <ApiErrorBanner error={writeError} />
        </div>

        <ApiErrorBanner error={error} onRetry={reload} />

        {/* Categories List */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs overflow-hidden flex flex-col w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[480px]">
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center justify-between text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                <div className="flex-1 min-w-[150px]">CATEGORÍA DE PRODUCTO</div>
                <div className="w-44 shrink-0 text-center">PRODUCTOS ASOCIADOS</div>
                <div className="w-24 shrink-0 text-center">ACCIONES</div>
              </div>

              <div className="divide-y divide-[#F7F3EC]">
                {!loading && items.length === 0 ? (
                  <div className="p-12 text-center text-[#7A6F63] text-sm">
                    No se encontraron categorías.
                  </div>
                ) : (
                  items.map((cat, idx) => {
                    const count = cat.productCount;
                    return (
                      <div
                        key={cat.id}
                        className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                      >
                        <div className="flex-1 min-w-[150px] flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] flex items-center justify-center font-mono text-xs shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-[#231E1A] text-sm truncate">
                            {cat.name}
                          </span>
                        </div>

                        <div className="w-44 shrink-0 text-center">
                          <span className="bg-[#FBF8F2] border border-[#E7DFD2] px-3 py-1 rounded-full text-xs text-[#7A6F63] whitespace-nowrap">
                            {count} {count === 1 ? "producto" : "productos"}
                          </span>
                        </div>

                        <div className="w-24 shrink-0 text-center flex items-center justify-center">
                          <button
                            onClick={() => {
                              setEditingCat(cat);
                              setEditName(cat.name);
                              setEditError(null);
                            }}
                            title="Renombrar categoría"
                            className="text-[#A89C8C] hover:text-[#9C5A2E] p-1.5 rounded-lg hover:bg-[#FBF8F2] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => setDeletingCat(cat)}
                            title="Eliminar categoría"
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
          <Pager hasPrev={hasPrev} hasNext={hasNext} onPrev={prev} onNext={next} total={total} loading={loading} />
        </div>
      </main>

      <Modal isOpen={!!editingCat} onClose={() => setEditingCat(null)} title="Renombrar categoría" maxWidth="max-w-md">
        <form onSubmit={handleRename} className="p-6 flex flex-col gap-4">
          <input
            type="text"
            required
            maxLength={100}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-4 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
          />
          <ApiErrorBanner error={editError} />
          <div className="flex justify-end gap-3 text-xs">
            <button type="button" onClick={() => setEditingCat(null)} className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] cursor-pointer disabled:opacity-60">
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deletingCat}
        onClose={() => setDeletingCat(null)}
        onConfirm={handleDelete}
        isLoading={busy}
        title="¿Eliminar categoría de producto?"
        itemName={deletingCat?.name}
        description={
          deletingCat
            ? `¿Estás seguro de que deseas eliminar la categoría "${deletingCat.name}"? No estará disponible para nuevas asignaciones de producto.`
            : undefined
        }
      />
    </>
  );
}
