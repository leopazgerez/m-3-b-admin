"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Calculator, LockOpen, Vault } from "lucide-react";
import { ApiErrorBanner } from "@/components/ui";
import { useCashStatus } from "@/lib/cashStatus";
import { formatInstant } from "@/lib/dateUtils";
import { cashStatusDot, money } from "@/lib/format";
import { primaryBtn } from "./ui";

/** A row of small label/value tiles (caja figures). */
export function MiniFigures({ items, className = "" }: {
  items: { label: string; value: string; cls?: string }[];
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-3 gap-2 sm:gap-3 text-xs ${className}`}>
      {items.map((k) => (
        <div key={k.label} className="bg-[#FBF8F2] rounded-xl border border-[#E7DFD2] px-3 py-2">
          <div className="text-[11px] text-[#A89C8C] font-medium">{k.label}</div>
          <div className={`font-heading font-bold text-sm truncate ${k.cls ?? "text-[#231E1A]"}`}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Warning above a form that moves money, shown while the caja is not OPEN (the form itself blocks its submit via
 * useCashStatus().closed). `what`: "registrar cobros"…
 */
export function CashClosedNotice({ what }: { what: string }) {
  const { session, closed } = useCashStatus();
  if (!closed) return null;
  const pending = session?.status === "PENDING_COUNT";
  return (
    <div role="status"
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[#D98A2B]/40 bg-[#FBEFD9] px-4 py-3 text-xs text-[#7A3F1F]">
      <AlertTriangle className="w-5 h-5 shrink-0 text-[#D98A2B]" />
      <p className="flex-1">
        <span className="font-semibold">
          {pending ? "La caja se cerró automáticamente y falta hacer caja." : "La caja está cerrada."}
        </span>{" "}
        Para {what} la caja tiene que estar abierta.
      </p>
      <Link href="/caja"
        className="shrink-0 self-start sm:self-auto flex items-center gap-1.5 bg-white border border-[#D98A2B]/40 px-3 py-1.5 rounded-lg font-semibold text-[#7A3F1F] hover:bg-[#FBF8F2]">
        {pending ? "Hacer caja" : "Abrir caja"} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

/** Dashboard card: is the caja open, since when, and what the system expects right now. */
export function CashStatusCard() {
  const { loaded, session: s, error, reload } = useCashStatus();
  if (error) return <ApiErrorBanner error={error} onRetry={reload} />;
  if (!loaded) return <div className="h-[120px] rounded-2xl border border-[#E7DFD2] bg-white animate-pulse" />;

  const dot = cashStatusDot[s?.status ?? "CLOSED"];
  const state = !s
    ? { text: "Abrila para registrar cobros, reintegros, pagos y movimientos.", cta: "Abrir caja", icon: LockOpen }
    : s.status === "PENDING_COUNT"
      ? { text: `Se cerró automáticamente${s.closedAt ? ` el ${formatInstant(s.closedAt)}` : ""}. Cargá lo contado para seguir operando.`,
          cta: "Hacer caja", icon: Calculator }
      : { text: `Desde ${formatInstant(s.openedAt)}${s.closesAt ? ` · cierre automático ${formatInstant(s.closesAt)}` : ""}`,
          cta: "Ver caja", icon: Vault };
  const Icon = state.icon;

  return (
    <div className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-[#F5EAD6] text-[#9C5A2E] flex items-center justify-center shrink-0">
          <Vault className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${dot.cls}`} />
            <h3 className="font-heading font-bold text-base text-[#231E1A]">{dot.title}</h3>
          </div>
          <p className="text-xs text-[#7A6F63] mt-0.5">{state.text}</p>
        </div>
      </div>

      {s && (
        <MiniFigures className="lg:w-[420px] shrink-0" items={[
          { label: "Entró", value: money(s.totals.in), cls: "text-[#286B3E]" },
          { label: "Salió", value: money(s.totals.out), cls: "text-[#C0492F]" },
          { label: "Esperado", value: money(s.totals.expected) },
        ]} />
      )}

      <Link href="/caja" className={`${primaryBtn} shrink-0`}>
        <Icon className="w-4 h-4" />
        <span>{state.cta}</span>
      </Link>
    </div>
  );
}
