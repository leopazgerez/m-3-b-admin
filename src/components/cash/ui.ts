import { money } from "@/lib/format";

// Shared by the caja screens.
export const opt = (n: number | null) => (n === null ? "—" : money(n));
/** Counted − expected: positive = sobrante (green), negative = faltante (red), zero = cuadra. */
export const diffCls = (d: number | null) =>
  d === null ? "text-[#A89C8C]" : d > 0 ? "text-[#286B3E] font-bold" : d < 0 ? "text-[#C0492F] font-bold" : "text-[#231E1A] font-bold";
export const diffText = (d: number | null) => (d === null ? "—" : `${d > 0 ? "+" : ""}${money(d)}`);

export const inputCls =
  "w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white";
export const primaryBtn =
  "flex items-center justify-center gap-2 bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap disabled:opacity-60";
export const secondaryBtn =
  "flex items-center justify-center gap-2 bg-white border border-[#E7DFD2] hover:bg-[#FBF8F2] text-[#231E1A] px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer whitespace-nowrap";
export const cancelBtn = "px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer";
