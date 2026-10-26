"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import BarcodeScanner from "@/components/ui/BarcodeScanner";
import { ApiErrorBanner, Modal } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useApiResource, useOptions } from "@/lib/useApi";
import { money, variantLabel } from "@/lib/format";
import { saleTypeLabel } from "@/lib/labels";
import { estimateSale, type DiscountInput } from "@/lib/saleEstimate";
import type {
  Customer, FinancialAccount, PaymentMethod, Product, RegisterSaleRequest, Sale, SaleType, Variant, VariantLookup,
} from "@/lib/apiTypes";
import CustomerPicker from "./CustomerPicker";
import PaymentsPanel, { methodOf, type PaymentRow } from "./PaymentsPanel";
import ConfirmationView from "./ConfirmationView";
import {
  ScanBarcode, ShoppingCart, Plus, Minus, Trash2, ArrowLeft, ArrowDownRight, CheckCircle2, DollarSign, RotateCcw,
  Camera, X, AlertCircle, User, Package, Search, Tag,
} from "lucide-react";

interface CartLine { variantId: number; label: string; sku: string | null; price: number; onHand: number; quantity: number }

const GIFT_TYPES: SaleType[] = ["GIFT", "GIVEAWAY"];
const darkField =
  "bg-[#15110E] border border-[#322A23] rounded-lg px-2 py-1.5 text-xs text-[#F5EAD6] outline-none focus:border-[#C87941]";

export default function NuevaVentaPosPage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [saleType, setSaleType] = useState<SaleType>("REGULAR");
  const [discountKind, setDiscountKind] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const [pickingCustomer, setPickingCustomer] = useState(false);
  const [chooser, setChooser] = useState<Product | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMsg, setScanMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [busy, setBusy] = useState(false);
  const submitting = useRef(false); // blocks a second click before the disabled state renders
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [done, setDone] = useState<{ sale: Sale; estimated: number; labels: Map<number, string> } | null>(null);

  const methods = useOptions<PaymentMethod>("/payment-methods");
  const accounts = useOptions<FinancialAccount>("/financial-accounts");

  // Product search (debounced) for the suggestions under the scanner input.
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);
  const suggestions = useApiResource(
    () =>
      search
        ? api.getPage<Product>("/products", { length: 8, search, filters: [{ field: "active", operator: "EQUALS", value: true }] })
          .then((p) => p.items)
        : Promise.resolve([] as Product[]),
    [search],
  );
  useEffect(() => inputRef.current?.focus(), []);

  const addVariant = (p: Product, v: Variant) => {
    const label = variantLabel({ productName: p.name, variantName: v.name });
    setCart((prev) =>
      prev.some((l) => l.variantId === v.id)
        ? prev.map((l) => (l.variantId === v.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...prev, { variantId: v.id, label, sku: v.sku, price: v.price, onHand: v.onHand, quantity: 1 }],
    );
    setScanMsg({ ok: true, text: `+1 ${label}` });
    setSearchTerm("");
    setChooser(null);
    inputRef.current?.focus();
  };

  const pickProduct = (p: Product) => {
    const live = p.variants.filter((v) => v.active);
    if (live.length === 1) addVariant(p, live[0]);
    else if (live.length === 0) setScanMsg({ ok: false, text: `${p.name} no tiene variantes activas` });
    else setChooser(p);
  };

  /** Exact SKU lookup, for the pistol scanner (types the code + Enter) and the camera. */
  const lookup = async (code: string) => {
    if (!code) return;
    setScanMsg(null);
    try {
      const r = await api.getOne<VariantLookup>("/variants/lookup", { code });
      const v = r.product.variants.find((x) => x.id === r.variantId);
      if (!v || !v.active || !r.product.active) setScanMsg({ ok: false, text: `"${code}": producto o variante inactivo` });
      else addVariant(r.product, v);
    } catch (e) {
      const text =
        e instanceof ApiError && e.status === 404 ? `Código no encontrado: "${code}"`
          : e instanceof ApiError ? `Error ${e.status || ""}: ${e.message}` : String(e);
      setScanMsg({ ok: false, text });
    }
  };

  const setQty = (variantId: number, q: number) =>
    setCart((prev) =>
      q <= 0 ? prev.filter((l) => l.variantId !== variantId) : prev.map((l) => (l.variantId === variantId ? { ...l, quantity: q } : l)),
    );

  const reset = () => {
    setCart([]);
    setSaleType("REGULAR");
    setDiscountValue("");
    setCustomer(null);
    setWalkInName("");
    setPayments([]);
    setSubmitError(null);
    setScanMsg(null);
    setDone(null);
    submitting.current = false;
    inputRef.current?.focus();
  };

  // ── Estimate (the server computes the real total) ──
  const isGift = GIFT_TYPES.includes(saleType);
  const discount: DiscountInput =
    !isGift && Number(discountValue) > 0 ? { kind: discountKind, value: Number(discountValue) } : null;
  const est = estimateSale(
    cart.map((l) => ({ unitPrice: isGift ? 0 : l.price, quantity: l.quantity })), // gifts are priced at zero
    discount,
    isGift ? [] : payments.map((p) => ({ amount: Number(p.amount) || 0, surchargePct: methodOf(methods.options, p)?.surchargePct ?? 0 })),
  );
  const itemCount = cart.reduce((n, l) => n + l.quantity, 0);

  const blocker =
    cart.length === 0 ? "Agregá al menos un producto."
      : est.discount > est.gross ? "El descuento supera el subtotal."
        : est.remaining < 0 ? `Los pagos superan el total (sin recargos) en ${money(-est.remaining)}.`
          : !customer && !isGift && est.remaining !== 0
            ? `Venta sin cliente: debe pagarse completa (faltan ${money(est.remaining)}). Asociá un cliente para dejar saldo pendiente.`
            : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || blocker) return;
    submitting.current = true;
    const body: RegisterSaleRequest = {
      type: saleType,
      lines: cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      // adjustments are signed on the server (Sale.totalDue = gross + adjustments): a discount goes negative
      adjustments: est.discount > 0
        ? [{ type: "DISCOUNT", amount: -est.discount, notes: discount?.kind === "percent" ? `Descuento ${discount.value}%` : "Descuento" }]
        : [],
      payments: isGift
        ? []
        : payments.map((p) => ({
          paymentMethodId: Number(p.methodId),
          amount: Number(p.amount),
          ...(p.accountId ? { accountId: Number(p.accountId) } : {}),
        })),
    };
    if (customer) body.customerId = customer.id;
    else if (walkInName.trim()) body.notes = walkInName.trim();
    setSubmitError(null);
    setBusy(true);
    try {
      const sale = await api.post<Sale>("/sales", body);
      // submitting stays true until reset(): this sale is done
      setDone({ sale, estimated: est.totalDue, labels: new Map(cart.map((l) => [l.variantId, l.label])) });
    } catch (err) {
      submitting.current = false;
      setSubmitError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Topbar title="Punto de Venta (POS)" subtitle="Caja de cobro y registro rápido de ventas" />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full">
        <div className="flex items-center justify-between gap-4">
          <Link href="/ventas"
            className="flex items-center gap-2 text-xs font-semibold text-[#7A6F63] hover:text-[#231E1A] bg-white border border-[#E7DFD2] px-3.5 py-2 rounded-xl transition-all shadow-2xs hover:bg-[#FBF8F2]">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Ventas</span>
          </Link>
          {cart.length > 0 && (
            <button type="button" onClick={() => setCart([])}
              className="flex items-center gap-1.5 text-xs text-[#C0492F] hover:bg-[#F7E3DD]/40 px-3 py-1.5 rounded-lg cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Vaciar compra ({itemCount})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── Left: scanner + cart ── */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border-2 border-[#9C5A2E]/30 p-4 shadow-xs relative">
              <form onSubmit={(e) => { e.preventDefault(); lookup(searchTerm.trim()); }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <div className="relative flex-1 flex items-center">
                  <ScanBarcode className="w-5 h-5 text-[#9C5A2E] absolute left-3.5 pointer-events-none" />
                  <input ref={inputRef} type="text" maxLength={100} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Escanear código (Enter) o buscar producto por nombre..."
                    className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl pl-11 pr-10 py-3 text-xs sm:text-sm text-[#231E1A] font-medium outline-none focus:border-[#9C5A2E] focus:bg-white shadow-inner" />
                  {searchTerm && (
                    <button type="button" onClick={() => setSearchTerm("")} className="absolute right-3 text-[#A89C8C] hover:text-[#231E1A]">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setScannerOpen(true)} title="Escanear con cámara"
                    className="flex-1 sm:flex-none bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] hover:text-[#9C5A2E] hover:border-[#9C5A2E] px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shrink-0">
                    <Camera className="w-4 h-4" />
                    <span>Cámara</span>
                  </button>
                  <button type="submit"
                    className="flex-1 sm:flex-none bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-5 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0">
                    <Plus className="w-4 h-4" />
                    <span>Agregar código</span>
                  </button>
                </div>
              </form>

              {searchTerm.trim() && (suggestions.data?.length || suggestions.error) ? (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-[#E7DFD2] shadow-xl z-30 overflow-hidden divide-y divide-[#F7F3EC]">
                  <ApiErrorBanner error={suggestions.error} onRetry={suggestions.reload} />
                  {suggestions.data?.map((p) => (
                    <button key={p.id} type="button" onClick={() => pickProduct(p)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[#FBF8F2] cursor-pointer transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#EADBC6] text-[#9C5A2E] flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-[#231E1A] truncate">
                            {p.name}
                            {p.hasVariants && <span className="ml-2 text-[10px] bg-[#EADBC6]/60 text-[#9C5A2E] font-bold px-1.5 py-0.5 rounded">{p.variants.filter((v) => v.active).length} modelos</span>}
                          </span>
                          <span className="text-[10px] text-[#A89C8C]">{p.categoryName ?? "Sin categoría"} • Stock: {p.onHand}</span>
                        </div>
                      </div>
                      {!p.hasVariants && p.variants[0] && <span className="text-xs font-bold text-[#231E1A]">{money(p.variants[0].price)}</span>}
                    </button>
                  ))}
                </div>
              ) : null}

              {scanMsg && (
                <div className={`mt-2 text-xs font-semibold flex items-center gap-1.5 ${scanMsg.ok ? "text-[#3E8E5A]" : "text-[#C0492F]"}`}>
                  {scanMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{scanMsg.text}</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden">
              {cart.length === 0 ? (
                <div className="p-12 sm:p-16 flex flex-col items-center justify-center text-center text-[#7A6F63] gap-3">
                  <div className="w-16 h-16 rounded-full bg-[#FBF8F2] border border-[#E7DFD2] flex items-center justify-center text-[#A89C8C]">
                    <ShoppingCart className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <span className="font-heading font-bold text-sm text-[#231E1A]">Ticket de compra vacío</span>
                  <p className="text-xs text-[#A89C8C] max-w-sm">Escaneá un código o buscá el producto por nombre para agregarlo.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F7F3EC]">
                  {cart.map((l) => (
                    <div key={l.variantId} className="px-4 sm:px-6 py-4 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 text-xs">
                      <div className="flex-1 min-w-[160px] flex flex-col">
                        <span className="font-semibold text-[#231E1A] text-sm">{l.label}</span>
                        <span className="text-[11px] text-[#A89C8C]">
                          {l.sku && <span className="font-mono">SKU: {l.sku} • </span>}
                          {money(l.price)} c/u
                          {l.quantity > l.onHand && <span className="text-[#C0492F] font-medium"> • Stock disponible: {l.onHand}</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setQty(l.variantId, l.quantity - 1)}
                          className="w-8 h-8 rounded-lg bg-[#FBF8F2] border border-[#E7DFD2] text-[#231E1A] hover:bg-[#EADBC6] flex items-center justify-center cursor-pointer">
                          <Minus className="w-3 h-3" />
                        </button>
                        <input type="number" min="1" step="1" value={l.quantity}
                          onChange={(e) => setQty(l.variantId, Math.max(1, Math.floor(Number(e.target.value)) || 1))}
                          className="w-12 text-center font-bold text-xs bg-white border border-[#E7DFD2] rounded-lg py-1.5 outline-none focus:border-[#9C5A2E]" />
                        <button type="button" onClick={() => setQty(l.variantId, l.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-[#FBF8F2] border border-[#E7DFD2] text-[#231E1A] hover:bg-[#EADBC6] flex items-center justify-center cursor-pointer">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="w-24 text-right font-bold text-[#231E1A] text-sm">{money(isGift ? 0 : l.price * l.quantity)}</div>
                      <button type="button" onClick={() => setQty(l.variantId, 0)} title="Quitar del ticket"
                        className="text-[#A89C8C] hover:text-[#C0492F] p-1.5 rounded-lg hover:bg-[#F7E3DD]/50 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: checkout ── */}
          <form id="checkout-panel" onSubmit={submit}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault(); }}
          className="lg:col-span-4 flex flex-col gap-4 scroll-mt-6">
            <div className="bg-[#211C18] text-[#F5EAD6] rounded-2xl border border-[#322A23] p-5 shadow-xl flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-[#322A23] pb-3">
                <span className="font-heading font-bold text-sm tracking-tight">Caja de Cobro</span>
                <span className="text-xs text-[#C9BCA9]">{itemCount} {itemCount === 1 ? "artículo" : "artículos"}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#C9BCA9] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#C87941]" />
                  <span>Tipo de venta</span>
                </label>
                <select value={saleType} onChange={(e) => setSaleType(e.target.value as SaleType)} className={darkField}>
                  {(Object.keys(saleTypeLabel) as SaleType[]).map((t) => <option key={t} value={t}>{saleTypeLabel[t]}</option>)}
                </select>
                {isGift && <p className="text-[10px] text-[#A89C8C]">Regalo/sorteo: precio cero y sin pagos; solo descuenta stock.</p>}
              </div>

              {/* Customer */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#C9BCA9] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#C87941]" />
                  <span>Cliente</span>
                </label>
                {customer ? (
                  <div className="bg-[#15110E] p-3 rounded-xl border border-[#322A23] flex items-center justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-xs truncate">{customer.fullName}</span>
                      <span className="text-[10px] text-[#C9BCA9] truncate">
                        {[customer.dni && `DNI ${customer.dni}`, customer.outstanding > 0 && `Debe ${money(customer.outstanding)}`].filter(Boolean).join(" • ")}
                      </span>
                    </div>
                    <div className="flex gap-3 shrink-0 text-xs">
                      <button type="button" onClick={() => setPickingCustomer(true)} className="text-[#C87941] hover:underline cursor-pointer">Cambiar</button>
                      <button type="button" onClick={() => setCustomer(null)} className="text-[#A89C8C] hover:text-[#C0492F] cursor-pointer">Quitar</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#15110E] p-3 rounded-xl border border-[#322A23] flex flex-col gap-2">
                    <input type="text" maxLength={500} value={walkInName} onChange={(e) => setWalkInName(e.target.value)}
                      placeholder="Consumidor final (nombre opcional, va en notas)" className={darkField} />
                    <button type="button" onClick={() => setPickingCustomer(true)}
                      className="bg-[#211C18] hover:bg-[#322A23] border border-[#322A23] py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer">
                      <Search className="w-3.5 h-3.5 text-[#C87941]" />
                      <span>Buscar o registrar cliente</span>
                    </button>
                  </div>
                )}
              </div>

              {!isGift && (
                <>
                  <ApiErrorBanner error={methods.error ?? accounts.error} onRetry={() => { methods.reload(); accounts.reload(); }} />
                  <PaymentsPanel rows={payments} onChange={setPayments} methods={methods.options} accounts={accounts.options} remaining={est.remaining} />
                </>
              )}

              {/* Estimate */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#322A23] text-xs">
                <div className="flex justify-between text-[#C9BCA9]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#F5EAD6]">{money(est.gross)}</span>
                </div>
                {!isGift && (
                  <div className="flex items-center justify-between text-[#C9BCA9]">
                    <span className="flex items-center gap-1">
                      <span>Descuento</span>
                      <button type="button" onClick={() => setDiscountKind(discountKind === "percent" ? "amount" : "percent")}
                        className="text-[10px] text-[#C87941] underline cursor-pointer">
                        ({discountKind === "percent" ? "%" : "$"})
                      </button>
                    </span>
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" step={discountKind === "percent" ? "any" : "0.01"} max={discountKind === "percent" ? 100 : undefined}
                        value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="0"
                        className="w-20 text-right bg-[#15110E] border border-[#322A23] rounded-lg px-2 py-0.5 text-xs text-white outline-none focus:border-[#C87941]" />
                      {est.discount > 0 && <span className="text-[11px] text-[#C0492F]">-{money(est.discount)}</span>}
                    </div>
                  </div>
                )}
                {est.surcharge > 0 && (
                  <div className="flex justify-between text-[#C9BCA9]">
                    <span>Recargo medio de pago</span>
                    <span className="text-[#F5EAD6]">+{money(est.surcharge)}</span>
                  </div>
                )}
                {!isGift && (
                  <div className="flex justify-between text-[#C9BCA9]">
                    <span>Pagado (sin recargo)</span>
                    <span className="text-[#F5EAD6]">{money(est.paidBase)}</span>
                  </div>
                )}
                {!isGift && est.remaining > 0 && (
                  <div className="flex justify-between text-[#C9BCA9]">
                    <span>{customer ? "Queda en cuenta corriente" : "Falta pagar"}</span>
                    <span className="font-semibold text-[#E27D60]">{money(est.remaining)}</span>
                  </div>
                )}

                <div className="mt-3 p-4 bg-[#15110E] rounded-xl border border-[#322A23] flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-[#A89C8C] tracking-wider">TOTAL ESTIMADO</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold font-heading tracking-tight">{money(est.totalDue)}</span>
                    <span className="text-xs text-[#C87941] font-medium">ARS</span>
                  </div>
                  <span className="text-[10px] text-[#A89C8C]">Estimado: el total final lo calcula el servidor al confirmar.</span>
                </div>
              </div>

              {blocker && cart.length > 0 && (
                <p className="text-[11px] text-[#E27D60] flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{blocker}</span>
                </p>
              )}
              <ApiErrorBanner error={submitError} />

              <button type="submit" disabled={!!blocker || busy}
                className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white disabled:bg-[#322A23] disabled:text-[#7A6F63] disabled:cursor-not-allowed">
                <DollarSign className="w-5 h-5" />
                <span>{busy ? "Registrando…" : "Confirmar venta"}</span>
              </button>
            </div>
          </form>
        </div>

        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-[#211C18] text-white p-3.5 rounded-2xl border border-[#322A23] shadow-2xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#C9BCA9]">{itemCount} {itemCount === 1 ? "artículo" : "artículos"} • estimado</span>
              <span className="text-lg font-bold font-heading text-[#F5EAD6]">{money(est.totalDue)}</span>
            </div>
            <button type="button" onClick={() => document.getElementById("checkout-panel")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <span>Ir a cobrar</span>
              <ArrowDownRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {scannerOpen && <BarcodeScanner onDetected={(code) => lookup(code)} onClose={() => setScannerOpen(false)} />}

      {pickingCustomer && (
        <CustomerPicker onPick={(c) => { setCustomer(c); setPickingCustomer(false); }} onClose={() => setPickingCustomer(false)} />
      )}

      {chooser && (
        <Modal isOpen onClose={() => setChooser(null)} title={`Elegí el modelo · ${chooser.name}`}>
          <div className="divide-y divide-[#F7F3EC] border border-[#E7DFD2] rounded-xl overflow-hidden">
            {chooser.variants.filter((v) => v.active).map((v) => (
              <div key={v.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-[#231E1A]">{v.name}</span>
                  <span className="text-[11px] text-[#A89C8C]">
                    {v.sku && <span className="font-mono">SKU: {v.sku} • </span>}
                    <span className={v.onHand <= 0 ? "text-[#C0492F]" : ""}>Stock: {v.onHand}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-[#231E1A]">{money(v.price)}</span>
                  <button type="button" onClick={() => addVariant(chooser, v)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Sumar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {done && <ConfirmationView sale={done.sale} estimated={done.estimated} labels={done.labels} onNew={reset} />}
    </>
  );
}
