"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { ApiErrorBanner, Modal, Pager } from "@/components/ui";
import { api } from "@/lib/api";
import { usePagedList } from "@/lib/useApi";
import type { Customer, CustomerFields } from "@/lib/apiTypes";

const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-colors";
const label = "block text-xs font-semibold text-[#231E1A] mb-1.5";

/** Search a customer, or register a new one, and hand it back. */
export default function CustomerPicker({ onPick, onClose }: { onPick: (c: Customer) => void; onClose: () => void }) {
  const [creating, setCreating] = useState(false);
  return (
    <Modal isOpen onClose={onClose} title={creating ? "Nuevo cliente" : "Asociar cliente a la venta"}>
      {creating ? <NewCustomerForm onCreated={onPick} onBack={() => setCreating(false)} /> : <SearchList onPick={onPick} onNew={() => setCreating(true)} />}
    </Modal>
  );
}

function SearchList({ onPick, onNew }: { onPick: (c: Customer) => void; onNew: () => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);
  const list = usePagedList<Customer>("/customers", { length: 10, search });

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-[#A89C8C] absolute left-3 pointer-events-none" />
        <input type="text" autoFocus maxLength={100} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, DNI, teléfono o email..." className={`${inputCls} pl-9`} />
      </div>

      <ApiErrorBanner error={list.error} onRetry={list.reload} />

      <div className="divide-y divide-[#F7F3EC] border border-[#E7DFD2] rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
        {list.items.map((c) => (
          <button key={c.id} type="button" onClick={() => onPick(c)}
            className="w-full text-left px-4 py-3 hover:bg-[#FBF8F2] cursor-pointer transition-colors flex flex-col">
            <span className="text-sm font-semibold text-[#231E1A]">{c.fullName}</span>
            <span className="text-[11px] text-[#A89C8C]">
              {[c.dni && `DNI ${c.dni}`, c.phone, c.email].filter(Boolean).join(" • ") || "Sin datos de contacto"}
            </span>
          </button>
        ))}
        {list.loading && <div className="p-4 text-xs text-[#A89C8C]">Buscando…</div>}
        {!list.loading && !list.error && list.items.length === 0 && (
          <div className="p-4 text-xs text-[#A89C8C]">No se encontraron clientes.</div>
        )}
      </div>

      <Pager flush hasPrev={list.hasPrev} hasNext={list.hasNext} onPrev={list.prev} onNext={list.next} total={list.total} loading={list.loading} />

      <button type="button" onClick={onNew}
        className="self-start text-xs text-[#9C5A2E] hover:underline flex items-center gap-1.5 font-semibold cursor-pointer">
        <UserPlus className="w-4 h-4" />
        <span>Registrar nuevo cliente</span>
      </button>
    </div>
  );
}

function NewCustomerForm({ onCreated, onBack }: { onCreated: (c: Customer) => void; onBack: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", dni: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: CustomerFields = { firstName: form.firstName.trim() };
    if (form.lastName.trim()) body.lastName = form.lastName.trim();
    if (form.dni.trim()) body.dni = form.dni.trim();
    if (form.phone.trim()) body.phone = form.phone.trim();
    setError(null);
    setBusy(true);
    try {
      onCreated(await api.post<Customer>("/customers", body));
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Nombre <span className="text-[#C0492F]">*</span></label>
          <input type="text" required autoFocus value={form.firstName} onChange={set("firstName")} className={inputCls} />
        </div>
        <div>
          <label className={label}>Apellido</label>
          <input type="text" value={form.lastName} onChange={set("lastName")} className={inputCls} />
        </div>
        <div>
          <label className={label}>DNI</label>
          <input type="text" value={form.dni} onChange={set("dni")} placeholder="30.123.456" className={inputCls} />
        </div>
        <div>
          <label className={label}>Teléfono</label>
          <input type="text" value={form.phone} onChange={set("phone")} className={inputCls} />
        </div>
      </div>

      <ApiErrorBanner error={error} />

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F7F3EC] text-xs">
        <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] cursor-pointer">
          Volver
        </button>
        <button type="submit" disabled={busy}
          className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] shadow-xs cursor-pointer disabled:opacity-60">
          {busy ? "Guardando…" : "Guardar y asociar"}
        </button>
      </div>
    </form>
  );
}
