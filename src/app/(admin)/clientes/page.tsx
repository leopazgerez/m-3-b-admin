"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, ConfirmDeleteModal, Modal, Pager } from "@/components/ui";
import FilterPanel from "@/components/ui/FilterPanel";
import { api } from "@/lib/api";
import { usePagedList } from "@/lib/useApi";
import { instantRangeCriteria, type Criterion } from "@/lib/apiQuery";
import { money } from "@/lib/format";
import { formatInstant } from "@/lib/dateUtils";
import type { Customer, CustomerFields } from "@/lib/apiTypes";
import { Mail, Phone, UserCheck, Users, Plus, Search, Edit2, Trash2, ArrowUp, ArrowDown } from "lucide-react";

const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-colors";
const filterSelectCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer";

const getInitials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const TEXT_KEYS = ["lastName", "dni", "phone", "email", "notes"] as const;

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("fullName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [debtFilter, setDebtFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const [form, setForm] = useState({ firstName: "", lastName: "", dni: "", phone: "", email: "", notes: "" });
  const setField = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filters: Criterion[] = [
    ...(debtFilter === "debt" ? [{ field: "outstanding", operator: "GREATER_THAN" as const, value: 0 }] : []),
    ...instantRangeCriteria("lastPurchaseAt", dateFrom || undefined, dateTo || undefined),
  ];

  const { items, total, loading, error, hasNext, hasPrev, next, prev, reload } = usePagedList<Customer>("/customers", {
    sortBy,
    sortDir,
    search: search || undefined,
    filters,
  });

  const activeFilterCount = (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (debtFilter ? 1 : 0);
  const handleResetFilters = () => { setDateFrom(""); setDateTo(""); setDebtFilter(""); };

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

  const resetForm = () => setForm({ firstName: "", lastName: "", dni: "", phone: "", email: "", notes: "" });
  const openCreate = () => { setEditing(null); resetForm(); setFormError(null); setIsModalOpen(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      firstName: c.firstName, lastName: c.lastName ?? "", dni: c.dni ?? "", phone: c.phone ?? "",
      email: c.email ?? "", notes: c.notes ?? "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); resetForm(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const firstName = form.firstName.trim();
    if (!firstName) return;
    setFormError(null);

    if (!editing) {
      const body: CustomerFields = { firstName };
      for (const k of TEXT_KEYS) if (form[k].trim()) body[k] = form[k].trim();
      return write(() => api.post("/customers", body), setFormError, closeModal);
    }

    // PATCH: only changed keys; a cleared field goes as null (clears it).
    const body: CustomerFields = {};
    if (firstName !== editing.firstName) body.firstName = firstName;
    for (const k of TEXT_KEYS) {
      const v = form[k].trim();
      if (v !== (editing[k] ?? "")) body[k] = v || null;
    }
    if (Object.keys(body).length === 0) return closeModal();
    write(() => api.patch(`/customers/${editing.id}`, body), setFormError, closeModal);
  };

  const handleDelete = () => {
    if (!deleting) return;
    setDeleteError(null);
    write(() => api.del(`/customers/${deleting.id}`), setDeleteError);
  };

  const th = "text-[11px] text-[#A89C8C] tracking-wide";
  const label = "block text-xs font-semibold text-[#231E1A] mb-1.5";

  return (
    <>
      <Topbar title="Clientes" subtitle="Directorio y fidelización de compradores" />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
              dateLabel="Última compra"
              resultCount={total}
            >
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[#231E1A] flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#9C5A2E]" />
                  <span>Deuda:</span>
                </label>
                <select value={debtFilter} onChange={(e) => setDebtFilter(e.target.value)} className={filterSelectCls}>
                  <option value="">Todos los clientes</option>
                  <option value="debt">Con deuda</option>
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
                placeholder="Buscar por nombre, DNI, teléfono…"
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

        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[1100px]">
              <div className={`bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 border-b border-[#E7DFD2] ${th}`}>
                {sortHeader("fullName", "CLIENTE", "flex-1 min-w-[200px]")}
                <div className="w-52 shrink-0 font-semibold">EMAIL / TELÉFONO</div>
                {sortHeader("orderCount", "PEDIDOS", "w-20 shrink-0 justify-center")}
                {sortHeader("totalPurchased", "COMPRADO", "w-28 shrink-0 justify-end")}
                {sortHeader("totalPaid", "PAGADO", "w-28 shrink-0 justify-end")}
                {sortHeader("outstanding", "DEUDA", "w-28 shrink-0 justify-end")}
                {sortHeader("lastPurchaseAt", "ÚLT. COMPRA", "w-36 shrink-0")}
                <div className="w-20 shrink-0 text-center font-semibold">ACCIONES</div>
              </div>

              <div className="divide-y divide-[#F7F3EC]">
                {!loading && !error && items.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EAD6] flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-[#C9BCA9]" />
                    </div>
                    <p className="text-[#7A6A5A] text-sm font-medium">No se encontraron clientes</p>
                    <p className="text-[#A89C8C] text-xs mt-1">
                      {search ? "Probá con otro término de búsqueda" : "Creá tu primer cliente"}
                    </p>
                  </div>
                ) : (
                  items.map((c) => (
                    <div key={c.id} className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors">
                      <Link
                        href={`/clientes/detalle?id=${c.id}`}
                        className="flex-1 min-w-[200px] flex items-center gap-3 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center font-bold text-sm shrink-0">
                          {getInitials(c.fullName)}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-[#231E1A] text-sm truncate group-hover:text-[#9C5A2E] transition-colors">
                            {c.fullName}
                          </span>
                          {c.dni && (
                            <span className="text-[10px] bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] px-1.5 py-0.5 rounded font-mono shrink-0">
                              DNI {c.dni}
                            </span>
                          )}
                        </div>
                      </Link>

                      <div className="w-52 shrink-0 text-[#7A6F63] flex flex-col gap-0.5 min-w-0">
                        <span className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-[#A89C8C] shrink-0" />
                          <span className="truncate">{c.email ?? "—"}</span>
                        </span>
                        <span className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3 h-3 text-[#A89C8C] shrink-0" />
                          <span>{c.phone ?? "—"}</span>
                        </span>
                      </div>

                      <div className="w-20 shrink-0 text-center font-medium text-[#231E1A]">{c.orderCount}</div>
                      <div className="w-28 shrink-0 text-right text-[#231E1A]">{money(c.totalPurchased)}</div>
                      <div className="w-28 shrink-0 text-right text-[#231E1A]">{money(c.totalPaid)}</div>
                      <div className={`w-28 shrink-0 text-right font-bold ${c.outstanding > 0 ? "text-[#C0492F]" : "text-[#231E1A]"}`}>
                        {money(c.outstanding)}
                      </div>
                      <div className="w-36 shrink-0 text-[#7A6A5A]">
                        {c.lastPurchaseAt ? formatInstant(c.lastPurchaseAt) : "Sin compras"}
                      </div>

                      <div className="w-20 shrink-0 flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(c)} disabled={busy} aria-label="Editar"
                          className="p-1.5 rounded-lg text-[#7A6A5A] hover:bg-[#F5EAD6] cursor-pointer disabled:opacity-60">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setDeleteError(null); setDeleting(c); }} disabled={busy} aria-label="Eliminar"
                          className="p-1.5 rounded-lg text-[#C0492F] hover:bg-[#FBEAE5] cursor-pointer disabled:opacity-60">
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
      </main>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editing ? "Editar cliente" : "Nuevo cliente"}>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Nombre <span className="text-[#C0492F]">*</span></label>
              <input type="text" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)}
                placeholder="Ej. Juan" className={inputCls} />
            </div>
            <div>
              <label className={label}>Apellido</label>
              <input type="text" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)}
                placeholder="Ej. Pérez" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>DNI</label>
              <input type="text" value={form.dni} onChange={(e) => setField("dni", e.target.value)}
                placeholder="30.123.456" className={inputCls} />
            </div>
            <div>
              <label className={label}>Teléfono</label>
              <input type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)}
                placeholder="+54 11 1234-5678" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={label}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)}
              placeholder="cliente@ejemplo.com" className={inputCls} />
          </div>
          <div>
            <label className={label}>Notas</label>
            <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={3}
              className={`${inputCls} resize-none`} />
          </div>
          <ApiErrorBanner error={formError} />
          <div className="flex items-center justify-end gap-3 pt-3 mt-1 border-t border-[#F7F3EC]">
            <button type="button" onClick={closeModal}
              className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={busy || !form.firstName.trim()}
              className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer disabled:opacity-60">
              {editing ? "Guardar cambios" : "Crear cliente"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        isLoading={busy}
        title="¿Eliminar cliente?"
        description={`Estás por eliminar a "${deleting?.fullName}". Esta acción no se puede deshacer.`}
      />
    </>
  );
}
