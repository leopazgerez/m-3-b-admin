"use client";

import { Ban } from "lucide-react";
import { Badge } from "@/components/ui";
import { money } from "@/lib/format";
import { formatInstant } from "@/lib/dateUtils";
import { canVoid, signedAmount, voidedMovementIds } from "@/lib/cashSession";
import { accountTypeLabel, cashSessionRowKindLabel } from "@/lib/labels";
import type { CashSession, CashSessionRow } from "@/lib/apiTypes";
import { diffCls, diffText, opt } from "@/components/cash/ui";

/** On phones each figure is a "label: value" line of a card; from sm up, a table cell. */
function Fig({ label, children, cls = "" }: { label: string; children: React.ReactNode; cls?: string }) {
  return (
    <div className={`flex justify-between gap-3 sm:block sm:text-right ${cls}`}>
      <span className="sm:hidden text-[#A89C8C]">{label}</span>
      <span>{children}</span>
    </div>
  );
}

/** Per account: opening / in / out / expected, plus counted / difference once the session was counted. */
export function AccountsTable({ s }: { s: CashSession }) {
  const counted = s.accounts.some((a) => a.counted !== null);
  const cols = counted
    ? "sm:grid-cols-[minmax(0,2fr)_repeat(6,minmax(0,1fr))]"
    : "sm:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]";
  const row = `grid grid-cols-1 gap-1 sm:gap-4 sm:items-center px-4 sm:px-6 py-3 ${cols}`;
  const figs = (f: { opening: number; in: number; out: number; expected: number; counted: number | null; difference: number | null }) => (
    <>
      <Fig label="Apertura">{money(f.opening)}</Fig>
      <Fig label="Entró" cls="text-[#286B3E]">{money(f.in)}</Fig>
      <Fig label="Salió" cls="text-[#C0492F]">{money(f.out)}</Fig>
      <Fig label="Esperado" cls="font-bold text-[#231E1A]">{money(f.expected)}</Fig>
      {counted && <Fig label="Contado">{opt(f.counted)}</Fig>}
      {counted && <Fig label="Diferencia" cls={diffCls(f.difference)}>{diffText(f.difference)}</Fig>}
    </>
  );

  return (
    <div className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs overflow-hidden text-xs">
      <div className={`hidden sm:grid ${row} bg-[#FBF8F2] text-[11px] text-[#A89C8C] font-semibold tracking-wide border-b border-[#E7DFD2]`}>
        <div>CUENTA</div>
        <div className="text-right">APERTURA</div>
        <div className="text-right">ENTRÓ</div>
        <div className="text-right">SALIÓ</div>
        <div className="text-right">ESPERADO</div>
        {counted && <div className="text-right">CONTADO</div>}
        {counted && <div className="text-right">DIFERENCIA</div>}
      </div>
      <div className="divide-y divide-[#F7F3EC]">
        {s.accounts.map((a) => (
          <div key={a.accountId} className={row}>
            <div className="flex items-center gap-2 min-w-0 mb-1 sm:mb-0">
              <div className="min-w-0">
                <span className="font-bold text-sm text-[#231E1A] block truncate">{a.name}</span>
                <span className="text-[11px] text-[#A89C8C]">{accountTypeLabel[a.accountType]}</span>
              </div>
              {a.deleted && <Badge variant="danger">eliminada</Badge>}
            </div>
            {figs(a)}
          </div>
        ))}
        <div className={`${row} bg-[#FBF8F2] font-semibold`}>
          <div className="font-heading font-bold text-sm text-[#231E1A] mb-1 sm:mb-0">Total</div>
          {figs(s.totals)}
        </div>
      </div>
    </div>
  );
}

/** "Operaciones de la jornada": every money row of the session; voids show negative. onVoid → Anular on movements. */
export function RowsTable({ s, onVoid }: { s: CashSession; onVoid?: (r: CashSessionRow) => void }) {
  const voided = voidedMovementIds(s.rows);
  const name = (id: number | null) => s.accounts.find((a) => a.accountId === id)?.name ?? `Cuenta #${id}`;
  // money only enters (no from), only leaves (no to), or moves between two accounts
  const action = (r: CashSessionRow) =>
    r.fromAccountId === null ? `Ingreso hacia ${name(r.toAccountId)}`
      : r.toAccountId === null ? `Egreso desde ${name(r.fromAccountId)}`
        : `Pase de ${name(r.fromAccountId)} a ${name(r.toAccountId)}`;

  return (
    <div className="bg-white rounded-2xl border border-[#E7DFD2] shadow-xs overflow-hidden text-xs">
      <div className="px-4 sm:px-6 py-3.5 border-b border-[#E7DFD2] bg-[#FBF8F2] font-heading font-bold text-sm text-[#231E1A]">
        Operaciones de la jornada
      </div>
      {s.rows.length === 0 ? (
        <div className="p-8 text-center text-[#A89C8C]">Todavía no hay operaciones en esta jornada.</div>
      ) : (
        <div className="divide-y divide-[#F7F3EC]">
          {s.rows.map((r) => {
            const amount = signedAmount(r);
            return (
              <div key={`${r.kind}-${r.id}-${r.voidedHere}`}
                className="px-4 sm:px-6 py-3 flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-1.5">
                <div className="w-full sm:w-32 shrink-0 flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-[#231E1A]">{cashSessionRowKindLabel[r.kind]}</span>
                  {r.voidedHere && <Badge variant="danger">Anulación</Badge>}
                  {r.late && <Badge variant="warning">Cargado tarde</Badge>}
                </div>
                <div className="flex-1 min-w-0 text-[#7A6F63]">{action(r)}</div>
                <div className="sm:w-36 shrink-0 text-[#A89C8C]">{formatInstant(r.at)}</div>
                <div className={`ml-auto sm:w-28 shrink-0 text-right font-heading font-bold text-sm ${amount < 0 ? "text-[#C0492F]" : "text-[#231E1A]"}`}>
                  {money(amount)}
                </div>
                {onVoid && (
                  <div className="w-20 shrink-0 text-right">
                    {canVoid(r, voided) && (
                      <button type="button" onClick={() => onVoid(r)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[#A89C8C] hover:text-[#C0492F] hover:bg-[#F7E3DD]/50 cursor-pointer">
                        <Ban className="w-3.5 h-3.5" /> Anular
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
