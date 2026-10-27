"use client";

import { useState } from "react";
import { ApiErrorBanner, Modal } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { Customer, CustomerFields } from "@/lib/apiTypes";

const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-colors";
const badField = "!border-[#C0492F] ring-2 ring-[#C0492F]/20";
const label = "block text-xs font-semibold text-[#231E1A] mb-1.5";

const TEXT_KEYS = ["lastName", "dni", "phone", "email", "notes"] as const;

/** Create (customer null) or edit. Mount it only while open, so each opening starts from the customer's data. */
export default function CustomerFormModal({
  customer, onClose, onSaved,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSaved: (c: Customer) => void;
}) {
  const [form, setForm] = useState({
    firstName: customer?.firstName ?? "", lastName: customer?.lastName ?? "", dni: customer?.dni ?? "",
    phone: customer?.phone ?? "", email: customer?.email ?? "", notes: customer?.notes ?? "",
  });
  const setField = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const bad = (k: keyof typeof form) => (error instanceof ApiError && error.field === k ? badField : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstName = form.firstName.trim();
    if (!firstName || busy) return;

    let save: () => Promise<Customer>;
    if (!customer) {
      const body: CustomerFields = { firstName };
      for (const k of TEXT_KEYS) if (form[k].trim()) body[k] = form[k].trim();
      save = () => api.post<Customer>("/customers", body, { success: `Cliente "${firstName}" creado.` });
    } else {
      // PATCH: only changed keys; a cleared field goes as null (clears it).
      const body: CustomerFields = {};
      if (firstName !== customer.firstName) body.firstName = firstName;
      for (const k of TEXT_KEYS) {
        const v = form[k].trim();
        if (v !== (customer[k] ?? "")) body[k] = v || null;
      }
      if (Object.keys(body).length === 0) return onClose();
      save = () => api.patch<Customer>(`/customers/${customer.id}`, body, { success: `Datos de ${customer.fullName} actualizados.` });
    }

    setError(null);
    setBusy(true);
    try {
      onSaved(await save());
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={customer ? "Editar cliente" : "Nuevo cliente"}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Nombre <span className="text-[#C0492F]">*</span></label>
            <input type="text" maxLength={60} value={form.firstName} onChange={(e) => setField("firstName", e.target.value)}
              placeholder="Ej. Juan" className={`${inputCls} ${bad("firstName")}`} />
          </div>
          <div>
            <label className={label}>Apellido</label>
            <input type="text" maxLength={60} value={form.lastName} onChange={(e) => setField("lastName", e.target.value)}
              placeholder="Ej. Pérez" className={`${inputCls} ${bad("lastName")}`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>DNI</label>
            <input type="text" inputMode="numeric" maxLength={12} value={form.dni} onChange={(e) => setField("dni", e.target.value)}
              placeholder="30.123.456" className={`${inputCls} ${bad("dni")}`} />
          </div>
          <div>
            <label className={label}>Teléfono</label>
            <input type="tel" maxLength={30} value={form.phone} onChange={(e) => setField("phone", e.target.value)}
              placeholder="+54 11 1234-5678" className={`${inputCls} ${bad("phone")}`} />
          </div>
        </div>
        <div>
          <label className={label}>Email</label>
          <input type="email" maxLength={120} value={form.email} onChange={(e) => setField("email", e.target.value)}
            placeholder="cliente@ejemplo.com" className={`${inputCls} ${bad("email")}`} />
        </div>
        <div>
          <label className={label}>Notas</label>
          <textarea maxLength={2000} value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={3}
            className={`${inputCls} resize-none ${bad("notes")}`} />
        </div>
        {customer && <p className="text-[11px] text-[#A89C8C]">Dejar un campo vacío lo borra.</p>}
        <ApiErrorBanner error={error} />
        <div className="flex items-center justify-end gap-3 pt-3 mt-1 border-t border-[#F7F3EC]">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={busy || !form.firstName.trim()}
            className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer disabled:opacity-60">
            {busy ? "Guardando…" : customer ? "Guardar cambios" : "Crear cliente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
