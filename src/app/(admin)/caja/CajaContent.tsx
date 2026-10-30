"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeftRight, Calculator, CheckCircle2, History, LockOpen } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { ApiErrorBanner, ConfirmDeleteModal, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { useApiResource, useOptions } from "@/lib/useApi";
import { useCashStatus } from "@/lib/cashStatus";
import { cashStatusDot, money } from "@/lib/format";
import { formatInstant } from "@/lib/dateUtils";
import { toAmounts } from "@/lib/cashSession";
import { accountTypeLabel } from "@/lib/labels";
import type { AccountAmount, CashSession, CashSessionRow, CashSessionSummary, FinancialAccount } from "@/lib/apiTypes";
import { AccountsTable, RowsTable } from "./SessionTables";
import CountForm from "./CountForm";
import MovementFormModal from "./MovementFormModal";
import { MiniFigures } from "@/components/cash/CashStatus";
import { diffCls, diffText, inputCls, opt, primaryBtn, secondaryBtn } from "@/components/cash/ui";

const card = "bg-white rounded-2xl border border-[#E7DFD2] shadow-xs p-4 sm:p-6";

export default function CajaContent() {
  // the shared current session (also drives the sidebar dot and the dashboard); every write here re-checks it, and
  // the buttons stay disabled while that runs so a stale form can't submit twice
  const cash = useCashStatus();
  const s = cash.session;
  // only without a current session: the last one tells "closed" from "never opened" (the first opening)
  const noSession = cash.loaded && !cash.error && !s;
  const last = useApiResource(
    () => (noSession
      ? api.getPage<CashSessionSummary>("/cash-sessions", { length: 1 }).then((p) => p.items[0] ?? null)
      : Promise.resolve(null)),
    [noSession],
  );
  const lastKnown = noSession && !last.loading;
  const prev = lastKnown ? last.data : null;
  const firstOpening = lastKnown && !last.error && !prev;
  // without history we can't tell first opening from reopening: offer the plain open, the backend says if it needs balances
  const reopening = lastKnown && (!!prev || !!last.error);
  const [moving, setMoving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [result, setResult] = useState<CashSession | null>(null);
  const [voiding, setVoiding] = useState<CashSessionRow | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const disabled = busy || cash.loading;

  const open = async (body: { initialBalances?: AccountAmount[] }) => {
    setError(null);
    setBusy(true);
    try {
      await api.post("/cash-sessions", body, { success: "Caja abierta." });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const closed = (r: CashSession) => { setClosing(false); setResult(r); };

  const handleVoid = async () => {
    if (!voiding) return;
    const row = voiding;
    setError(null);
    setBusy(true);
    try {
      await api.del(`/cash-movements/${row.id}`, { success: "Movimiento anulado." });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
      setVoiding(null);
    }
  };

  return (
    <>
      <Topbar title="Caja" subtitle="Apertura, movimientos y cierre de la jornada" />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full min-w-0">
        <div className="flex justify-end">
          <Link href="/caja/historial" className={secondaryBtn}>
            <History className="w-4 h-4 text-[#9C5A2E]" />
            <span>Historial de jornadas</span>
          </Link>
        </div>

        <ApiErrorBanner error={cash.error ?? last.error} onRetry={() => { cash.reload(); last.reload(); }} />
        <ApiErrorBanner error={error} />

        {firstOpening && <FirstOpenForm busy={disabled} onOpen={(initialBalances) => open({ initialBalances })} />}

        {reopening && (
          <div className={`${card} flex flex-col gap-4`}>
            <div>
              <h2 className="font-heading font-bold text-lg text-[#231E1A]">La caja está cerrada</h2>
              <p className="text-xs text-[#7A6F63] mt-1">
                {prev && <>Último cierre: {prev.closedAt ? formatInstant(prev.closedAt) : "—"}. </>}
                Al abrir, cada cuenta arranca con lo contado en el último cierre.
              </p>
            </div>
            {prev && (
              <MiniFigures items={[
                { label: "Esperado", value: money(prev.totals.expected) },
                { label: "Contado", value: opt(prev.totals.counted) },
                { label: "Diferencia", value: diffText(prev.totals.difference), cls: diffCls(prev.totals.difference) },
              ]} />
            )}
            <div>
              <button type="button" disabled={disabled} onClick={() => open({})} className={primaryBtn}>
                <LockOpen className="w-4 h-4" />
                <span>{busy ? "Abriendo…" : "Abrir caja"}</span>
              </button>
            </div>
          </div>
        )}

        {s?.status === "OPEN" && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading font-bold text-lg text-[#231E1A] flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cashStatusDot.OPEN.cls}`} />
                  Caja abierta desde {formatInstant(s.openedAt)}
                </h2>
                {s.closesAt && <p className="text-xs text-[#7A6F63]">Cierra automáticamente: {formatInstant(s.closesAt)}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMoving(true)} className={`${secondaryBtn} flex-1 sm:flex-none`}>
                  <ArrowLeftRight className="w-4 h-4 text-[#9C5A2E]" />
                  <span>Registrar movimiento</span>
                </button>
                <button type="button" onClick={() => setClosing(true)} className={`${primaryBtn} flex-1 sm:flex-none`}>
                  <Calculator className="w-4 h-4" />
                  <span>Hacer caja</span>
                </button>
              </div>
            </div>
            <AccountsTable s={s} />
            <RowsTable s={s} onVoid={setVoiding} />
          </>
        )}

        {s?.status === "PENDING_COUNT" && (
          <>
            <div role="alert" className="flex items-start gap-3 rounded-2xl border border-[#D98A2B]/40 bg-[#FBEFD9] p-4 text-sm text-[#7A3F1F]">
              <AlertTriangle className="w-5 h-5 shrink-0 text-[#D98A2B]" />
              <p>
                <span className="font-semibold">
                  La caja se cerró automáticamente{s.closedAt ? ` el ${formatInstant(s.closedAt)}` : ""}.
                </span>{" "}
                Cargá lo que hay en cada cuenta para poder seguir operando.
              </p>
            </div>
            <AccountsTable s={s} />
            <div className={card}>
              <h2 className="font-heading font-bold text-base text-[#231E1A] mb-4">Hacer caja</h2>
              <CountForm session={s} onClosed={closed} />
            </div>
            <RowsTable s={s} />
          </>
        )}
      </main>

      {moving && s && (
        <MovementFormModal session={s} onClose={() => setMoving(false)} onDone={() => setMoving(false)} />
      )}

      {closing && s && (
        <Modal isOpen onClose={() => setClosing(false)} title="Hacer caja" maxWidth="max-w-2xl">
          <CountForm session={s} onClosed={closed} onCancel={() => setClosing(false)} />
        </Modal>
      )}

      {result && (
        <Modal isOpen onClose={() => setResult(null)} title="Resultado del cierre" maxWidth="max-w-4xl">
          <div className="flex flex-col gap-4 text-sm">
            {result.reconciled ? (
              <div className="flex items-center gap-2 rounded-xl bg-[#E3F1E8] text-[#286B3E] p-3.5 font-semibold">
                <CheckCircle2 className="w-5 h-5" /> La caja cuadra
              </div>
            ) : (
              <div className={`flex items-start gap-2 rounded-xl p-3.5 ${(result.totals.difference ?? 0) > 0
                ? "bg-[#E3F1E8] text-[#286B3E]" : "bg-[#F7E3DD] text-[#C0492F]"}`}>
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>
                  <span className="font-semibold">
                    {(result.totals.difference ?? 0) > 0 ? "Sobrante" : "Faltante"} de {diffText(result.totals.difference)}
                  </span>: revisá las
                  operaciones de la jornada para encontrar qué falta cargar.
                </span>
              </div>
            )}
            <AccountsTable s={result} />
            <Link href={`/caja/detalle?id=${result.sessionId}`} className="text-xs font-semibold text-[#9C5A2E] underline">
              Ver la jornada completa
            </Link>
          </div>
        </Modal>
      )}

      <ConfirmDeleteModal
        isOpen={!!voiding}
        onClose={() => setVoiding(null)}
        onConfirm={handleVoid}
        isLoading={busy}
        title="¿Anular movimiento?"
        confirmLabel="Anular"
        description={voiding ? `Se anulará el movimiento de ${money(voiding.amount)} y se revierte su efecto en las cuentas.` : undefined}
      />
    </>
  );
}

/** The store's very first session: today's balance of every live account (0 and negatives allowed). */
function FirstOpenForm({ busy, onOpen }: { busy: boolean; onOpen: (b: AccountAmount[]) => void }) {
  const accounts = useOptions<FinancialAccount>("/financial-accounts");
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = toAmounts(accounts.options.map((a) => ({ accountId: a.id, name: a.name })), amounts);
    setFormError("error" in r ? r.error : null);
    if ("amounts" in r) onOpen(r.amounts);
  };

  return (
    <form onSubmit={submit} className={`${card} flex flex-col gap-4 text-xs max-w-2xl`}>
      <div>
        <h2 className="font-heading font-bold text-lg text-[#231E1A]">Primera apertura de caja</h2>
        <p className="text-[#7A6F63] mt-1">
          Para empezar, cargá cuánto hay hoy en cada cuenta. Esto se hace una sola vez: las próximas aperturas
          arrancan con lo contado en el cierre anterior.
        </p>
      </div>
      <ApiErrorBanner error={accounts.error} onRetry={accounts.reload} />
      <div className="flex flex-col gap-3">
        {accounts.options.map((a) => (
          <div key={a.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,10rem)] gap-3 items-center">
            <label htmlFor={`initial-${a.id}`} className="min-w-0">
              <span className="font-semibold text-[#231E1A] block truncate">{a.name}</span>
              <span className="text-[11px] text-[#A89C8C]">{accountTypeLabel[a.type]}</span>
            </label>
            <input id={`initial-${a.id}`} type="number" step="0.01" inputMode="decimal" required
              value={amounts[a.id] ?? ""} onChange={(e) => setAmounts({ ...amounts, [a.id]: e.target.value })}
              className={inputCls} />
          </div>
        ))}
      </div>
      {formError && <ApiErrorBanner error={formError} />}
      <div>
        <button type="submit" disabled={busy || accounts.loading || accounts.options.length === 0} className={primaryBtn}>
          <LockOpen className="w-4 h-4" />
          <span>{busy ? "Abriendo…" : "Abrir caja"}</span>
        </button>
      </div>
    </form>
  );
}
