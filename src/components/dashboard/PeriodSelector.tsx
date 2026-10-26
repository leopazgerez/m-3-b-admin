"use client";

import type { DashboardPeriod } from "@/lib/reports";

const OPTIONS: { kind: DashboardPeriod["kind"]; label: string }[] = [
  { kind: "current", label: "Este mes" },
  { kind: "previous", label: "Mes anterior" },
  { kind: "custom", label: "Personalizado" },
];

export default function PeriodSelector({
  value,
  onChange,
  invalid = false,
}: {
  value: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
  invalid?: boolean;
}) {
  const custom = value.kind === "custom" ? value : { from: "", to: "" };
  const dateCls =
    "border border-[#E7DFD2] rounded-xl px-3 py-1.5 text-xs text-[#231E1A] bg-white focus:outline-none focus:border-[#9C5A2E]";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.kind}
          type="button"
          onClick={() => onChange(o.kind === "custom" ? { kind: "custom", ...custom } : { kind: o.kind })}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            value.kind === o.kind
              ? "bg-[#9C5A2E] text-white border-[#9C5A2E]"
              : "bg-white text-[#7A6F63] border-[#E7DFD2] hover:border-[#9C5A2E]/40"
          }`}
        >
          {o.label}
        </button>
      ))}
      {value.kind === "custom" && (
        <>
          <input
            type="date"
            aria-label="Desde"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className={dateCls}
          />
          <input
            type="date"
            aria-label="Hasta"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className={dateCls}
          />
          {invalid && <span className="text-xs text-[#C0492F]">Elegí un rango válido</span>}
        </>
      )}
    </div>
  );
}
