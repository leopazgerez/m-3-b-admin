"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, ConfirmDeleteModal, Modal, Pager } from "@/components/ui";
import FilterPanel from "@/components/ui/FilterPanel";
import { api } from "@/lib/api";
import { usePagedList } from "@/lib/useApi";
import { dateRangeCriteria, type Criterion } from "@/lib/apiQuery";
import { supplierTypeLabel } from "@/lib/labels";
import { formatDate as fmtDate } from "@/lib/dateUtils";
import type { Supplier, SupplierFields, SupplierType } from "@/lib/apiTypes";
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  Truck,
  Package,
  Eye,
  User,
  FileText,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const SUPPLIER_TYPES = Object.keys(supplierTypeLabel) as SupplierType[];

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

const avatarColors = [
  "bg-[#9C5A2E] text-[#F5EAD6]",
  "bg-[#2E6B42] text-[#EAF4EA]",
  "bg-[#2B4FA8] text-[#E8EEF8]",
  "bg-[#7A3F1F] text-[#F5EAD6]",
  "bg-[#1A6B8A] text-[#E8F3F8]",
  "bg-[#5B2D8A] text-[#F0EAF8]",
];

const getAvatarColor = (id: number) => avatarColors[id % avatarColors.length];

const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-colors";
const filterSelectCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer";

export default function ProveedoresPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [productsFilter, setProductsFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formActive, setFormActive] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filters: Criterion[] = [
    ...(typeFilter ? [{ field: "type", operator: "EQUALS" as const, value: typeFilter }] : []),
    ...(activeFilter ? [{ field: "active", operator: "EQUALS" as const, value: activeFilter === "true" }] : []),
    ...(productsFilter === "with" ? [{ field: "productCount", operator: "GREATER_THAN" as const, value: 0 }] : []),
    ...(productsFilter === "without" ? [{ field: "productCount", operator: "EQUALS" as const, value: 0 }] : []),
    ...dateRangeCriteria("lastActivityOn", dateFrom || undefined, dateTo || undefined),
  ];

  const { items, total, loading, error, hasNext, hasPrev, next, prev, reload } = usePagedList<Supplier>("/suppliers", {
    sortBy,
    sortDir,
    search: search || undefined,
    filters,
  });

  const activeFilterCount =
    (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (typeFilter ? 1 : 0) + (activeFilter ? 1 : 0) + (productsFilter ? 1 : 0);

  const handleResetFilters = () => {
    setDateFrom(""); setDateTo(""); setTypeFilter(""); setActiveFilter(""); setProductsFilter("");
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };

  const sortHeader = (field: string, label: string, className: string) => (
    <button
      key={field}
      type="button"
      onClick={() => toggleSort(field)}
      className={`${className} flex items-center gap-1 text-left font-semibold hover:text-[#9C5A2E] cursor-pointer`}
    >
      {label}
      {sortBy === field && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
    </button>
  );

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

  const resetForm = () => {
    setFormName(""); setFormType(""); setFormContact(""); setFormPhone(""); setFormEmail("");
    setFormCity(""); setFormCategory(""); setFormNotes(""); setFormActive(true);
  };

  const openCreate = () => { setEditingSupplier(null); resetForm(); setFormError(null); setIsModalOpen(true); };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormName(s.name); setFormType(s.type ?? ""); setFormContact(s.contactName ?? ""); setFormPhone(s.phone ?? "");
    setFormEmail(s.email ?? ""); setFormCity(s.city ?? ""); setFormCategory(s.category ?? "");
    setFormNotes(s.notes ?? ""); setFormActive(s.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); resetForm(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    if (!name) return;
    const text = {
      contactName: formContact.trim(), phone: formPhone.trim(), email: formEmail.trim(),
      city: formCity.trim(), category: formCategory.trim(), notes: formNotes.trim(),
    };
    setFormError(null);

    if (!editingSupplier) {
      const body: SupplierFields = { name, active: formActive };
      if (formType) body.type = formType as SupplierType;
      for (const [k, v] of Object.entries(text)) if (v) (body as Record<string, unknown>)[k] = v;
      return write(() => api.post("/suppliers", body, { success: `Proveedor "${name}" creado.` }), setFormError, closeModal);
    }

    // PATCH: only changed keys; a cleared field is sent as "" (null would keep it).
    const body: SupplierFields = {};
    if (name !== editingSupplier.name) body.name = name;
    if (formType && formType !== editingSupplier.type) body.type = formType as SupplierType;
    for (const [k, v] of Object.entries(text)) {
      if (v !== (editingSupplier[k as keyof typeof text] ?? "")) (body as Record<string, unknown>)[k] = v;
    }
    if (formActive !== editingSupplier.active) body.active = formActive;
    if (Object.keys(body).length === 0) return closeModal();
    write(() => api.patch(`/suppliers/${editingSupplier.id}`, body, { success: `Proveedor "${name}" actualizado.` }), setFormError, closeModal);
  };

  const handleDelete = () => {
    if (!deletingSupplier) return;
    setDeleteError(null);
    write(() => api.del(`/suppliers/${deletingSupplier.id}`, { success: `Proveedor "${deletingSupplier.name}" eliminado.` }), setDeleteError);
  };

  const th = "text-[11px] text-[#A89C8C] tracking-wide";

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Proveedores" subtitle="Gestión y contacto de proveedores" />

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex-1 min-w-0 max-w-3xl">
            <FilterPanel
              isOpen={isFilterOpen}
              onToggle={() => setIsFilterOpen(!isFilterOpen)}
              activeCount={activeFilterCount}
              onReset={handleResetFilters}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              dateLabel="Fecha de última operación"
              resultCount={total}
            >
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[#231E1A]">Tipo:</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={filterSelectCls}>
                  <option value="">Todos</option>
                  {SUPPLIER_TYPES.map((t) => <option key={t} value={t}>{supplierTypeLabel[t]}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[#231E1A]">Estado:</label>
                <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className={filterSelectCls}>
                  <option value="">Todos</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[#231E1A]">Artículos en catálogo:</label>
                <select value={productsFilter} onChange={(e) => setProductsFilter(e.target.value)} className={filterSelectCls}>
                  <option value="">Todos los proveedores</option>
                  <option value="with">Con productos asociados</option>
                  <option value="without">Sin productos en catálogo</option>
                </select>
              </div>
            </FilterPanel>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89C8C]" />
              <input
                type="text"
                maxLength={100}
                placeholder="Buscar por nombre, ciudad…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#E7DFD2] rounded-xl text-xs text-[#231E1A] placeholder-[#C9BCA9] outline-none focus:border-[#9C5A2E] transition-colors shadow-2xs"
              />
            </div>
            <button
              onClick={openCreate}
              disabled={busy}
              className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo</span>
            </button>
          </div>
        </div>

        <ApiErrorBanner error={error} onRetry={reload} />
        <ApiErrorBanner error={deleteError} />

        {/* List Table */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[1000px]">
              {/* Header */}
              <div className={`bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 border-b border-[#E7DFD2] ${th}`}>
                {sortHeader("name", "PROVEEDOR", "flex-1 min-w-[200px]")}
                {sortHeader("type", "TIPO", "w-24 shrink-0")}
                {sortHeader("contactName", "CONTACTO", "w-32 shrink-0")}
                <div className="w-36 shrink-0 font-semibold">TELÉFONO / EMAIL</div>
                {sortHeader("city", "CIUDAD", "w-28 shrink-0")}
                {sortHeader("category", "CATEGORÍA", "w-28 shrink-0")}
                {sortHeader("productCount", "PRODUCTOS", "w-24 shrink-0 justify-center")}
                {sortHeader("lastActivityOn", "ÚLT. OPERACIÓN", "w-28 shrink-0")}
                <div className="w-24 shrink-0 text-center font-semibold">ACCIONES</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#F7F3EC]">
                {!loading && !error && items.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EAD6] flex items-center justify-center mx-auto mb-3">
                      <Truck className="w-6 h-6 text-[#C9BCA9]" />
                    </div>
                    <p className="text-[#7A6A5A] text-sm font-medium">No se encontraron proveedores</p>
                    <p className="text-[#A89C8C] text-xs mt-1">
                      {search ? "Probá con otro término de búsqueda" : "Creá tu primer proveedor"}
                    </p>
                  </div>
                ) : (
                  items.map((s) => (
                    <div key={s.id} className="px-6 py-3.5 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors">
                      {/* Supplier identity */}
                      <div
                        onClick={() => setViewingSupplier(s)}
                        className="flex-1 min-w-[200px] flex items-center gap-3 cursor-pointer group"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform ${getAvatarColor(s.id)}`}>
                          {getInitials(s.name)}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-semibold text-[#231E1A] truncate text-sm group-hover:text-[#9C5A2E] transition-colors">
                            {s.name}
                            {!s.active && <span className="ml-2 text-[10px] font-medium text-[#A89C8C]">(inactivo)</span>}
                          </span>
                          {s.notes && <span className="text-[11px] text-[#A89C8C] truncate leading-snug">{s.notes}</span>}
                        </div>
                      </div>

                      <div className="w-24 shrink-0 text-[#7A6A5A] truncate">{s.type ? supplierTypeLabel[s.type] : "—"}</div>

                      {/* Contact name */}
                      <div className="w-32 shrink-0 text-[#7A6A5A] truncate">
                        {s.contactName ? (
                          <span className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-[#A89C8C] shrink-0" />
                            <span className="truncate">{s.contactName}</span>
                          </span>
                        ) : (
                          <span className="text-[#C9BCA9]">—</span>
                        )}
                      </div>

                      {/* Phone / Email */}
                      <div className="w-36 shrink-0 flex flex-col gap-0.5">
                        {s.phone && (
                          <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 text-[#7A6A5A] hover:text-[#9C5A2E] transition-colors truncate">
                            <Phone className="w-3 h-3 text-[#A89C8C] shrink-0" />
                            <span className="truncate text-[11px]">{s.phone}</span>
                          </a>
                        )}
                        {s.email && (
                          <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 text-[#7A6A5A] hover:text-[#9C5A2E] transition-colors truncate">
                            <Mail className="w-3 h-3 text-[#A89C8C] shrink-0" />
                            <span className="truncate text-[11px]">{s.email}</span>
                          </a>
                        )}
                        {!s.phone && !s.email && <span className="text-[#C9BCA9]">—</span>}
                      </div>

                      {/* City */}
                      <div className="w-28 shrink-0 text-[#7A6A5A] truncate">
                        {s.city ? (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-[#A89C8C] shrink-0" />
                            <span className="truncate">{s.city}</span>
                          </span>
                        ) : (
                          <span className="text-[#C9BCA9]">—</span>
                        )}
                      </div>

                      {/* Category */}
                      <div className="w-28 shrink-0">
                        {s.category ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-[#F0EDE8] text-[#5A5040] border-[#E7DFD2] truncate max-w-full">
                            {s.category}
                          </span>
                        ) : (
                          <span className="text-[#C9BCA9]">—</span>
                        )}
                      </div>

                      {/* Product count */}
                      <div className="w-24 shrink-0 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${
                          s.productCount > 0 ? "bg-[#F5EAD6] text-[#9C5A2E]" : "bg-[#F0EDE8] text-[#A89C8C]"
                        }`}>
                          <Package className="w-3 h-3" />
                          {s.productCount}
                        </span>
                      </div>

                      <div className="w-28 shrink-0 text-[#7A6A5A]">{fmtDate(s.lastActivityOn)}</div>

                      {/* Actions */}
                      <div className="w-24 shrink-0 flex items-center justify-center gap-1">
                        <button onClick={() => setViewingSupplier(s)} title="Ver detalle"
                          className="text-[#A89C8C] hover:text-[#231E1A] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 transition-colors cursor-pointer">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(s)} disabled={busy} title="Editar"
                          className="text-[#A89C8C] hover:text-[#9C5A2E] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 transition-colors cursor-pointer">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setDeleteError(null); setDeletingSupplier(s); }} disabled={busy} title="Eliminar"
                          className="text-[#A89C8C] hover:text-[#C0492F] p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <Pager hasPrev={hasPrev} hasNext={hasNext} onPrev={prev} onNext={next} total={total} loading={loading} />
        </div>
      </div>

      {/* Detail Modal */}
      {viewingSupplier && (
        <Modal isOpen onClose={() => setViewingSupplier(null)} title="Ficha del proveedor">
          <div className="flex flex-col gap-5 text-xs">
            <div className="flex items-start gap-3.5 bg-[#FBF8F2] p-4 rounded-2xl border border-[#E7DFD2]">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${getAvatarColor(viewingSupplier.id)}`}>
                {getInitials(viewingSupplier.name)}
              </div>
              <div className="flex flex-col min-w-0 flex-1 gap-1">
                <span className="font-heading font-bold text-base text-[#231E1A]">{viewingSupplier.name}</span>
                <span className="text-[#7A6A5A]">
                  {[viewingSupplier.type && supplierTypeLabel[viewingSupplier.type], viewingSupplier.category, viewingSupplier.active ? null : "Inactivo"]
                    .filter(Boolean).join(" · ") || "—"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Contacto", value: viewingSupplier.contactName, icon: User },
                { label: "Teléfono", value: viewingSupplier.phone, icon: Phone, href: viewingSupplier.phone ? `tel:${viewingSupplier.phone}` : undefined },
                { label: "Email", value: viewingSupplier.email, icon: Mail, href: viewingSupplier.email ? `mailto:${viewingSupplier.email}` : undefined },
                { label: "Ciudad", value: viewingSupplier.city, icon: MapPin },
              ].map(({ label, value, icon: Icon, href }) => (
                <div key={label} className="bg-white border border-[#E7DFD2] p-3 rounded-xl">
                  <span className="text-[10px] text-[#7A6F63] block uppercase tracking-wider mb-1">{label}</span>
                  {value ? (
                    href ? (
                      <a href={href} className="flex items-center gap-1.5 font-semibold text-[#231E1A] hover:text-[#9C5A2E] transition-colors">
                        <Icon className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                        <span className="truncate">{value}</span>
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 font-semibold text-[#231E1A]">
                        <Icon className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                        <span>{value}</span>
                      </span>
                    )
                  ) : (
                    <span className="text-[#C9BCA9]">Sin datos</span>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-[#F5EAD6]/50 border border-[#E7DFD2] rounded-xl p-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[#7A6A5A] font-medium">
                <Package className="w-4 h-4 text-[#9C5A2E]" />
                Productos asociados
              </span>
              <span className="font-bold text-[#9C5A2E] text-base">{viewingSupplier.productCount}</span>
            </div>
            <div className="flex items-center justify-between text-[#7A6A5A]">
              <span>Última operación</span>
              <span className="font-semibold">{fmtDate(viewingSupplier.lastActivityOn)}</span>
            </div>

            {viewingSupplier.notes && (
              <div className="bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl p-3">
                <span className="text-[10px] text-[#7A6F63] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Notas internas
                </span>
                <p className="text-[#5A5040] leading-relaxed">{viewingSupplier.notes}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1 border-t border-[#F7F3EC]">
              <button onClick={() => setViewingSupplier(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E7DFD2] text-sm text-[#7A6A5A] font-medium hover:bg-[#F5EAD6] transition-colors">
                Cerrar
              </button>
              <button onClick={() => { const s = viewingSupplier; setViewingSupplier(null); openEdit(s); }}
                className="flex-1 py-2.5 rounded-xl bg-[#9C5A2E] text-white text-sm font-semibold hover:bg-[#7A3F1F] transition-colors">
                Editar proveedor
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingSupplier ? "Editar proveedor" : "Nuevo proveedor"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">
              Nombre del proveedor <span className="text-[#C0492F]">*</span>
            </label>
            <input required type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
              placeholder="Ej. Taller Artesanal Salta" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">Tipo</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)} className={inputCls}>
                <option value="">Sin tipo</option>
                {SUPPLIER_TYPES.map((t) => <option key={t} value={t}>{supplierTypeLabel[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">Categoría</label>
              <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                placeholder="Ej. Yerba mate" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">Persona de contacto</label>
              <input type="text" value={formContact} onChange={(e) => setFormContact(e.target.value)}
                placeholder="Nombre y apellido" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">Teléfono</label>
              <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+54 11 1234-5678" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">Email</label>
              <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                placeholder="proveedor@ejemplo.com" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">Ciudad / Localidad</label>
              <input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)}
                placeholder="Ej. Salta, Salta" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">Notas internas</label>
            <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Condiciones de pago, frecuencia de entrega, observaciones…" rows={3}
              className={`${inputCls} resize-none`} />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#231E1A] cursor-pointer">
            <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
            Proveedor activo
          </label>
          <ApiErrorBanner error={formError} />
          <div className="flex items-center justify-end gap-3 pt-3 mt-1 border-t border-[#F7F3EC]">
            <button type="button" onClick={closeModal}
              className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={busy}
              className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer disabled:opacity-60">
              {editingSupplier ? "Guardar cambios" : "Crear proveedor"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={handleDelete}
        isLoading={busy}
        title="¿Eliminar proveedor?"
        description={`Estás por eliminar a "${deletingSupplier?.name}". Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
