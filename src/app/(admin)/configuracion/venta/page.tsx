"use client";

import Topbar from "@/components/layout/Topbar";
import { useEffect, useState } from "react";
import { CreditCard, Landmark, Plus, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { ApiErrorBanner, ConfirmDeleteModal, Modal, Pager } from "@/components/ui";
import { api } from "@/lib/api";
import { usePagedList, useOptions } from "@/lib/useApi";
import { accountTypeLabel } from "@/lib/labels";
import type { AccountType, FinancialAccount, FinancialAccountFields, PaymentMethod, PaymentMethodFields } from "@/lib/apiTypes";

const inputCls =
  "bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-4 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white min-w-0";
const iconBtn = "p-1.5 rounded-lg hover:bg-[#FBF8F2] transition-colors cursor-pointer disabled:opacity-60";
const primaryBtn =
  "flex items-center justify-center gap-2 bg-[#9C5A2E] text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-60";

type Editing<T> = "new" | T | null;

export default function ConfigVentaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const [editMethod, setEditMethod] = useState<Editing<PaymentMethod>>(null);
  const [editAccount, setEditAccount] = useState<Editing<FinancialAccount>>(null);
  const [delMethod, setDelMethod] = useState<PaymentMethod | null>(null);
  const [delAccount, setDelAccount] = useState<FinancialAccount | null>(null);
  const [formError, setFormError] = useState<unknown>(null); // inside the open modal
  const [deleteError, setDeleteError] = useState<unknown>(null); // above the lists

  // form fields
  const [mName, setMName] = useState("");
  const [mPct, setMPct] = useState("0");
  const [mAccount, setMAccount] = useState("");
  const [aName, setAName] = useState("");
  const [aType, setAType] = useState<AccountType>("CASH");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const query = { sortBy: "name", sortDir: "asc" as const, search: search || undefined };
  const methods = usePagedList<PaymentMethod>("/payment-methods", query);
  const accounts = usePagedList<FinancialAccount>("/financial-accounts", query);
  const accountOptions = useOptions<FinancialAccount>("/financial-accounts", { sortBy: "name", sortDir: "asc" });

  const write = async (fn: () => Promise<unknown>, onError: (e: unknown) => void, onDone: () => void, reloads: (() => void)[]) => {
    setBusy(true);
    try {
      await fn();
      onDone();
      reloads.forEach((r) => r());
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const reloadAccounts = () => {
    accounts.reload();
    accountOptions.reload();
    methods.reload(); // defaultAccountName may have changed
  };

  const openMethod = (m: Editing<PaymentMethod>) => {
    setFormError(null);
    setMName(m && m !== "new" ? m.name : "");
    setMPct(m && m !== "new" ? String(m.surchargePct) : "0");
    setMAccount(m && m !== "new" && m.defaultAccountId != null ? String(m.defaultAccountId) : "");
    setEditMethod(m);
  };
  const openAccount = (a: Editing<FinancialAccount>) => {
    setFormError(null);
    setAName(a && a !== "new" ? a.name : "");
    setAType(a && a !== "new" ? a.type : "CASH");
    setEditAccount(a);
  };

  const saveMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMethod) return;
    const cur = editMethod === "new" ? null : editMethod;
    const body: PaymentMethodFields = {};
    if (!cur || mName.trim() !== cur.name) body.name = mName.trim();
    if (!cur || Number(mPct) !== cur.surchargePct) body.surchargePct = Number(mPct);
    if (!cur || Number(mAccount) !== cur.defaultAccountId) body.defaultAccountId = Number(mAccount);
    if (cur && Object.keys(body).length === 0) return setEditMethod(null);
    setFormError(null);
    write(
      () => (cur ? api.patch(`/payment-methods/${cur.id}`, body) : api.post("/payment-methods", body)),
      setFormError,
      () => setEditMethod(null),
      [methods.reload],
    );
  };

  const saveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAccount) return;
    const cur = editAccount === "new" ? null : editAccount;
    const body: FinancialAccountFields = {};
    if (!cur || aName.trim() !== cur.name) body.name = aName.trim();
    if (!cur || aType !== cur.type) body.type = aType;
    if (cur && Object.keys(body).length === 0) return setEditAccount(null);
    setFormError(null);
    write(
      () => (cur ? api.patch(`/financial-accounts/${cur.id}`, body) : api.post("/financial-accounts", body)),
      setFormError,
      () => setEditAccount(null),
      [reloadAccounts],
    );
  };

  const confirmDeleteMethod = () => {
    if (!delMethod) return;
    setDeleteError(null);
    write(() => api.del(`/payment-methods/${delMethod.id}`), setDeleteError, () => setDelMethod(null), [methods.reload]);
  };
  const confirmDeleteAccount = () => {
    if (!delAccount) return;
    setDeleteError(null);
    write(() => api.del(`/financial-accounts/${delAccount.id}`), setDeleteError, () => setDelAccount(null), [reloadAccounts]);
  };

  const tab = "px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap";

  return (
    <>
      <Topbar
        title="Configuración / Cobros"
        subtitle="Medios de pago y cuentas financieras"
        onSearch={setSearchTerm}
      />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-5xl w-full">
        <div className="flex items-center gap-2 bg-white border border-[#E7DFD2] p-1.5 rounded-xl shadow-2xs overflow-x-auto max-w-full">
          <Link href="/configuracion" className={tab}>General</Link>
          <Link href="/configuracion/producto" className={tab}>Producto (Categorías)</Link>
          <Link
            href="/configuracion/venta"
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#9C5A2E] text-white shadow-xs whitespace-nowrap"
          >
            Cobros
          </Link>
          <Link href="/configuracion/gastos" className={tab}>Gastos (Categorías)</Link>
        </div>

        <ApiErrorBanner error={deleteError} />

        {/* Payment methods */}
        <section className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs overflow-hidden flex flex-col w-full min-w-0">
          <div className="p-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E3F1E8] text-[#3E8E5A] flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-heading font-bold text-base text-[#231E1A]">Medios de pago</h3>
                <p className="text-xs text-[#7A6F63]">Recargo y cuenta donde se acredita cada medio.</p>
              </div>
            </div>
            <button disabled={busy} onClick={() => openMethod("new")} className={primaryBtn}>
              <Plus className="w-4 h-4" />
              <span>Nuevo medio</span>
            </button>
          </div>
          <ApiErrorBanner error={methods.error} onRetry={methods.reload} />
          <div className="overflow-x-auto w-full">
            <div className="min-w-[560px]">
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-y border-[#E7DFD2]">
                <div className="flex-1 min-w-[150px]">MEDIO</div>
                <div className="w-24 shrink-0 text-center">RECARGO</div>
                <div className="w-44 shrink-0">CUENTA POR DEFECTO</div>
                <div className="w-24 shrink-0 text-center">ACCIONES</div>
              </div>
              <div className="divide-y divide-[#F7F3EC]">
                {!methods.loading && !methods.error && methods.items.length === 0 ? (
                  <div className="p-12 text-center text-[#7A6F63] text-sm">No se encontraron medios de pago.</div>
                ) : (
                  methods.items.map((m) => (
                    <div key={m.id} className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors">
                      <div className="flex-1 min-w-[150px] flex flex-col">
                        <span className="font-semibold text-[#231E1A] text-sm truncate">{m.name}</span>
                        <span className="font-mono text-[11px] text-[#A89C8C]">{m.code}</span>
                      </div>
                      <div className="w-24 shrink-0 text-center text-[#231E1A]">{m.surchargePct}%</div>
                      <div className="w-44 shrink-0 text-[#7A6F63] truncate">{m.defaultAccountName ?? "—"}</div>
                      <div className="w-24 shrink-0 flex items-center justify-center">
                        <button disabled={busy} onClick={() => openMethod(m)} title="Editar medio" className={`${iconBtn} text-[#A89C8C] hover:text-[#9C5A2E]`}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button disabled={busy} onClick={() => setDelMethod(m)} title="Eliminar medio" className={`${iconBtn} text-[#A89C8C] hover:text-[#C0492F]`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <Pager hasPrev={methods.hasPrev} hasNext={methods.hasNext} onPrev={methods.prev} onNext={methods.next} total={methods.total} loading={methods.loading} />
        </section>

        {/* Financial accounts */}
        <section className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs overflow-hidden flex flex-col w-full min-w-0">
          <div className="p-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center">
                <Landmark className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-heading font-bold text-base text-[#231E1A]">Cuentas financieras</h3>
                <p className="text-xs text-[#7A6F63]">Cajas, bancos y billeteras donde ingresa el dinero.</p>
              </div>
            </div>
            <button disabled={busy} onClick={() => openAccount("new")} className={primaryBtn}>
              <Plus className="w-4 h-4" />
              <span>Nueva cuenta</span>
            </button>
          </div>
          <ApiErrorBanner error={accounts.error} onRetry={accounts.reload} />
          <div className="overflow-x-auto w-full">
            <div className="min-w-[480px]">
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-y border-[#E7DFD2]">
                <div className="flex-1 min-w-[150px]">CUENTA</div>
                <div className="w-44 shrink-0">TIPO</div>
                <div className="w-24 shrink-0 text-center">ACCIONES</div>
              </div>
              <div className="divide-y divide-[#F7F3EC]">
                {!accounts.loading && !accounts.error && accounts.items.length === 0 ? (
                  <div className="p-12 text-center text-[#7A6F63] text-sm">No se encontraron cuentas.</div>
                ) : (
                  accounts.items.map((a) => (
                    <div key={a.id} className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors">
                      <div className="flex-1 min-w-[150px] font-semibold text-[#231E1A] text-sm truncate">{a.name}</div>
                      <div className="w-44 shrink-0 text-[#7A6F63]">{accountTypeLabel[a.type]}</div>
                      <div className="w-24 shrink-0 flex items-center justify-center">
                        <button disabled={busy} onClick={() => openAccount(a)} title="Editar cuenta" className={`${iconBtn} text-[#A89C8C] hover:text-[#9C5A2E]`}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button disabled={busy} onClick={() => setDelAccount(a)} title="Eliminar cuenta" className={`${iconBtn} text-[#A89C8C] hover:text-[#C0492F]`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <Pager hasPrev={accounts.hasPrev} hasNext={accounts.hasNext} onPrev={accounts.prev} onNext={accounts.next} total={accounts.total} loading={accounts.loading} />
        </section>
      </main>

      <Modal
        isOpen={!!editMethod}
        onClose={() => setEditMethod(null)}
        title={editMethod === "new" ? "Nuevo medio de pago" : "Editar medio de pago"}
        maxWidth="max-w-md"
      >
        <form onSubmit={saveMethod} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs text-[#7A6F63]">
            Nombre
            <input type="text" required maxLength={100} value={mName} onChange={(e) => setMName(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#7A6F63]">
            Recargo (%)
            <input type="number" required min="0" max="100" step="0.01" value={mPct} onChange={(e) => setMPct(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#7A6F63]">
            Cuenta por defecto
            <select required value={mAccount} onChange={(e) => setMAccount(e.target.value)} className={inputCls}>
              <option value="" disabled>Seleccionar cuenta…</option>
              {accountOptions.options.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <ApiErrorBanner error={accountOptions.error} onRetry={accountOptions.reload} />
          <ApiErrorBanner error={formError} />
          <div className="flex justify-end gap-3 text-xs">
            <button type="button" onClick={() => setEditMethod(null)} className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={busy || !mAccount} className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] cursor-pointer disabled:opacity-60">
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!editAccount}
        onClose={() => setEditAccount(null)}
        title={editAccount === "new" ? "Nueva cuenta financiera" : "Editar cuenta financiera"}
        maxWidth="max-w-md"
      >
        <form onSubmit={saveAccount} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs text-[#7A6F63]">
            Nombre
            <input type="text" required maxLength={100} value={aName} onChange={(e) => setAName(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#7A6F63]">
            Tipo
            <select value={aType} onChange={(e) => setAType(e.target.value as AccountType)} className={inputCls}>
              {(Object.keys(accountTypeLabel) as AccountType[]).map((t) => (
                <option key={t} value={t}>{accountTypeLabel[t]}</option>
              ))}
            </select>
          </label>
          <ApiErrorBanner error={formError} />
          <div className="flex justify-end gap-3 text-xs">
            <button type="button" onClick={() => setEditAccount(null)} className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] cursor-pointer disabled:opacity-60">
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!delMethod}
        onClose={() => setDelMethod(null)}
        onConfirm={confirmDeleteMethod}
        isLoading={busy}
        title="¿Eliminar medio de pago?"
        itemName={delMethod?.name}
        description={delMethod ? `¿Estás seguro de que deseas eliminar el medio de pago "${delMethod.name}"?` : undefined}
      />
      <ConfirmDeleteModal
        isOpen={!!delAccount}
        onClose={() => setDelAccount(null)}
        onConfirm={confirmDeleteAccount}
        isLoading={busy}
        title="¿Eliminar cuenta financiera?"
        itemName={delAccount?.name}
        description={delAccount ? `¿Estás seguro de que deseas eliminar la cuenta "${delAccount.name}"?` : undefined}
      />
    </>
  );
}
