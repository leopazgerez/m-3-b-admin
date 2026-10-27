"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ApiErrorBanner, Badge, ConfirmDeleteModal, Modal, Pager } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useApiResource, useOptions, usePagedList } from "@/lib/useApi";
import { money, paymentStatusVariant as statusVariant } from "@/lib/format";
import { formatInstant, pastDayToInstant, toLocalISODate } from "@/lib/dateUtils";
import CustomerFormModal from "../CustomerFormModal";
import { accountEntryTypeLabel, paymentStatusLabel, saleTypeLabel } from "@/lib/labels";
import type {
  AccountEntry, Customer, FinancialAccount, PaymentFields, PaymentMethod, Sale,
} from "@/lib/apiTypes";
import {
  ArrowLeft,
  Mail,
  Phone,
  DollarSign,
  ShoppingBag,
  CheckCircle2,
  Undo2,
  Edit2,
  Banknote,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";

type TabKey = "cuenta" | "compras";

const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-colors disabled:text-[#A89C8C]";
const label = "block text-xs font-semibold text-[#231E1A] mb-1.5";

const getInitials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/** What the payment modal pays: the whole debt, part of it (FIFO), or one sale. */
type PayTarget = { mode: "total" | "partial" } | { mode: "sale"; sale: Sale };

export default function ClienteDetailContent() {
  const raw = useSearchParams().get("id") ?? "";
  // Non-numeric or missing id: no API call at all.
  return /^\d+$/.test(raw) ? <CustomerDetail id={Number(raw)} /> : <NotFound />;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <AlertCircle className="w-12 h-12 text-[#A89C8C]" />
      <p className="text-[#7A6F63] text-base">Cliente no encontrado.</p>
      <Link href="/clientes" className="flex items-center gap-2 text-sm text-[#9C5A2E] hover:underline">
        <ArrowLeft className="w-4 h-4" />
        Volver a clientes
      </Link>
    </div>
  );
}

function CustomerDetail({ id }: { id: number }) {
  const customer = useApiResource(() => api.getOne<Customer>(`/customers/${id}`), [id]);
  const account = usePagedList<AccountEntry>(`/customers/${id}/account`, {});
  const sales = usePagedList<Sale>("/sales", { filters: [{ field: "customerId", operator: "EQUALS", value: id }] });

  const [activeTab, setActiveTab] = useState<TabKey>("cuenta");
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [voiding, setVoiding] = useState<AccountEntry | null>(null);
  const [editing, setEditing] = useState(false);
  const [voidError, setVoidError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const openPay = (t: PayTarget) => { setSuccess(null); setPayTarget(t); };
  const reloadAll = () => { customer.reload(); account.reload(); sales.reload(); };

  const handleVoid = async () => {
    if (!voiding) return;
    const entry = voiding;
    setVoidError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await api.del(`/payments/${entry.id}`);
      setSuccess(`Cobro de ${money(entry.credit)} anulado.`);
      reloadAll();
    } catch (e) {
      setVoidError(e);
    } finally {
      setBusy(false);
    }
  };

  if (customer.error instanceof ApiError && customer.error.status === 404) return <NotFound />;

  const c = customer.data;
  if (!c) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-6xl w-full min-w-0">
        <ApiErrorBanner error={customer.error} onRetry={customer.reload} />
        {!customer.error && <div className="text-sm text-[#A89C8C]">Cargando cliente…</div>}
      </main>
    );
  }

  const isInDebt = c.outstanding > 0;

  return (
    <>
      {/* ─── Breadcrumb / top nav ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[#FDFAF6] border-b border-[#E7DFD2] px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-3">
        <Link
          href="/clientes"
          className="flex items-center gap-1.5 text-xs text-[#7A6F63] hover:text-[#231E1A] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Clientes</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-[#C7B99E]" />
        <span className="text-xs font-semibold text-[#231E1A] truncate">{c.fullName}</span>
      </div>

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-6xl w-full min-w-0">
        {success && (
          <div className="bg-[#E3F1E8] border border-[#3E8E5A]/20 text-[#3E8E5A] text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}
        <ApiErrorBanner error={customer.error} onRetry={customer.reload} />

        {/* ─── Client header card ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-[#9C5A2E]/8 via-[#C87941]/5 to-transparent p-6 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center font-bold text-2xl shrink-0 border-2 border-[#D4B896]">
              {getInitials(c.fullName)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-[#231E1A]">{c.fullName}</h1>
                {c.dni && (
                  <span className="text-[10px] bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] px-2 py-0.5 rounded font-mono">
                    DNI {c.dni}
                  </span>
                )}
                <Badge variant={isInDebt ? "danger" : "success"}>{isInDebt ? "Saldo pendiente" : "Al día"}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-[#7A6F63]">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#A89C8C]" />
                  {c.email ?? "Sin email"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#A89C8C]" />
                  {c.phone ?? "Sin teléfono"}
                </span>
              </div>
              {c.notes && <p className="text-xs text-[#7A6F63] mt-1">{c.notes}</p>}
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              {isInDebt && (
                <button
                  onClick={() => openPay({ mode: "total" })}
                  disabled={busy}
                  className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-sm disabled:opacity-60"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saldar todo
                </button>
              )}
              <button
                onClick={() => openPay({ mode: "partial" })}
                disabled={busy}
                className="flex items-center gap-2 bg-[#FBF8F2] border border-[#E7DFD2] text-[#231E1A] px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#F0E9DE] transition-all shadow-sm disabled:opacity-60"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar cobro
              </button>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 bg-[#FBF8F2] border border-[#E7DFD2] text-[#231E1A] px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#F0E9DE] transition-all shadow-sm cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar
              </button>
              <Link
                href="/ventas/nueva"
                className="flex items-center gap-2 bg-[#FBF8F2] border border-[#E7DFD2] text-[#231E1A] px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#F0E9DE] transition-all shadow-sm"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Nueva venta
              </Link>
            </div>
          </div>
        </div>

        {/* ─── KPI cards (totals from GET /customers/{id}) ───────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard icon={<AlertCircle className="w-4 h-4" />} label="Saldo deudor" value={money(c.outstanding)}
            accent={isInDebt ? "danger" : "success"} />
          <KpiCard icon={<Undo2 className="w-4 h-4" />} label="Saldo a favor" value={money(c.creditBalance)}
            accent={c.creditBalance > 0 ? "success" : "neutral"} />
          <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Total comprado" value={money(c.totalPurchased)}
            accent="neutral" />
          <KpiCard icon={<DollarSign className="w-4 h-4" />} label="Total abonado" value={money(c.totalPaid)}
            accent="neutral" />
          <KpiCard icon={<ShoppingBag className="w-4 h-4" />} label="Operaciones" value={String(c.orderCount)}
            accent="neutral" />
        </div>

        <ApiErrorBanner error={voidError} />

        {/* ─── Tabs ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs overflow-hidden">
          <div className="flex border-b border-[#E7DFD2] overflow-x-auto">
            {(
              [
                { key: "cuenta", label: "Cuenta corriente", icon: <ClipboardList className="w-3.5 h-3.5" /> },
                { key: "compras", label: "Compras", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
              ] as { key: TabKey; label: string; icon: React.ReactNode }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-5 py-3.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.key
                    ? "border-[#9C5A2E] text-[#9C5A2E]"
                    : "border-transparent text-[#A89C8C] hover:text-[#231E1A]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Cuenta corriente ────────────────────────────────────── */}
          {activeTab === "cuenta" && (
            <>
              <div className="p-4 empty:hidden"><ApiErrorBanner error={account.error} onRetry={account.reload} /></div>
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="bg-[#FBF8F2] px-6 py-3 flex items-center gap-4 border-b border-[#E7DFD2] text-[11px] text-[#A89C8C] tracking-wide font-semibold">
                    <div className="w-36 shrink-0">FECHA</div>
                    <div className="flex-1 min-w-0">DESCRIPCIÓN</div>
                    <div className="w-28 shrink-0 text-right">DEBE</div>
                    <div className="w-28 shrink-0 text-right">HABER</div>
                    <div className="w-28 shrink-0 text-right">SALDO</div>
                    <div className="w-10 shrink-0" />
                  </div>
                  <div className="divide-y divide-[#F7F3EC]">
                    {!account.loading && !account.error && account.items.length === 0 ? (
                      <EmptyState text="No hay movimientos registrados para este cliente." />
                    ) : (
                      account.items.map((e) => (
                        <div key={`${e.type}-${e.id}`} className="px-6 py-3.5 flex items-center gap-4 text-xs">
                          <div className="w-36 shrink-0 text-[#7A6F63]">{formatInstant(e.at)}</div>
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                              e.type === "PAYMENT" || e.type === "RETURN" ? "bg-[#E3F1E8] text-[#3E8E5A]" : "bg-[#FBF8F2] text-[#7A6F63]"
                            }`}>
                              {e.type === "PAYMENT" ? <CheckCircle2 className="w-3.5 h-3.5" />
                                : e.type === "RETURN" ? <Undo2 className="w-3.5 h-3.5" />
                                  : e.type === "REFUND" ? <Banknote className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                            </span>
                            <span className="text-[#A89C8C] shrink-0">{accountEntryTypeLabel[e.type]}</span>
                            <span className="text-[#231E1A] font-medium truncate">{e.description}</span>
                          </div>
                          <div className="w-28 shrink-0 text-right text-[#231E1A]">{e.debit ? money(e.debit) : "—"}</div>
                          <div className="w-28 shrink-0 text-right text-[#3E8E5A]">{e.credit ? money(e.credit) : "—"}</div>
                          <div className={`w-28 shrink-0 text-right font-bold ${e.balance > 0 ? "text-[#C0492F]" : "text-[#231E1A]"}`}>
                            {money(e.balance)}
                          </div>
                          <div className="w-10 shrink-0 flex justify-center">
                            {e.type === "PAYMENT" && (
                              <button onClick={() => { setVoidError(null); setVoiding(e); }} disabled={busy}
                                aria-label="Anular cobro" title="Anular cobro"
                                className="p-1.5 rounded-lg text-[#C0492F] hover:bg-[#FBEAE5] cursor-pointer disabled:opacity-60">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <Pager hasPrev={account.hasPrev} hasNext={account.hasNext} onPrev={account.prev} onNext={account.next}
                total={account.total} loading={account.loading} />
            </>
          )}

          {/* ── Tab: Compras ─────────────────────────────────────────────── */}
          {activeTab === "compras" && (
            <>
              <div className="p-4 empty:hidden"><ApiErrorBanner error={sales.error} onRetry={sales.reload} /></div>
              <div className="divide-y divide-[#F7F3EC]">
                {!sales.loading && !sales.error && sales.items.length === 0 ? (
                  <EmptyState text="Este cliente no tiene compras registradas." />
                ) : (
                  sales.items.map((s) => (
                    <div key={s.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#FBF8F2] border border-[#E7DFD2] flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-4 h-4 text-[#9C5A2E]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[#231E1A] text-sm truncate">
                            <Link href={`/ventas?id=${s.id}`} className="hover:text-[#9C5A2E] hover:underline">Venta #{s.id}</Link>
                            {s.notes ? ` · ${s.notes}` : ""}
                          </div>
                          <div className="text-xs text-[#A89C8C] mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{formatInstant(s.soldAt)}</span>
                            <span>·</span>
                            <span>{saleTypeLabel[s.type]}</span>
                            <span>·</span>
                            <span>Pagado {money(s.totalPaid)}</span>
                            {s.outstanding > 0 && (
                              <>
                                <span>·</span>
                                <span className="text-[#C0492F] font-medium">Debe: {money(s.outstanding)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant={statusVariant[s.paymentStatus]}>{paymentStatusLabel[s.paymentStatus]}</Badge>
                        <span className="font-bold text-[#231E1A] text-sm">{money(s.totalDue)}</span>
                        {s.outstanding > 0 && !s.cancelledAt && (
                          <button
                            onClick={() => openPay({ mode: "sale", sale: s })}
                            disabled={busy}
                            className="text-xs bg-[#3E8E5A] text-white px-3 py-1.5 rounded-lg hover:bg-[#2E6E45] transition-colors font-semibold disabled:opacity-60"
                          >
                            Cobrar
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Pager hasPrev={sales.hasPrev} hasNext={sales.hasNext} onPrev={sales.prev} onNext={sales.next}
                total={sales.total} loading={sales.loading} />
            </>
          )}
        </div>
      </main>

      {payTarget && (
        <PaymentModal
          customer={c}
          target={payTarget}
          onClose={() => setPayTarget(null)}
          onDone={(amount) => {
            setPayTarget(null);
            setSuccess(`Cobro de ${money(amount)} registrado.`);
            reloadAll();
          }}
        />
      )}

      {editing && (
        <CustomerFormModal customer={c} onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); customer.reload(); }} />
      )}

      <ConfirmDeleteModal
        isOpen={!!voiding}
        onClose={() => setVoiding(null)}
        onConfirm={handleVoid}
        isLoading={busy}
        title="¿Anular cobro?"
        description={`Se anulará el cobro "${voiding?.description}" por ${money(voiding?.credit ?? 0)}. Las ventas que pagaba volverán a deberse.`}
        confirmLabel="Anular cobro"
      />
    </>
  );
}

/** POST /customers/{id}/payments. Without saleId the backend allocates FIFO. */
function PaymentModal({ customer, target, onClose, onDone }: {
  customer: Customer;
  target: PayTarget;
  onClose: () => void;
  onDone: (amount: number) => void;
}) {
  const initialAmount =
    target.mode === "total" ? customer.outstanding : target.mode === "sale" ? target.sale.outstanding : "";
  const [amount, setAmount] = useState(String(initialAmount));
  const [methodId, setMethodId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const methods = useOptions<PaymentMethod>("/payment-methods");
  const accounts = useOptions<FinancialAccount>("/financial-accounts");
  const optionsError = methods.error ?? accounts.error;

  const today = toLocalISODate();
  const pickMethod = (v: string) => {
    setMethodId(v);
    const m = methods.options.find((o) => String(o.id) === v);
    setAccountId(m?.defaultAccountId != null ? String(m.defaultAccountId) : "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: PaymentFields = { amount: Number(amount), paymentMethodId: Number(methodId) };
    if (accountId) body.accountId = Number(accountId);
    // Only a past day is sent, as the END of that local day (never future: max=today, today is omitted) so it is not before a sale of that same day; today/empty = now on the server.
    const paidAt = pastDayToInstant(paidOn, today);
    if (paidAt) body.paidAt = paidAt;
    if (notes.trim()) body.notes = notes.trim();
    if (target.mode === "sale") body.saleId = target.sale.id;
    setError(null);
    setBusy(true);
    try {
      await api.post(`/customers/${customer.id}/payments`, body);
      onDone(body.amount);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const title =
    target.mode === "total" ? "Saldar todo" : target.mode === "sale" ? `Cobrar venta #${target.sale.id}` : "Registrar cobro";

  return (
    <Modal isOpen onClose={onClose} title={title}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ApiErrorBanner error={optionsError} onRetry={() => { methods.reload(); accounts.reload(); }} />

        <div className="bg-[#FBF8F2] rounded-xl p-4 border border-[#E7DFD2]">
          <div className="text-xs text-[#A89C8C] mb-1">
            {target.mode === "sale" ? `Saldo de la venta #${target.sale.id}` : `Saldo pendiente de ${customer.fullName}`}
          </div>
          <div className={`text-2xl font-bold ${(target.mode === "sale" ? target.sale.outstanding : customer.outstanding) > 0 ? "text-[#C0492F]" : "text-[#3E8E5A]"}`}>
            {money(target.mode === "sale" ? target.sale.outstanding : customer.outstanding)}
          </div>
          {target.mode === "partial" && (
            <div className="text-[11px] text-[#A89C8C] mt-1">Se imputa a las ventas más antiguas primero.</div>
          )}
        </div>

        <div>
          <label className={label}>Monto a cobrar <span className="text-[#C0492F]">*</span></label>
          <input type="number" min="0.01" step="0.01" required value={amount}
            onChange={(e) => setAmount(e.target.value)} disabled={target.mode === "total"} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Medio de cobro <span className="text-[#C0492F]">*</span></label>
            <select value={methodId} onChange={(e) => pickMethod(e.target.value)} required className={inputCls}>
              <option value="">Elegí…</option>
              {methods.options.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Cuenta <span className="text-[#C0492F]">*</span></label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required className={inputCls}>
              <option value="">Elegí…</option>
              {accounts.options.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Fecha de cobro</label>
            <input type="date" max={today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className={inputCls} />
            <span className="text-[10px] text-[#A89C8C]">Vacío u hoy = ahora</span>
          </div>
          <div>
            <label className={label}>Notas</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
          </div>
        </div>

        <ApiErrorBanner error={error} />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F7F3EC] text-xs">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={busy}
            className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer disabled:opacity-60">
            {busy ? "Registrando…" : "Confirmar cobro"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "danger" | "success" | "neutral";
}) {
  const styles = {
    danger: { bg: "bg-[#F7E3DD]", text: "text-[#C0492F]", icon: "text-[#C0492F]" },
    success: { bg: "bg-[#E3F1E8]", text: "text-[#3E8E5A]", icon: "text-[#3E8E5A]" },
    neutral: { bg: "bg-[#FBF8F2]", text: "text-[#231E1A]", icon: "text-[#A89C8C]" },
  }[accent];

  return (
    <div className="bg-white rounded-2xl border border-[#E7DFD2] p-4 shadow-xs flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-xl ${styles.bg} flex items-center justify-center ${styles.icon}`}>
        {icon}
      </div>
      <div className={`text-lg font-bold ${styles.text}`}>{value}</div>
      <div className="text-[11px] text-[#A89C8C] font-medium">{label}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-12 text-center text-[#7A6F63] text-sm">{text}</div>;
}
