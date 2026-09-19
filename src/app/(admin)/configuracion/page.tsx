"use client";

import Topbar from "@/components/layout/Topbar";
import { useState } from "react";
import { Save, Settings, Tag, CreditCard, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";

export default function ConfiguracionPage() {
  const { productCategories, saleTypes, expenseTypes } = useStore();
  const [storeName, setStoreName] = useState("Mates Triple B");
  const [cuit, setCuit] = useState("30-71829340-9");
  const [address, setAddress] = useState("Av. Corrientes 2450, CABA, Argentina");
  const [whatsapp, setWhatsapp] = useState("+54 9 11 5829-4102");
  const [saved, setSaved] = useState(false);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <>
      <Topbar
        title="Configuración"
        subtitle="Ajustes del sistema y datos generales del negocio"
      />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-4xl w-full">
        {/* Navigation Bar between Config Submenus */}
        <div className="flex items-center gap-2 bg-white border border-[#E7DFD2] p-1.5 rounded-xl shadow-2xs overflow-x-auto max-w-full">
          <Link
            href="/configuracion"
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#9C5A2E] text-white shadow-xs whitespace-nowrap"
          >
            General
          </Link>
          <Link
            href="/configuracion/producto"
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
          >
            Producto (Categorías)
          </Link>
          <Link
            href="/configuracion/venta"
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
          >
            Venta (Tipos)
          </Link>
          <Link
            href="/configuracion/gastos"
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
          >
            Gastos (Tipos)
          </Link>
        </div>

        {/* Quick summary cards for submenus */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/configuracion/producto"
            className="bg-white rounded-2xl border border-[#E7DFD2] p-5 flex items-center justify-between shadow-xs hover:border-[#9C5A2E] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-sm text-[#231E1A] group-hover:text-[#9C5A2E] transition-colors">
                  Categorías
                </span>
                <span className="text-[11px] text-[#7A6F63]">
                  {productCategories.length} activas
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/configuracion/venta"
            className="bg-white rounded-2xl border border-[#E7DFD2] p-5 flex items-center justify-between shadow-xs hover:border-[#9C5A2E] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E3F1E8] text-[#3E8E5A] flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-sm text-[#231E1A] group-hover:text-[#9C5A2E] transition-colors">
                  Tipos de Venta
                </span>
                <span className="text-[11px] text-[#7A6F63]">
                  {saleTypes.length} configurados
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/configuracion/gastos"
            className="bg-white rounded-2xl border border-[#E7DFD2] p-5 flex items-center justify-between shadow-xs hover:border-[#9C5A2E] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FBEFD9] text-[#D98A2B] flex items-center justify-center">
                <ReceiptText className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-sm text-[#231E1A] group-hover:text-[#9C5A2E] transition-colors">
                  Tipos de Gasto
                </span>
                <span className="text-[11px] text-[#7A6F63]">
                  {expenseTypes.length} rubros
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* General Settings Form */}
        <form
          onSubmit={handleSaveGeneral}
          className="bg-white rounded-2xl border border-[#E7DFD2] p-6 flex flex-col gap-5 shadow-xs"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-[#F7F3EC]">
            <div className="w-9 h-9 rounded-xl bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-heading font-bold text-base text-[#231E1A]">
                Información general de la tienda
              </h3>
              <p className="text-xs text-[#7A6F63]">
                Datos de identificación comercial y contacto
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[#231E1A] block mb-1.5">
                Nombre de la marca / tienda
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-[#231E1A] block mb-1.5">
                CUIT / Identificación tributaria
              </label>
              <input
                type="text"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-[#231E1A] block mb-1.5">
                Dirección del taller / showroom
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-[#231E1A] block mb-1.5">
                WhatsApp comercial
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#F7F3EC] mt-2">
            {saved ? (
              <span className="text-xs font-semibold text-[#3E8E5A]">
                ✓ Cambios guardados correctamente
              </span>
            ) : (
              <span className="text-xs text-[#A89C8C]">
                Los cambios se aplican de inmediato en los reportes
              </span>
            )}

            <button
              type="submit"
              className="flex items-center gap-2 bg-[#9C5A2E] text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar cambios</span>
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
