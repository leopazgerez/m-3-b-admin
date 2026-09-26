"use client";

import React from "react";
import { SlidersHorizontal, RotateCcw, Calendar, X } from "lucide-react";

interface FilterPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  activeCount: number;
  onReset: () => void;
  // Date range props
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  // Optional date label
  dateLabel?: string;
  // Children for other filters
  children?: React.ReactNode;
  // Result count
  resultCount?: number;
}

export default function FilterPanel({
  isOpen,
  onToggle,
  activeCount,
  onReset,
  dateFrom = "",
  dateTo = "",
  onDateFromChange,
  onDateToChange,
  dateLabel = "Rango de fecha",
  children,
  resultCount,
}: FilterPanelProps) {
  // Preset handlers
  const setPresetToday = () => {
    const today = new Date().toISOString().split("T")[0];
    onDateFromChange?.(today);
    onDateToChange?.(today);
  };

  const setPresetLast7Days = () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const past = new Date(now.setDate(now.getDate() - 7)).toISOString().split("T")[0];
    onDateFromChange?.(past);
    onDateToChange?.(today);
  };

  const setPresetThisMonth = () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    onDateFromChange?.(firstDay);
    onDateToChange?.(today);
  };

  const clearDates = () => {
    onDateFromChange?.("");
    onDateToChange?.("");
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Trigger Button & Active Filters Pill */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
            isOpen || activeCount > 0
              ? "bg-[#9C5A2E] text-white border-[#9C5A2E]"
              : "bg-white border-[#E7DFD2] text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2]"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filtros</span>
          {activeCount > 0 && (
            <span
              className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center ${
                isOpen || activeCount > 0
                  ? "bg-white text-[#9C5A2E]"
                  : "bg-[#9C5A2E] text-white"
              }`}
            >
              {activeCount}
            </span>
          )}
        </button>

        {/* Quick Reset button if filters active */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#C0492F] hover:bg-[#F7E3DD]/40 border border-[#F2BDB3]/50 transition-colors cursor-pointer"
            title="Restablecer todos los filtros"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpiar filtros</span>
          </button>
        )}

        {/* Active Date badges if dates chosen and panel is closed */}
        {!isOpen && (dateFrom || dateTo) && (
          <span className="text-[11px] bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-[#9C5A2E]" />
            <span>
              {dateFrom && dateTo
                ? `${dateFrom} al ${dateTo}`
                : dateFrom
                ? `Desde ${dateFrom}`
                : `Hasta ${dateTo}`}
            </span>
            <button
              type="button"
              onClick={clearDates}
              className="hover:text-[#C0492F] cursor-pointer ml-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      {/* Expandable Filter Box */}
      {isOpen && (
        <div className="bg-white border border-[#E7DFD2] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-[#F7F3EC] pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#9C5A2E]" />
              <h4 className="font-heading font-bold text-xs sm:text-sm text-[#231E1A]">
                Filtros avanzados
              </h4>
              {resultCount !== undefined && (
                <span className="text-[11px] text-[#7A6F63] bg-[#FBF8F2] px-2 py-0.5 rounded-md border border-[#E7DFD2]">
                  {resultCount} resultado{resultCount === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="text-xs text-[#C0492F] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restablecer</span>
                </button>
              )}
              <button
                type="button"
                onClick={onToggle}
                className="text-[#A89C8C] hover:text-[#231E1A] p-1 rounded-lg hover:bg-[#FBF8F2] transition-colors cursor-pointer"
                title="Cerrar panel de filtros"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid with Rango de Fecha (Desde y Hasta) and Custom Properties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* Rango de Fecha: Desde */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-[#231E1A] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#9C5A2E]" />
                <span>Desde:</span>
              </label>
              <input
                type="date"
                value={dateFrom}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                onChange={(e) => onDateFromChange?.(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer"
              />
            </div>

            {/* Rango de Fecha: Hasta */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-[#231E1A] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#9C5A2E]" />
                <span>Hasta:</span>
              </label>
              <input
                type="date"
                value={dateTo}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                onChange={(e) => onDateToChange?.(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer"
              />
            </div>

            {/* Injected custom filters */}
            {children}
          </div>

          {/* Quick Date Presets Bar */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#F7F3EC] flex-wrap text-xs">
            <span className="text-[11px] text-[#A89C8C] font-semibold uppercase tracking-wider mr-1">
              Atajos de fecha:
            </span>
            <button
              type="button"
              onClick={setPresetToday}
              className="px-2.5 py-1 rounded-lg bg-[#FBF8F2] hover:bg-[#EADBC6]/60 text-[#7A6F63] hover:text-[#231E1A] border border-[#E7DFD2] transition-colors cursor-pointer text-[11px]"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={setPresetLast7Days}
              className="px-2.5 py-1 rounded-lg bg-[#FBF8F2] hover:bg-[#EADBC6]/60 text-[#7A6F63] hover:text-[#231E1A] border border-[#E7DFD2] transition-colors cursor-pointer text-[11px]"
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              onClick={setPresetThisMonth}
              className="px-2.5 py-1 rounded-lg bg-[#FBF8F2] hover:bg-[#EADBC6]/60 text-[#7A6F63] hover:text-[#231E1A] border border-[#E7DFD2] transition-colors cursor-pointer text-[11px]"
            >
              Este mes
            </button>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={clearDates}
                className="text-[11px] text-[#C0492F] hover:underline ml-1 cursor-pointer font-medium"
              >
                Limpiar fechas
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
