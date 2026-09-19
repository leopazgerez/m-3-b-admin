"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  Wallet,
  Settings,
  LogOut,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Tag,
  CreditCard,
  ReceiptText,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getAssetPath } from "@/lib/assets";

export default function Sidebar() {
  const pathname = usePathname();
  const [gastosOpen, setGastosOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/gastos")) {
      setGastosOpen(true);
    }
    if (pathname.startsWith("/configuracion")) {
      setConfigOpen(true);
    }
  }, [pathname]);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Productos", href: "/productos", icon: Package },
    { name: "Clientes", href: "/clientes", icon: Users },
    { name: "Ventas", href: "/ventas", icon: ShoppingBag },
  ];

  const isGastosActive = pathname === "/gastos" || pathname.startsWith("/gastos/");
  const isIngresosActive = pathname === "/gastos/ingresos";
  const isEgresosActive = pathname === "/gastos/egresos";

  const isConfigActive = pathname === "/configuracion" || pathname.startsWith("/configuracion/");
  const isConfigProductoActive = pathname === "/configuracion/producto";
  const isConfigVentaActive = pathname === "/configuracion/venta";
  const isConfigGastosActive = pathname === "/configuracion/gastos";

  return (
    <aside className="w-[264px] bg-[#211C18] text-[#C9BCA9] flex flex-col h-screen shrink-0 p-6 select-none border-r border-[#322A23]">
      {/* Brand Header */}
      <div className="flex items-center gap-3 pb-6 pt-2">
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-md border border-[#322A23] p-0.5">
          <img
            src={getAssetPath("/favicon.png")}
            alt="Mates Triple B"
            className="w-full h-full object-contain rounded-lg"
          />
        </div>
        <div className="flex flex-col">
          <span className="font-heading font-bold text-[15px] text-[#F5EAD6] tracking-tight">
            Mates Triple B
          </span>
          <span className="text-[11px] text-[#C9BCA9]">Panel de gestión</span>
        </div>
      </div>

      {/* Navigation section */}
      <div className="text-[11px] font-semibold text-[#A89C8C] tracking-wider mb-2 px-1">
        GENERAL
      </div>

      <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-[#9C5A2E] text-[#F5EAD6] font-semibold shadow-sm"
                  : "text-[#C9BCA9] hover:bg-[#322A23] hover:text-[#F5EAD6] font-medium"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Gastos Accordion with Submenus */}
        <div>
          <button
            onClick={() => setGastosOpen(!gastosOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
              isGastosActive
                ? "bg-[#9C5A2E] text-[#F5EAD6] font-semibold shadow-sm"
                : "text-[#C9BCA9] hover:bg-[#322A23] hover:text-[#F5EAD6] font-medium"
            }`}
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 shrink-0" />
              <span>Gastos</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                gastosOpen ? "rotate-180 text-[#F5EAD6]" : "text-[#A89C8C]"
              }`}
            />
          </button>

          {gastosOpen && (
            <div className="pl-6 pt-1.5 pb-1 flex flex-col border-l border-[#322A23] ml-5 my-1 gap-1">
              <Link
                href="/gastos"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-all ${
                  pathname === "/gastos"
                    ? "bg-[#9C5A2E] text-[#F5EAD6] font-semibold"
                    : "text-[#C9BCA9] hover:text-[#F5EAD6] hover:bg-[#322A23]"
                }`}
              >
                <span>Todos los gastos</span>
              </Link>
              <Link
                href="/gastos/ingresos"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-all ${
                  isIngresosActive
                    ? "bg-[#9C5A2E] text-[#F5EAD6] font-semibold"
                    : "text-[#C9BCA9] hover:text-[#F5EAD6] hover:bg-[#322A23]"
                }`}
              >
                <TrendingUp className="w-4 h-4 text-[#3E8E5A]" />
                <span>Ingresos</span>
              </Link>
              <Link
                href="/gastos/egresos"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-all ${
                  isEgresosActive
                    ? "bg-[#9C5A2E] text-[#F5EAD6] font-semibold"
                    : "text-[#C9BCA9] hover:text-[#F5EAD6] hover:bg-[#322A23]"
                }`}
              >
                <TrendingDown className="w-4 h-4 text-[#C0492F]" />
                <span>Egresos</span>
              </Link>
            </div>
          )}
        </div>

        <div className="my-2 border-t border-[#322A23]" />

        {/* Configuración button: clicking the whole button toggles the submenus right below it */}
        <div>
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
              isConfigActive
                ? "bg-[#9C5A2E] text-[#F5EAD6] font-semibold shadow-sm"
                : "text-[#C9BCA9] hover:bg-[#322A23] hover:text-[#F5EAD6] font-medium"
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 shrink-0" />
              <span>Configuración</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                configOpen ? "rotate-180 text-[#F5EAD6]" : "text-[#A89C8C]"
              }`}
            />
          </button>

          {/* Submenus appearing right under the Configuración button */}
          {configOpen && (
            <div className="pl-6 pt-1.5 pb-1 flex flex-col border-l border-[#322A23] ml-5 my-1 gap-1">
              <Link
                href="/configuracion/producto"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-all ${
                  isConfigProductoActive
                    ? "bg-[#9C5A2E] text-[#F5EAD6] font-semibold"
                    : "text-[#C9BCA9] hover:text-[#F5EAD6] hover:bg-[#322A23]"
                }`}
              >
                <Tag className="w-4 h-4 text-[#C87941]" />
                <span>Producto</span>
              </Link>
              <Link
                href="/configuracion/venta"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-all ${
                  isConfigVentaActive
                    ? "bg-[#9C5A2E] text-[#F5EAD6] font-semibold"
                    : "text-[#C9BCA9] hover:text-[#F5EAD6] hover:bg-[#322A23]"
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#3E8E5A]" />
                <span>Venta</span>
              </Link>
              <Link
                href="/configuracion/gastos"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-all ${
                  isConfigGastosActive
                    ? "bg-[#9C5A2E] text-[#F5EAD6] font-semibold"
                    : "text-[#C9BCA9] hover:text-[#F5EAD6] hover:bg-[#322A23]"
                }`}
              >
                <ReceiptText className="w-4 h-4 text-[#D98A2B]" />
                <span>Gastos</span>
              </Link>
              <Link
                href="/configuracion"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-all ${
                  pathname === "/configuracion"
                    ? "bg-[#9C5A2E] text-[#F5EAD6] font-semibold"
                    : "text-[#C9BCA9] hover:text-[#F5EAD6] hover:bg-[#322A23]"
                }`}
              >
                <Settings className="w-4 h-4 text-[#A89C8C]" />
                <span>General</span>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* User Footer */}
      <div className="pt-4 border-t border-[#322A23] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center font-bold text-xs font-heading shadow-inner">
            LP
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-[#F5EAD6] leading-tight">
              Leonel Paz
            </span>
            <span className="text-[11px] text-[#A89C8C]">Administrador</span>
          </div>
        </div>
        <Link
          href="/login"
          title="Cerrar sesión"
          className="text-[#A89C8C] hover:text-[#F7E3DD] p-1.5 rounded-md hover:bg-[#322A23] transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </Link>
      </div>
    </aside>
  );
}
