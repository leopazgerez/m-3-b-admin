"use client";

import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import { useStore } from "@/lib/store";
import { Sale, SaleItem } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { useState, useMemo } from "react";
import {
  Filter,
  Calendar,
  CreditCard,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Package,
  Layers,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react";

function parseDateToInputFormat(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (trimmed.toLowerCase().includes("hoy")) return new Date().toISOString().split("T")[0];

  // DD/MM/YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, "0")}-${ddmmyyyy[1].padStart(2, "0")}`;
  }

  // "19 Sep"
  const dayMonth = trimmed.match(/^(\d{1,2})\s+([a-zA-ZáéíóúÁÉÍÓÚ]+)/i);
  if (dayMonth) {
    const day = dayMonth[1].padStart(2, "0");
    const monthName = dayMonth[2].toLowerCase().slice(0, 3);
    const monthsMap: Record<string, string> = {
      ene: "01",
      feb: "02",
      mar: "03",
      abr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      ago: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dic: "12",
    };
    const month = monthsMap[monthName] || "09";
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${month}-${day}`;
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "Hoy";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthStr = months[month - 1] || "";
    return `${day} ${monthStr}`;
  }
  return isoDate;
}

export default function VentasPage() {
  const { sales, products, saleTypes, addSale, updateSale, deleteSale } = useStore();
  const [methodFilter, setMethodFilter] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);

  // Form states for Editing Sale
  const [clientName, setClientName] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState<"Completada" | "Pendiente" | "Cancelada">("Completada");
  const [saleDate, setSaleDate] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);

  // State to add a new item inside edit modal
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState("");
  const [selectedVariantIdToAdd, setSelectedVariantIdToAdd] = useState("");
  const [quantityToAdd, setQuantityToAdd] = useState(1);

  const openEditModal = (s: Sale) => {
    setEditingSale(s);
    setClientName(s.clientName);
    setMethod(s.method || saleTypes[0] || "Efectivo");
    setStatus(s.status);
    setSaleDate(parseDateToInputFormat(s.date));

    // Initialize items: preserve existing items array or fallback to legacy single product
    let initialItems: SaleItem[] = [];
    if (s.items && s.items.length > 0) {
      initialItems = s.items.map((it) => ({
        ...it,
        subtotal: it.subtotal || it.quantity * it.unitPrice,
      }));
    } else {
      const found = products.find((p) => p.name.toLowerCase() === s.productName.toLowerCase());
      initialItems = [
        {
          productId: found?.id || `prod-legacy-${Date.now()}`,
          productName: s.productName,
          sku: found?.sku || "VTA",
          quantity: 1,
          unitPrice: s.amount,
          subtotal: s.amount,
        },
      ];
    }

    setItems(initialItems);
    setSelectedProductIdToAdd("");
    setSelectedVariantIdToAdd("");
    setQuantityToAdd(1);
    setIsModalOpen(true);
  };

  const selectedProductToAdd = useMemo(() => {
    return products.find((p) => p.id === selectedProductIdToAdd) || null;
  }, [products, selectedProductIdToAdd]);

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        return {
          ...it,
          quantity: newQty,
          subtotal: newQty * it.unitPrice,
        };
      })
    );
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        return {
          ...it,
          unitPrice: newPrice,
          subtotal: it.quantity * newPrice,
        };
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert("La venta debe contener al menos un producto.");
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddItemToSale = () => {
    if (!selectedProductToAdd) return;

    let variantId: string | undefined = undefined;
    let variantName: string | undefined = undefined;
    let itemSku = selectedProductToAdd.sku;

    if (
      selectedProductToAdd.hasVariants &&
      selectedProductToAdd.variants &&
      selectedProductToAdd.variants.length > 0
    ) {
      const foundVar =
        selectedProductToAdd.variants.find((v) => v.id === selectedVariantIdToAdd) ||
        selectedProductToAdd.variants[0];
      if (foundVar) {
        variantId = foundVar.id;
        variantName = foundVar.name;
        itemSku = foundVar.sku;
      }
    }

    const qty = Math.max(1, Number(quantityToAdd) || 1);
    const unitPrice = selectedProductToAdd.price;

    const existingIdx = items.findIndex(
      (it) => it.productId === selectedProductToAdd.id && it.variantId === variantId
    );

    if (existingIdx >= 0) {
      handleUpdateItemQuantity(existingIdx, items[existingIdx].quantity + qty);
    } else {
      const newItem: SaleItem = {
        productId: selectedProductToAdd.id,
        variantId,
        variantName,
        productName: selectedProductToAdd.name,
        sku: itemSku,
        quantity: qty,
        unitPrice,
        subtotal: qty * unitPrice,
      };
      setItems((prev) => [...prev, newItem]);
    }

    setSelectedProductIdToAdd("");
    setSelectedVariantIdToAdd("");
    setQuantityToAdd(1);
  };

  const totalAmount = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.subtotal || it.quantity * it.unitPrice), 0);
  }, [items]);

  const totalQuantity = useMemo(() => {
    return items.reduce((acc, it) => acc + it.quantity, 0);
  }, [items]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || items.length === 0) return;

    const initials =
      clientName
        .trim()
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "CL";

    const summaryProductName =
      items.length === 1
        ? `${items[0].quantity}x ${items[0].productName}${
            items[0].variantName ? ` (${items[0].variantName})` : ""
          }`
        : `${items[0].productName} (+${items.length - 1} prod.)`;

    if (editingSale) {
      updateSale(editingSale.id, {
        clientName: clientName.trim(),
        clientInitials: initials,
        productName: summaryProductName,
        items,
        method: method || saleTypes[0] || "Efectivo",
        amount: totalAmount,
        paidAmount: status === "Completada" ? totalAmount : editingSale.paidAmount ?? 0,
        status,
        date: formatDisplayDate(saleDate),
      });
    }

    setIsModalOpen(false);
  };

  const filtered = sales.filter((s) => {
    const matchesSearch =
      s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === "Todos" || s.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const methods = ["Todos", ...saleTypes];

  return (
    <>
      <Topbar
        title="Ventas"
        subtitle="Registro y listado cronológico de operaciones comerciales"
        onSearch={setSearchTerm}
      />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full">
        {/* Filters and CTA bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <Filter className="w-4 h-4 text-[#A89C8C] shrink-0 mr-1" />
            {methods.map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  methodFilter === m
                    ? "bg-[#9C5A2E] text-white font-semibold shadow-xs"
                    : "bg-white border border-[#E7DFD2] text-[#7A6F63] hover:text-[#231E1A]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <Link
            href="/ventas/nueva"
            className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs self-start sm:self-auto cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva venta</span>
          </Link>
        </div>
        {/* List View */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[840px]">
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                <div className="w-16 shrink-0">ID</div>
                <div className="flex-1 min-w-[160px]">CLIENTE</div>
                <div className="flex-1 min-w-[160px]">PRODUCTO O SERVICIO</div>
                <div className="w-28 shrink-0">FECHA</div>
                <div className="w-36 shrink-0">MÉTODO</div>
                <div className="w-28 shrink-0 text-right">TOTAL</div>
                <div className="w-28 shrink-0 pl-4">ESTADO</div>
                <div className="w-20 shrink-0 text-center">ACCIONES</div>
              </div>

          <div className="divide-y divide-[#F7F3EC]">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-[#7A6F63] text-sm">
                No se encontraron ventas registradas.
              </div>
            ) : (
              filtered.map((s, idx) => (
                <div
                  key={s.id}
                  className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                >
                  <div className="w-16 shrink-0 font-mono text-xs text-[#A89C8C]">
                    #{String(idx + 1).padStart(4, "0")}
                  </div>

                  <div className="flex-1 min-w-[160px] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EADBC6] text-[#7A3F1F] flex items-center justify-center font-bold text-xs shrink-0">
                      {s.clientInitials}
                    </div>
                    <span className="font-semibold text-[#231E1A] truncate text-sm">
                      {s.clientName}
                    </span>
                  </div>

                  <div className="flex-1 min-w-[160px] flex flex-col min-w-0">
                    <span className="font-semibold text-[#231E1A] truncate text-xs">
                      {s.productName}
                    </span>
                    {s.items && s.items.length > 1 && (
                      <span className="text-[10px] text-[#9C5A2E] font-medium flex items-center gap-1 mt-0.5">
                        <ShoppingBag className="w-2.5 h-2.5 shrink-0" />
                        <span>{s.items.length} productos</span>
                      </span>
                    )}
                  </div>

                  <div className="w-28 shrink-0 text-[#7A6F63] flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                    <span>{s.date}</span>
                  </div>

                  <div className="w-36 shrink-0 text-[#7A6F63] flex items-center gap-1.5 truncate">
                    <CreditCard className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                    <span className="truncate">{s.method}</span>
                  </div>

                  <div className="w-28 shrink-0 text-right font-bold text-[#231E1A] text-sm whitespace-nowrap">
                    ${s.amount.toLocaleString("es-AR")}
                  </div>

                  <div className="w-28 shrink-0 pl-4">
                    <Badge
                      variant={
                        s.status === "Completada"
                          ? "success"
                          : s.status === "Pendiente"
                          ? "warning"
                          : "danger"
                      }
                    >
                      {s.status}
                    </Badge>
                  </div>

                  {/* Actions (Editar / Eliminar) */}
                  <div className="w-20 shrink-0 flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEditModal(s)}
                      title="Editar venta"
                      className="text-[#A89C8C] hover:text-[#9C5A2E] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingSale(s)}
                      title="Eliminar venta"
                      className="text-[#A89C8C] hover:text-[#C0492F] p-1.5 rounded-lg hover:bg-[#F7E3DD]/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Modificar Venta con Soporte Multi-Producto */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSale ? `Modificar venta ${editingSale.id ? `#${editingSale.id}` : ""}` : "Registrar venta"}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          {/* Header Data: Cliente, Fecha, Método, Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E7DFD2]">
            {/* Cliente */}
            <div>
              <label className="font-semibold text-[#231E1A] block mb-1">
                Cliente <span className="text-[#C0492F]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nombre del cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-white border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E]"
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="font-semibold text-[#231E1A] block mb-1">
                Fecha de la venta
              </label>
              <input
                type="date"
                required
                value={saleDate}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full bg-white border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] cursor-pointer"
              />
            </div>

            {/* Medio de pago */}
            <div>
              <label className="font-semibold text-[#231E1A] block mb-1">
                Medio de pago
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-white border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E]"
              >
                {saleTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="font-semibold text-[#231E1A] block mb-1">
                Estado de la venta
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "Completada" | "Pendiente" | "Cancelada")}
                className="w-full bg-white border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E]"
              >
                <option value="Completada">Completada</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          {/* List of Products in the Sale */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#231E1A] flex items-center gap-1.5 uppercase tracking-wide">
                <ShoppingBag className="w-4 h-4 text-[#9C5A2E]" />
                <span>Productos en esta venta ({items.length})</span>
              </span>
              <span className="text-[11px] text-[#7A6F63]">
                Total articulos: <strong className="text-[#231E1A]">{totalQuantity} u.</strong>
              </span>
            </div>

            <div className="bg-white rounded-xl border border-[#E7DFD2] overflow-hidden divide-y divide-[#F7F3EC] shadow-2xs max-h-[220px] overflow-y-auto">
              {/* Header */}
              <div className="bg-[#FBF8F2] px-4 py-2 flex items-center gap-3 text-[10px] font-bold text-[#A89C8C] uppercase tracking-wider sticky top-0 z-10 border-b border-[#E7DFD2]">
                <div className="flex-1 min-w-[140px]">Producto / Modelo</div>
                <div className="w-24 shrink-0 text-center">Cantidad</div>
                <div className="w-24 shrink-0 text-right">Precio Unit.</div>
                <div className="w-24 shrink-0 text-right">Subtotal</div>
                <div className="w-10 shrink-0 text-center"></div>
              </div>

              {/* Items Rows */}
              {items.map((item, idx) => (
                <div
                  key={`${item.productId}-${item.variantId || idx}`}
                  className="px-4 py-2.5 flex items-center gap-3 hover:bg-[#FBF8F2]/50 transition-colors"
                >
                  {/* Product & Variant */}
                  <div className="flex-1 min-w-[140px] flex flex-col min-w-0">
                    <span className="font-semibold text-[#231E1A] text-xs truncate">
                      {item.productName}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.variantName && (
                        <span className="bg-[#EADBC6]/60 text-[#9C5A2E] text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-[#E7DFD2]/60">
                          <Layers className="w-2.5 h-2.5" />
                          <span>{item.variantName}</span>
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-[#A89C8C]">
                        {item.sku}
                      </span>
                    </div>
                  </div>

                  {/* Quantity with - / + */}
                  <div className="w-24 shrink-0 flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateItemQuantity(idx, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-5 h-5 rounded bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#EADBC6]/50 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItemQuantity(idx, Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-9 text-center font-bold text-xs bg-white border border-[#E7DFD2] rounded py-0.5 text-[#231E1A] outline-none focus:border-[#9C5A2E]"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateItemQuantity(idx, item.quantity + 1)}
                      className="w-5 h-5 rounded bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#EADBC6]/50 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {/* Unit Price */}
                  <div className="w-24 shrink-0 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[#A89C8C] text-[11px]">$</span>
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItemPrice(idx, Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-16 text-right font-medium text-xs bg-white border border-[#E7DFD2] rounded py-0.5 px-1 text-[#231E1A] outline-none focus:border-[#9C5A2E]"
                      />
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="w-24 shrink-0 text-right font-bold text-[#231E1A] text-xs">
                    ${item.subtotal.toLocaleString("es-AR")}
                  </div>

                  {/* Remove */}
                  <div className="w-10 shrink-0 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      title="Quitar producto de la venta"
                      className="text-[#A89C8C] hover:text-[#C0492F] p-1 rounded hover:bg-[#F7E3DD]/40 transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Product Box */}
          <div className="bg-[#FAF7F2] border border-[#E7DFD2] p-3 rounded-xl flex flex-col gap-2">
            <span className="font-semibold text-xs text-[#231E1A] flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#9C5A2E]" />
              <span>Agregar otro producto a la venta</span>
            </span>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Product select */}
              <div className="flex-1 min-w-[180px]">
                <select
                  value={selectedProductIdToAdd}
                  onChange={(e) => {
                    setSelectedProductIdToAdd(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod && prod.hasVariants && prod.variants && prod.variants.length > 0) {
                      setSelectedVariantIdToAdd(prod.variants[0].id);
                    } else {
                      setSelectedVariantIdToAdd("");
                    }
                  }}
                  className="w-full bg-white border border-[#E7DFD2] rounded-xl px-3 py-1.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E]"
                >
                  <option value="">Seleccionar producto del catálogo...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.price.toLocaleString("es-AR")}{p.hasVariants && p.variants ? ` (${p.variants.length} modelos)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model/Variant select if product has variants */}
              {selectedProductToAdd?.hasVariants &&
                selectedProductToAdd.variants &&
                selectedProductToAdd.variants.length > 0 && (
                  <div className="w-full sm:w-44 shrink-0">
                    <select
                      value={selectedVariantIdToAdd}
                      onChange={(e) => setSelectedVariantIdToAdd(e.target.value)}
                      className="w-full bg-white border border-[#E7DFD2] rounded-xl px-2.5 py-1.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] font-medium"
                    >
                      {selectedProductToAdd.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {/* Quantity */}
              <div className="w-20 shrink-0">
                <input
                  type="number"
                  min="1"
                  placeholder="Cant."
                  value={quantityToAdd}
                  onChange={(e) => setQuantityToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white border border-[#E7DFD2] rounded-xl px-2.5 py-1.5 text-center text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E]"
                />
              </div>

              {/* Add Button */}
              <button
                type="button"
                disabled={!selectedProductIdToAdd}
                onClick={handleAddItemToSale}
                className="bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>
          </div>

          {/* Total Summary & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[#F7F3EC]">
            <div className="bg-[#FAF7F2] border border-[#E7DFD2] px-3.5 py-2 rounded-xl flex items-center gap-3">
              <span className="text-xs text-[#7A6F63]">Total de la orden:</span>
              <span className="font-heading font-bold text-base text-[#231E1A]">
                ${totalAmount.toLocaleString("es-AR")}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer text-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Guardar cambios</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal Reutilizable */}
      <ConfirmDeleteModal
        isOpen={!!deletingSale}
        onClose={() => setDeletingSale(null)}
        onConfirm={() => {
          if (deletingSale) {
            deleteSale(deletingSale.id);
          }
        }}
        title="¿Eliminar registro de venta?"
        itemName={deletingSale ? `Venta a ${deletingSale.clientName} por $${deletingSale.amount.toLocaleString("es-AR")}` : undefined}
      />
    </>
  );
}
