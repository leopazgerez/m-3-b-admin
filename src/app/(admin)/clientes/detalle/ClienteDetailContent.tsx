"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import Badge from "@/components/ui/Badge";
import {
  ArrowLeft,
  Mail,
  Phone,
  CreditCard,
  DollarSign,
  ShoppingBag,
  CheckCircle2,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  X,
  ChevronRight,
  Banknote,
  Plus,
} from "lucide-react";

type TabKey = "cuenta" | "compras" | "pagos";

export default function ClienteDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clients, sales, clientPayments, saleTypes, registerPayment, settleTotalClientDebt } = useStore();

  // ─── Identify client ───────────────────────────────────────────────────────
  const clientId = searchParams.get("id") ?? "";

  const registeredClient = clients.find((c) => c.id === clientId);

  const salesOfClient = sales.filter(
    (s) =>
      s.clientId === clientId ||
      (registeredClient && s.clientName.toLowerCase() === registeredClient.name.toLowerCase())
  );

  const client = useMemo(() => {
    if (registeredClient) {
      return {
        id: registeredClient.id,
        name: registeredClient.name,
        initials: registeredClient.initials,
        phone: registeredClient.phone || "Sin teléfono",
        email: registeredClient.email || `${registeredClient.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
        dni: registeredClient.dni,
      };
    }
    // Fallback from sales history
    const firstSale = sales.find((s) => s.clientId === clientId);
    if (!firstSale) return null;
    return {
      id: clientId,
      name: firstSale.clientName,
      initials: firstSale.clientInitials || "CL",
      phone: firstSale.clientPhone || "Sin teléfono",
      email: firstSale.clientEmail || `${firstSale.clientName.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
      dni: firstSale.clientDni,
    };
  }, [registeredClient, sales, clientId]);

  // ─── Financial metrics ────────────────────────────────────────────────────
  const paymentsOfClient = clientPayments.filter(
    (p) => p.clientId === clientId || p.clientName === client?.name
  );

  const totalPurchased = salesOfClient.reduce((acc, s) => acc + s.amount, 0);
  const totalPaid = salesOfClient.reduce(
    (acc, s) => acc + (s.paidAmount ?? (s.status === "Completada" ? s.amount : 0)),
    0
  );
  const totalDebt = Math.max(0, totalPurchased - totalPaid);
  const isInDebt = totalDebt > 0;

  // ─── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>("cuenta");

  // ─── Payment modal ─────────────────────────────────────────────────────────
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payType, setPayType] = useState<"total" | "partial">("total");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState(saleTypes[0] || "Efectivo");
  const [payNotes, setPayNotes] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  const openPayModal = () => {
    setPayType("total");
    setPayAmount(totalDebt.toString());
    setPayMethod(saleTypes[0] || "Efectivo");
    setPayNotes("");
    setPayError(null);
    setIsPayModalOpen(true);
  };

  const handlePayTypeChange = (type: "total" | "partial") => {
    setPayType(type);
    if (type === "total") setPayAmount(totalDebt.toString());
    else setPayAmount("");
    setPayError(null);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      setPayError("Ingresá un monto válido mayor a $0.");
      return;
    }
    if (amount > totalDebt + 0.001) {
      setPayError(`El monto no puede superar la deuda de $${totalDebt.toLocaleString("es-AR")}.`);
      return;
    }

    if (payType === "total") {
      settleTotalClientDebt(clientId, client!.name, payMethod);
    } else {
      registerPayment({
        clientId,
        clientName: client!.name,
        date: "Hoy",
        amount,
        method: payMethod,
        notes: payNotes || undefined,
      });
    }

    setIsPayModalOpen(false);
    setPaySuccess(`✓ Pago de $${amount.toLocaleString("es-AR")} registrado correctamente.`);
    setTimeout(() => setPaySuccess(null), 4000);
  };

  // Mark individual sale as paid — registerPayment handles updating paidAmount on the sale
  const handleMarkSalePaid = (saleId: string, remaining: number) => {
    registerPayment({
      clientId,
      clientName: client!.name,
      date: "Hoy",
      amount: remaining,
      method: saleTypes[0] || "Efectivo",
      saleId,
      notes: "Cobro por venta individual",
    });
  };

  // ─── Unified timeline ──────────────────────────────────────────────────────
  type TimelineEntry =
    | { kind: "sale"; date: string; label: string; amount: number; status: string; id: string }
    | { kind: "payment"; date: string; label: string; amount: number; method: string; id: string };

  const timeline: TimelineEntry[] = [
    ...salesOfClient.map((s) => ({
      kind: "sale" as const,
      id: s.id,
      date: s.date,
      label: s.productName,
      amount: s.amount,
      status: s.status,
    })),
    ...paymentsOfClient.map((p) => ({
      kind: "payment" as const,
      id: p.id,
      date: p.date,
      label: p.notes || "Pago registrado",
      amount: p.amount,
      method: p.method,
    })),
  ].sort((a, b) => {
    if (a.date === "Hoy") return -1;
    if (b.date === "Hoy") return 1;
    return 0;
  });

  // ─── Not found ─────────────────────────────────────────────────────────────
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <AlertCircle className="w-12 h-12 text-[#A89C8C]" />
        <p className="text-[#7A6F63] text-base">Cliente no encontrado.</p>
        <button
          onClick={() => router.push("/clientes")}
          className="flex items-center gap-2 text-sm text-[#9C5A2E] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a clientes
        </button>
      </div>
    );
  }

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
        <span className="text-xs font-semibold text-[#231E1A] truncate">{client.name}</span>
      </div>

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-6xl w-full min-w-0">

        {/* ─── Success toast ─────────────────────────────────────────────── */}
        {paySuccess && (
          <div className="bg-[#E3F1E8] border border-[#3E8E5A]/20 text-[#3E8E5A] text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {paySuccess}
          </div>
        )}

        {/* ─── Client header card ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-[#9C5A2E]/8 via-[#C87941]/5 to-transparent p-6 flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center font-bold text-2xl shrink-0 border-2 border-[#D4B896]">
              {client.initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-[#231E1A]">{client.name}</h1>
                {client.dni && (
                  <span className="text-[10px] bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] px-2 py-0.5 rounded font-mono">
                    DNI {client.dni}
                  </span>
                )}
                <Badge variant={isInDebt ? "danger" : "success"}>
                  {isInDebt ? "Saldo pendiente" : "Al día"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-[#7A6F63]">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#A89C8C]" />
                  {client.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#A89C8C]" />
                  {client.phone}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 shrink-0">
              {isInDebt && (
                <button
                  onClick={openPayModal}
                  className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saldar cuenta
                </button>
              )}
              <button
                onClick={openPayModal}
                className="flex items-center gap-2 bg-[#FBF8F2] border border-[#E7DFD2] text-[#231E1A] px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#F0E9DE] transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar cobro
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

        {/* ─── KPI cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            icon={<AlertCircle className="w-4 h-4" />}
            label="Saldo deudor"
            value={`$${totalDebt.toLocaleString("es-AR")}`}
            accent={isInDebt ? "danger" : "success"}
          />
          <KpiCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Total comprado"
            value={`$${totalPurchased.toLocaleString("es-AR")}`}
            accent="neutral"
          />
          <KpiCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Total abonado"
            value={`$${totalPaid.toLocaleString("es-AR")}`}
            accent="neutral"
          />
          <KpiCard
            icon={<ShoppingBag className="w-4 h-4" />}
            label="Operaciones"
            value={salesOfClient.length.toString()}
            accent="neutral"
          />
        </div>

        {/* ─── Tabs ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-[#E7DFD2] overflow-x-auto">
            {(
              [
                { key: "cuenta", label: "Cuenta corriente", icon: <ClipboardList className="w-3.5 h-3.5" /> },
                { key: "compras", label: "Compras", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
                { key: "pagos", label: "Cobros / Pagos", icon: <Banknote className="w-3.5 h-3.5" /> },
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
            <div className="divide-y divide-[#F7F3EC]">
              {timeline.length === 0 ? (
                <EmptyState text="No hay movimientos registrados para este cliente." />
              ) : (
                timeline.map((entry) => (
                  <div key={entry.id} className="px-6 py-4 flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        entry.kind === "payment"
                          ? "bg-[#E3F1E8] text-[#3E8E5A]"
                          : entry.status === "Pendiente"
                          ? "bg-[#FBEFD9] text-[#D98A2B]"
                          : "bg-[#FBF8F2] text-[#7A6F63]"
                      }`}
                    >
                      {entry.kind === "payment" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : entry.status === "Pendiente" ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <ShoppingBag className="w-4 h-4" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#231E1A] text-sm truncate">{entry.label}</div>
                      <div className="text-xs text-[#A89C8C] mt-0.5">
                        {entry.date} ·{" "}
                        {entry.kind === "payment"
                          ? `Cobro — ${entry.method}`
                          : `Compra — ${entry.status}`}
                      </div>
                    </div>

                    {/* Amount */}
                    <div
                      className={`text-sm font-bold shrink-0 ${
                        entry.kind === "payment" ? "text-[#3E8E5A]" : "text-[#231E1A]"
                      }`}
                    >
                      {entry.kind === "payment" ? "+" : ""}${entry.amount.toLocaleString("es-AR")}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Tab: Compras ─────────────────────────────────────────────── */}
          {activeTab === "compras" && (
            <div className="divide-y divide-[#F7F3EC]">
              {salesOfClient.length === 0 ? (
                <EmptyState text="Este cliente no tiene compras registradas." />
              ) : (
                salesOfClient.map((s) => {
                  const paid = s.paidAmount ?? (s.status === "Completada" ? s.amount : 0);
                  const remaining = Math.max(0, s.amount - paid);
                  return (
                    <div key={s.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#FBF8F2] border border-[#E7DFD2] flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-4 h-4 text-[#9C5A2E]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[#231E1A] text-sm truncate">{s.productName}</div>
                          <div className="text-xs text-[#A89C8C] mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{s.date}</span>
                            <span>·</span>
                            <span>{s.method}</span>
                            {remaining > 0 && (
                              <>
                                <span>·</span>
                                <span className="text-[#C0492F] font-medium">
                                  Debe: ${remaining.toLocaleString("es-AR")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge
                          variant={
                            s.status === "Completada"
                              ? "success"
                              : s.status === "Cancelada"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {s.status}
                        </Badge>
                        <span className="font-bold text-[#231E1A] text-sm">
                          ${s.amount.toLocaleString("es-AR")}
                        </span>
                        {s.status === "Pendiente" && remaining > 0 && (
                          <button
                            onClick={() => handleMarkSalePaid(s.id, remaining)}
                            className="text-xs bg-[#3E8E5A] text-white px-3 py-1.5 rounded-lg hover:bg-[#2E6E45] transition-colors font-semibold"
                          >
                            Cobrar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Tab: Cobros / Pagos ──────────────────────────────────────── */}
          {activeTab === "pagos" && (
            <div className="divide-y divide-[#F7F3EC]">
              {paymentsOfClient.length === 0 ? (
                <EmptyState text="No se han registrado cobros para este cliente." />
              ) : (
                paymentsOfClient.map((p) => (
                  <div key={p.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#E3F1E8] flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-[#3E8E5A]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#231E1A] text-sm truncate">
                        {p.notes || "Pago registrado"}
                      </div>
                      <div className="text-xs text-[#A89C8C] mt-0.5">
                        {p.date} · {p.method}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-[#3E8E5A] shrink-0">
                      +${p.amount.toLocaleString("es-AR")}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* ─── Payment Modal ────────────────────────────────────────────────── */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E7DFD2] w-full max-w-md overflow-hidden shadow-xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F7F3EC]">
              <h3 className="font-bold text-base text-[#231E1A]">Registrar cobro</h3>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-[#A89C8C] hover:text-[#231E1A] p-1.5 rounded-lg hover:bg-[#FBF8F2] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="p-6 flex flex-col gap-5">
              {/* Debt summary */}
              <div className="bg-[#FBF8F2] rounded-xl p-4 border border-[#E7DFD2]">
                <div className="text-xs text-[#A89C8C] mb-1">Saldo pendiente de {client.name}</div>
                <div className={`text-2xl font-bold ${isInDebt ? "text-[#C0492F]" : "text-[#3E8E5A]"}`}>
                  ${totalDebt.toLocaleString("es-AR")}
                </div>
              </div>

              {/* Pay type selector */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePayTypeChange("total")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    payType === "total"
                      ? "bg-[#9C5A2E] text-white border-[#9C5A2E]"
                      : "bg-white text-[#7A6F63] border-[#E7DFD2] hover:border-[#9C5A2E]"
                  }`}
                >
                  Cancelar deuda total
                </button>
                <button
                  type="button"
                  onClick={() => handlePayTypeChange("partial")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    payType === "partial"
                      ? "bg-[#9C5A2E] text-white border-[#9C5A2E]"
                      : "bg-white text-[#7A6F63] border-[#E7DFD2] hover:border-[#9C5A2E]"
                  }`}
                >
                  Abonar un saldo
                </button>
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#231E1A]">Monto a cobrar</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A89C8C] text-sm font-bold">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => { setPayAmount(e.target.value); setPayError(null); }}
                    disabled={payType === "total"}
                    className="w-full pl-7 pr-3 py-2.5 border border-[#E7DFD2] rounded-xl text-sm text-[#231E1A] focus:outline-none focus:ring-2 focus:ring-[#9C5A2E]/30 focus:border-[#9C5A2E] disabled:bg-[#FBF8F2] disabled:text-[#A89C8C]"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Method */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#231E1A]">Medio de cobro</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#E7DFD2] rounded-xl text-sm text-[#231E1A] focus:outline-none focus:ring-2 focus:ring-[#9C5A2E]/30 focus:border-[#9C5A2E] bg-white"
                >
                  {saleTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#231E1A]">Notas (opcional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ej: Anticipo en efectivo, recibo N°123…"
                  className="w-full px-3 py-2.5 border border-[#E7DFD2] rounded-xl text-sm text-[#231E1A] focus:outline-none focus:ring-2 focus:ring-[#9C5A2E]/30 focus:border-[#9C5A2E]"
                />
              </div>

              {/* Error */}
              {payError && (
                <div className="flex items-center gap-2 text-xs text-[#C0492F] bg-[#F7E3DD] px-3 py-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {payError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E7DFD2] text-xs font-semibold text-[#7A6F63] hover:bg-[#FBF8F2] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={totalDebt <= 0}
                  className="flex-1 py-2.5 rounded-xl bg-[#9C5A2E] text-white text-xs font-semibold hover:bg-[#7A3F1F] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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
