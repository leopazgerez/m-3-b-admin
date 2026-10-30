"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import { CashClosedNotice } from "@/components/cash/CashStatus";
import { useCashStatus } from "@/lib/cashStatus";
import { ApiErrorBanner } from "@/components/ui";
import { feedback } from "@/lib/feedback";
import { api, ApiError } from "@/lib/api";
import { useApiResource, useOptions } from "@/lib/useApi";
import { buyerName, money, variantLabel } from "@/lib/format";
import { formatInstant, pastDayToInstant, toLocalISODate } from "@/lib/dateUtils";
import { estimateSale, round2, type DiscountInput } from "@/lib/saleEstimate";
import { canReturn, estimateReturnValue, remainingQty, returnBlocker } from "@/lib/returns";
import type {
  Customer, FinancialAccount, PaymentMethod, Product, RegisterReturnRequest, RemainderAction, ReturnView, Sale,
  StockRow, Variant,
} from "@/lib/apiTypes";
import PaymentsPanel, { methodOf, type PaymentRow } from "../../ventas/nueva/PaymentsPanel";
import ProductSearch from "../../ventas/nueva/ProductSearch";
import { AlertCircle, ArrowLeft, Minus, Plus, Repeat, Trash2, Undo2 } from "lucide-react";

interface Pick { quantity: number; faulty: boolean }
interface CartLine { variantId: number; label: string; price: number; onHand: number; quantity: number }

const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white disabled:text-[#A89C8C]";
const label = "block text-xs font-semibold text-[#231E1A] mb-1.5";
const darkField =
  "bg-[#15110E] border border-[#322A23] rounded-lg px-2 py-1.5 text-xs text-[#F5EAD6] outline-none focus:border-[#C87941]";
const card = "bg-white rounded-2xl border border-[#E7DFD2] p-5 shadow-xs flex flex-col gap-4";
const stepTitle = "font-heading font-bold text-sm text-[#231E1A] flex items-center gap-2";
const badField = "!border-[#C0492F] ring-2 ring-[#C0492F]/20";

export default function NuevaDevolucionContent() {
  const router = useRouter();
  const saleId = Number(useSearchParams().get("saleId")) || 0;
  const saleRes = useApiResource(() => api.getOne<Sale>(`/sales/${saleId}`), [saleId]);
  const sale = saleRes.data;
  const customer = useApiResource(
    () => (sale?.customerId ? api.getOne<Customer>(`/customers/${sale.customerId}`) : Promise.resolve(null)),
    [sale?.customerId],
  );
  const variantIds = sale ? [...new Set(sale.lines.map((l) => l.variantId))] : [];
  const names = useApiResource(
    () =>
      variantIds.length
        ? api.getAll<StockRow>("/stock", { filters: [{ field: "variantId", operator: "IN", value: variantIds }] })
        : Promise.resolve([] as StockRow[]),
    [sale?.id],
  );
  const lineName = (variantId: number) => {
    const r = names.data?.find((x) => x.variantId === variantId);
    return r ? variantLabel(r) : `Variante #${variantId}`;
  };
  const methods = useOptions<PaymentMethod>("/payment-methods");
  const accounts = useOptions<FinancialAccount>("/financial-accounts");
  const cashClosed = useCashStatus().closed;

  // Step 1: picks by sale line id
  const [picks, setPicks] = useState<Record<number, Pick>>({});
  // Step 2: exchange
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountKind, setDiscountKind] = useState<"percent" | "amount">("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const searchRef = useRef<HTMLInputElement | null>(null);
  // Step 3
  const [day, setDay] = useState(toLocalISODate());
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<RemainderAction>("REFUND");
  const [refundMethodId, setRefundMethodId] = useState("");
  const [refundAccountId, setRefundAccountId] = useState("");
  // set when the server says value is left over although the estimate didn't
  // the server asked for a remainder the estimate didn't see
  const [serverLeftover, setServerLeftover] = useState(false);

  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const setPick = (lineId: number, p: Pick | null) =>
    setPicks((prev) => {
      const next = { ...prev };
      if (p) next[lineId] = p;
      else delete next[lineId];
      return next;
    });

  const addVariant = (p: Product, v: Variant) => {
    const name = variantLabel({ productName: p.name, variantName: v.name });
    setCart((prev) =>
      prev.some((l) => l.variantId === v.id)
        ? prev.map((l) => (l.variantId === v.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...prev, { variantId: v.id, label: name, price: v.price, onHand: v.onHand, quantity: 1 }],
    );
  };
  const setQty = (variantId: number, q: number) =>
    setCart((prev) =>
      q <= 0 ? prev.filter((l) => l.variantId !== variantId) : prev.map((l) => (l.variantId === variantId ? { ...l, quantity: q } : l)),
    );

  if (!saleId) return <Missing text="Falta indicar la venta a devolver." />;
  if (saleRes.error) {
    return (
      <Shell saleId={saleId}>
        <ApiErrorBanner error={saleRes.error} onRetry={saleRes.reload} />
      </Shell>
    );
  }
  if (!sale) return <Shell saleId={saleId}><div className="p-12 text-center text-xs text-[#A89C8C]">Cargando venta…</div></Shell>;
  if (!canReturn(sale)) {
    return (
      <Shell saleId={saleId}>
        <div className={`${card} text-xs text-[#7A6F63]`}>
          La venta #{sale.id} no admite devoluciones: está cancelada, es un regalo, sorteo o uso interno, o ya se devolvieron
          todas sus unidades.
        </div>
      </Shell>
    );
  }

  // ── Estimates (the server computes the real values) ──
  const picked = sale.lines.filter((l) => picks[l.id]);
  const returnValue = estimateReturnValue(picked.map((l) => ({ unitPrice: l.unitPrice, quantity: picks[l.id].quantity })));
  const hasExchange = cart.length > 0;
  const discount: DiscountInput = hasExchange && Number(discountValue) > 0 ? { kind: discountKind, value: Number(discountValue) } : null;
  const ex = estimateSale(
    cart.map((l) => ({ unitPrice: l.price, quantity: l.quantity })),
    discount,
    hasExchange ? payments.map((p) => ({ amount: Number(p.amount) || 0, surchargePct: methodOf(methods.options, p)?.surchargePct ?? 0 })) : [],
  );
  // value pays the original sale's debt (or all the customer's debt), then what the exchange still owes
  const debt = customer.data?.outstanding ?? sale.outstanding;
  const leftover = round2(returnValue - debt - Math.max(0, ex.remaining));
  const sendRemainder = serverLeftover || leftover > 0;
  const canCredit = sale.customerId !== null;
  const refundMethod = methods.options.find((m) => String(m.id) === refundMethodId);

  const blocker =
    returnBlocker(picked.map((l) => picks[l.id]), hasExchange)
      ?? (!reason.trim() ? "Indicá el motivo de la devolución." : null)
      ?? (hasExchange && ex.discount > ex.gross ? "El descuento del cambio supera su subtotal." : null)
      ?? (cashClosed && payments.length > 0 ? "La caja está cerrada: quitá los pagos del cambio o abrí la caja." : null)
      ?? (sendRemainder && action === "REFUND" && cashClosed
        ? "La caja está cerrada: abrila para reintegrar o dejá el resto como saldo a favor." : null)
      ?? (sendRemainder && action === "REFUND" && !refundMethodId ? "Elegí el medio con que se reintegra." : null)
      ?? (sendRemainder && action === "REFUND" && refundMethod?.defaultAccountId == null && !refundAccountId
        ? "El medio de reintegro no tiene cuenta por defecto: elegí una." : null);

  // field from the API → which input to mark
  const errField = submitError instanceof ApiError ? submitError.field ?? "" : "";
  const sentLineIds = picked.map((l) => l.id);
  const errLineIdx = /^lines\[(\d+)\]/.exec(errField);
  const errLineId = errLineIdx ? sentLineIds[Number(errLineIdx[1])] : undefined;
  const bad = (f: string) => (errField === f || errField.startsWith(`${f}.`) || errField.startsWith(`${f}[`) ? badField : "");

  const body = (withRemainder: boolean): RegisterReturnRequest => ({
    returnedAt: pastDayToInstant(day),
    reason: reason.trim(),
    lines: picked.map((l) => ({ saleLineId: l.id, quantity: picks[l.id].quantity, faulty: picks[l.id].faulty })),
    ...(hasExchange ? {
      exchange: {
        lines: cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        adjustments: ex.discount > 0
          ? [{ type: "DISCOUNT" as const, amount: -ex.discount, notes: discount?.kind === "percent" ? `Descuento ${discount.value}%` : "Descuento" }]
          : [],
        payments: payments.map((p) => ({
          paymentMethodId: Number(p.methodId),
          amount: Number(p.amount),
          ...(p.accountId ? { accountId: Number(p.accountId) } : {}),
        })),
      },
    } : {}),
    ...(withRemainder ? {
      remainder: action === "CREDIT"
        ? { action }
        : { action, paymentMethodId: Number(refundMethodId), ...(refundAccountId ? { accountId: Number(refundAccountId) } : {}) },
    } : {}),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || blocker) return;
    submitting.current = true;
    setSubmitError(null);
    setBusy(true);
    try {
      let r: ReturnView;
      try {
        // silent: a remainder error here is retried below, not an error for the user
        r = await api.post<ReturnView>(`/sales/${sale.id}/returns`, body(sendRemainder), { silent: true });
      } catch (err) {
        // the estimate saw a leftover the server didn't: send it again without remainder
        if (!(err instanceof ApiError && err.field === "remainder" && sendRemainder)) {
          if (err instanceof ApiError && err.status !== 401) feedback.error(err.message);
          throw err;
        }
        r = await api.post<ReturnView>(`/sales/${sale.id}/returns`, body(false));
      }
      feedback.success(`${r.exchangeSaleId ? "Cambio" : "Devolución"} #${r.id} registrado por ${money(r.total)}.`);
      router.push(`/devoluciones/detalle?id=${r.id}`);
    } catch (err) {
      submitting.current = false;
      if (err instanceof ApiError && err.field === "remainder" && !sendRemainder) setServerLeftover(true);
      setSubmitError(err);
      setBusy(false);
    }
  };

  return (
    <Shell saleId={sale.id}>
      <form onSubmit={submit}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault(); }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E7DFD2] text-xs text-[#231E1A] flex flex-wrap gap-x-6 gap-y-1">
            <span><span className="text-[#A89C8C]">Venta</span> #{sale.id}</span>
            <span><span className="text-[#A89C8C]">Cliente</span> {buyerName(sale)}</span>
            <span><span className="text-[#A89C8C]">Fecha</span> {formatInstant(sale.soldAt)}</span>
            <span><span className="text-[#A89C8C]">Total</span> {money(sale.totalDue)}</span>
            {sale.outstanding > 0 && <span className="text-[#C0492F]">Debe {money(sale.outstanding)}</span>}
          </div>

          {/* Step 1 */}
          <div className={card}>
            <h3 className={stepTitle}><Undo2 className="w-4 h-4 text-[#9C5A2E]" />1. Qué devuelve</h3>
            <ApiErrorBanner error={names.error} onRetry={names.reload} />
            <div className="border border-[#E7DFD2] rounded-xl divide-y divide-[#F7F3EC]">
              {sale.lines.map((l) => {
                const max = remainingQty(l);
                const p = picks[l.id];
                return (
                  <div key={l.id} className={`px-3.5 py-3 flex flex-wrap items-center gap-3 text-xs ${errLineId === l.id ? "bg-[#F7E3DD]/50" : ""}`}>
                    <label className="flex items-center gap-2.5 flex-1 min-w-[180px] cursor-pointer">
                      <input type="checkbox" disabled={max <= 0} checked={!!p}
                        onChange={(e) => setPick(l.id, e.target.checked ? { quantity: 1, faulty: !hasExchange } : null)}
                        className="w-4 h-4 accent-[#9C5A2E]" />
                      <span className="flex flex-col min-w-0">
                        <span className="font-semibold text-[#231E1A] truncate">{lineName(l.variantId)}</span>
                        <span className="text-[#7A6F63]">
                          {money(l.unitPrice)} c/u · vendidas {l.quantity}
                          {l.returnedQuantity > 0 && ` · ya devueltas ${l.returnedQuantity}`}
                          {max <= 0 && " · nada para devolver"}
                        </span>
                      </span>
                    </label>
                    {p && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#7A6F63]">Cant.</span>
                          <input type="number" min={1} max={max} step={1} value={p.quantity}
                            onChange={(e) => setPick(l.id, { ...p, quantity: Math.min(max, Math.max(1, Math.floor(Number(e.target.value)) || 1)) })}
                            className={`w-14 text-center font-bold bg-white border border-[#E7DFD2] rounded-lg py-1.5 outline-none focus:border-[#9C5A2E] ${errLineId === l.id ? badField : ""}`} />
                          <span className="text-[#A89C8C]">de {max}</span>
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={p.faulty} onChange={(e) => setPick(l.id, { ...p, faulty: e.target.checked })}
                            className="w-4 h-4 accent-[#C0492F]" />
                          <span className={p.faulty ? "text-[#C0492F] font-semibold" : "text-[#7A6F63]"}>Llegó fallado</span>
                        </label>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-[#7A6F63]">
              Sin cambio solo se aceptan unidades falladas. Si se lleva otros productos, puede devolver unidades sanas.
            </p>
          </div>

          {/* Step 2 */}
          <div className={card}>
            <h3 className={stepTitle}><Repeat className="w-4 h-4 text-[#9C5A2E]" />2. Cambio (opcional)</h3>
            <p className="text-[11px] text-[#7A6F63] -mt-2">
              Lo que se lleva a cambio se registra como una venta minorista nueva, pagada primero con el valor devuelto.
            </p>
            <div className="relative">
              <ProductSearch onAdd={addVariant} inputRef={searchRef} />
            </div>
            {cart.length > 0 && (
              <div className={`border border-[#E7DFD2] rounded-xl divide-y divide-[#F7F3EC] ${bad("exchange")}`}>
                {cart.map((l) => (
                  <div key={l.variantId} className="px-3.5 py-3 flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex-1 min-w-[160px] flex flex-col">
                      <span className="font-semibold text-[#231E1A]">{l.label}</span>
                      <span className="text-[11px] text-[#A89C8C]">
                        {money(l.price)} c/u (precio de lista)
                        {l.quantity > l.onHand && <span className="text-[#C0492F] font-medium"> • Stock disponible: {l.onHand}</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setQty(l.variantId, l.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-[#FBF8F2] border border-[#E7DFD2] hover:bg-[#EADBC6] flex items-center justify-center cursor-pointer">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-bold">{l.quantity}</span>
                      <button type="button" onClick={() => setQty(l.variantId, l.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-[#FBF8F2] border border-[#E7DFD2] hover:bg-[#EADBC6] flex items-center justify-center cursor-pointer">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="w-24 text-right font-bold text-[#231E1A]">{money(l.price * l.quantity)}</div>
                    <button type="button" onClick={() => setQty(l.variantId, 0)} title="Quitar"
                      className="text-[#A89C8C] hover:text-[#C0492F] p-1.5 rounded-lg hover:bg-[#F7E3DD]/50 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 3 */}
          <div className={card}>
            <h3 className={stepTitle}><AlertCircle className="w-4 h-4 text-[#9C5A2E]" />3. Fecha y motivo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={label}>Fecha</label>
                <input type="date" value={day} min={toLocalISODate(new Date(sale.soldAt))} max={toLocalISODate()}
                  onChange={(e) => setDay(e.target.value)} className={`${inputCls} ${bad("returnedAt")}`} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Motivo <span className="text-[#C0492F]">*</span></label>
                <input type="text" required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej.: vino descosido" className={`${inputCls} ${bad("reason")}`} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: summary, exchange payments, leftover ── */}
        <div className="lg:col-span-4 bg-[#211C18] text-[#F5EAD6] rounded-2xl border border-[#322A23] p-5 shadow-xl flex flex-col gap-5">
          <span className="font-heading font-bold text-sm tracking-tight border-b border-[#322A23] pb-3">Resumen</span>

          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between text-[#C9BCA9]">
              <span>Valor devuelto (aprox.)</span>
              <span className="font-semibold text-[#F5EAD6]">{money(returnValue)}</span>
            </div>
            {debt > 0 && (
              <div className="flex justify-between text-[#C9BCA9]">
                <span>Cancela deuda {customer.data ? "del cliente" : "de la venta"}</span>
                <span className="text-[#F5EAD6]">-{money(Math.min(debt, returnValue))}</span>
              </div>
            )}
            {hasExchange && (
              <>
                <div className="flex justify-between text-[#C9BCA9]">
                  <span>Cambio (subtotal)</span>
                  <span className="text-[#F5EAD6]">{money(ex.gross)}</span>
                </div>
                <div className="flex items-center justify-between text-[#C9BCA9]">
                  <span className="flex items-center gap-1">
                    <span>Descuento</span>
                    <button type="button" onClick={() => setDiscountKind(discountKind === "percent" ? "amount" : "percent")}
                      className="text-[10px] text-[#C87941] underline cursor-pointer">
                      ({discountKind === "percent" ? "%" : "$"})
                    </button>
                  </span>
                  <input type="number" min="0" step={discountKind === "percent" ? "any" : "0.01"} max={discountKind === "percent" ? 100 : undefined}
                    value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="0"
                    className="w-20 text-right bg-[#15110E] border border-[#322A23] rounded-lg px-2 py-0.5 text-xs text-white outline-none focus:border-[#C87941]" />
                </div>
              </>
            )}
          </div>

          {hasExchange && (
            <div className={`rounded-xl ${bad("payments")}`}>
              <ApiErrorBanner error={methods.error ?? accounts.error} onRetry={() => { methods.reload(); accounts.reload(); }} />
              <PaymentsPanel rows={payments} onChange={setPayments} methods={methods.options} accounts={accounts.options}
                remaining={Math.max(0, round2(ex.remaining - Math.max(0, returnValue - debt)))} />
              <p className="text-[10px] text-[#A89C8C] mt-1">Pagos: lo que el cliente paga además del valor devuelto.</p>
            </div>
          )}

          {/* Leftover */}
          <div className={`flex flex-col gap-2 pt-3 border-t border-[#322A23] ${bad("remainder")}`}>
            <span className="text-xs font-medium text-[#C9BCA9]">Si sobra valor</span>
            <div className="grid grid-cols-2 gap-2">
              {(["REFUND", "CREDIT"] as const).map((a) => (
                <button key={a} type="button" disabled={a === "CREDIT" && !canCredit} onClick={() => setAction(a)}
                  className={`py-2 rounded-lg text-xs font-semibold border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    action === a ? "bg-[#9C5A2E] border-[#9C5A2E] text-white" : "bg-[#15110E] border-[#322A23] text-[#C9BCA9]"
                  }`}>
                  {a === "REFUND" ? "Reintegrar" : "Saldo a favor"}
                </button>
              ))}
            </div>
            {!canCredit && <p className="text-[10px] text-[#A89C8C]">Venta sin cliente: solo se puede reintegrar.</p>}
            {action === "REFUND" && (
              <>
                <select value={refundMethodId} onChange={(e) => { setRefundMethodId(e.target.value); setRefundAccountId(""); }}
                  className={darkField}>
                  <option value="">Medio de reintegro…</option>
                  {methods.options.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select value={refundAccountId} onChange={(e) => setRefundAccountId(e.target.value)} className={darkField}>
                  <option value="">
                    {refundMethod?.defaultAccountName ? `Cuenta: ${refundMethod.defaultAccountName} (por defecto)` : "Cuenta de salida…"}
                  </option>
                  {accounts.options.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </>
            )}
            {serverLeftover ? (
              <p className="text-[11px] text-[#E27D60]">
                El servidor indica que sobra un saldo: elegí qué hacer y confirmá de nuevo.
              </p>
            ) : (
              <p className="text-[10px] text-[#A89C8C]">
                {leftover > 0
                  ? `Sobrarían aprox. ${money(leftover)}.`
                  : "Por lo estimado no sobra nada; si el servidor calcula un sobrante, te lo va a pedir."}
                {" "}Si hay otras ventas impagas del cliente, el sobrante primero las cancela.
              </p>
            )}
          </div>

          <span className="text-[10px] text-[#A89C8C]">
            Estimado con precio × cantidad: el servidor descuenta la parte proporcional de los descuentos y no devuelve el
            recargo por tarjeta.
          </span>

          {blocker && (
            <p className="text-[11px] text-[#E27D60] flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{blocker}</span>
            </p>
          )}
          <ApiErrorBanner error={submitError} />

          <button type="submit" disabled={!!blocker || busy}
            className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white disabled:bg-[#322A23] disabled:text-[#7A6F63] disabled:cursor-not-allowed">
            <Undo2 className="w-5 h-5" />
            <span>{busy ? "Registrando…" : hasExchange ? "Confirmar cambio" : "Confirmar devolución"}</span>
          </button>
        </div>
      </form>
    </Shell>
  );
}

function Shell({ saleId, children }: { saleId: number; children: React.ReactNode }) {
  return (
    <>
      <Topbar title="Devolución / cambio" subtitle={`Sobre la venta #${saleId}`} />
      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full">
        <Link href={`/ventas?id=${saleId}`}
          className="self-start flex items-center gap-2 text-xs font-semibold text-[#7A6F63] hover:text-[#231E1A] bg-white border border-[#E7DFD2] px-3.5 py-2 rounded-xl transition-all shadow-2xs hover:bg-[#FBF8F2]">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la venta</span>
        </Link>
        <CashClosedNotice what="reintegrar dinero (un cambio o un saldo a favor, sin reintegro, se registra igual)" />
        {children}
      </main>
    </>
  );
}

function Missing({ text }: { text: string }) {
  return (
    <>
      <Topbar title="Devolución / cambio" />
      <main className="p-8 text-sm text-[#7A6F63]">
        {text} <Link href="/ventas" className="text-[#9C5A2E] font-semibold underline">Ir a Ventas</Link>
      </main>
    </>
  );
}
