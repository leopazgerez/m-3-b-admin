"use client";

import { Search, Bell, Info } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
}

export default function Topbar({ title, subtitle, onSearch }: TopbarProps) {
  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedDate = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <header className="h-[73px] bg-white border-b border-[#E7DFD2] px-8 flex items-center justify-between shrink-0 shadow-xs">
      <div className="flex flex-col">
        <h1 className="font-heading font-bold text-xl text-[#231E1A] tracking-tight">
          {title}
        </h1>
        <p className="text-xs text-[#7A6F63]">
          {subtitle || formattedDate}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search Field */}
        <div className="flex items-center gap-2 bg-[#FBF8F2] border border-[#E7DFD2] rounded-full px-3.5 py-2 w-64 text-xs transition-focus focus-within:border-[#9C5A2E] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#EADBC6]/50">
          <Search className="w-4 h-4 text-[#A89C8C] shrink-0" />
          <input
            type="text"
            placeholder="Buscar productos, ventas..."
            onChange={(e) => onSearch && onSearch(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-[#231E1A] placeholder-[#A89C8C] text-xs"
          />
        </div>

        {/* Notifications */}
        <button
          title="Notificaciones"
          className="w-10 h-10 rounded-xl bg-[#FBF8F2] border border-[#E7DFD2] flex items-center justify-center text-[#7A6F63] hover:text-[#9C5A2E] hover:border-[#9C5A2E] transition-all relative"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#C0492F] absolute top-2.5 right-2.5" />
        </button>

        {/* Info */}
        <button
          title="Ayuda del sistema"
          className="w-10 h-10 rounded-xl bg-[#FBF8F2] border border-[#E7DFD2] flex items-center justify-center text-[#7A6F63] hover:text-[#9C5A2E] hover:border-[#9C5A2E] transition-all"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
