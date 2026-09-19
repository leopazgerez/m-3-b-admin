"use client";

import { Search, Bell, Info, Menu } from "lucide-react";
import { useSidebar } from "./SidebarContext";

interface TopbarProps {
  title: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
}

export default function Topbar({ title, subtitle, onSearch }: TopbarProps) {
  const { toggleSidebar } = useSidebar();

  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedDate = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <header className="h-16 sm:h-[73px] bg-white border-b border-[#E7DFD2] px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-xs z-30">
      {/* Left side: Hamburger (mobile) + Title & Subtitle */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
        {/* Mobile menu toggle button */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-1 text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] rounded-xl transition-colors shrink-0"
          title="Abrir menú"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="w-5 h-5 text-[#231E1A]" />
        </button>

        <div className="flex flex-col min-w-0">
          <h1 className="font-heading font-bold text-base sm:text-xl text-[#231E1A] tracking-tight truncate">
            {title}
          </h1>
          <p className="text-xs text-[#7A6F63] hidden sm:block truncate">
            {subtitle || formattedDate}
          </p>
        </div>
      </div>

      {/* Right side: Search + Notification & Info actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Search Field */}
        <div className="flex items-center gap-2 bg-[#FBF8F2] border border-[#E7DFD2] rounded-full px-3 py-1.5 sm:px-3.5 sm:py-2 w-36 sm:w-52 md:w-64 text-xs transition-focus focus-within:border-[#9C5A2E] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#EADBC6]/50">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A89C8C] shrink-0" />
          <input
            type="text"
            placeholder="Buscar..."
            onChange={(e) => onSearch && onSearch(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-[#231E1A] placeholder-[#A89C8C] text-xs"
          />
        </div>

        {/* Notifications */}
        <button
          type="button"
          title="Notificaciones"
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#FBF8F2] border border-[#E7DFD2] flex items-center justify-center text-[#7A6F63] hover:text-[#9C5A2E] hover:border-[#9C5A2E] transition-all relative shrink-0"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#C0492F] absolute top-2 sm:top-2.5 right-2 sm:right-2.5" />
        </button>

        {/* Info / Help (hidden on extra small screens) */}
        <button
          type="button"
          title="Ayuda del sistema"
          className="hidden sm:flex w-10 h-10 rounded-xl bg-[#FBF8F2] border border-[#E7DFD2] items-center justify-center text-[#7A6F63] hover:text-[#9C5A2E] hover:border-[#9C5A2E] transition-all shrink-0"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
