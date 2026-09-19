"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import { useStore } from "@/lib/store";
import { Product, SaleItem, Client } from "@/lib/types";
import { getAssetPath } from "@/lib/assets";
import {
  ScanBarcode,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  ArrowDownRight,
  CheckCircle2,
  DollarSign,
  Printer,
  RotateCcw,
  Camera,
  X,
  AlertCircle,
  Banknote,
  CreditCard,
  User,
  Package,
  Search,
  UserPlus,
  Check,
} from "lucide-react";

interface CartItem extends SaleItem {
  product: Product;
}

export default function NuevaVentaPosPage() {
  const router = useRouter();
  const { products, clients, saleTypes, addSale, addClient } = useStore();

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Scanner & Search input
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
  const [scanNotification, setScanNotification] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Client Association & Checkout State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientName, setClientName] = useState("Consumidor Final");
  const [isClientSearchModalOpen, setIsClientSearchModalOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    dni: "",
    phone: "",
    email: "",
  });
  const [newClientError, setNewClientError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState(saleTypes[0] || "Efectivo");
  const [amountPaid, setAmountPaid] = useState<string>("");

  // Filtered clients for search modal
  const filteredClients = clients.filter((c) => {
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.dni && c.dni.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const handleCreateNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.name.trim()) {
      setNewClientError("Por favor ingresá el nombre y apellido del cliente.");
      return;
    }

    const initials =
      newClientForm.name
        .trim()
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "CL";

    const created = addClient({
      name: newClientForm.name.trim(),
      initials,
      dni: newClientForm.dni.trim() || undefined,
      phone: newClientForm.phone.trim() || undefined,
      email: newClientForm.email.trim() || undefined,
    });

    setSelectedClient(created);
    setIsNewClientModalOpen(false);
    setScanNotification(`Cliente ${created.name} asociado`);
    setTimeout(() => setScanNotification(null), 2500);
  };

  // Camera Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Success Modal
  const [completedSale, setCompletedSale] = useState<{
    id: string;
    clientName: string;
    clientDni?: string;
    clientPhone?: string;
    items: CartItem[];
    subtotal: number;
    discount: number;
    total: number;
    method: string;
    paid: number;
    change: number;
    date: string;
  } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Focus scanner input on load
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Supermarket Beep sound using Web Audio API
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(940, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio not permitted or supported
    }
  };

  // Add Product to Cart by instance
  const addItemToCart = (product: Product, qty: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + qty,
                subtotal: (item.quantity + qty) * item.unitPrice,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: qty,
          unitPrice: product.price,
          subtotal: product.price * qty,
          product,
        },
      ];
    });

    playBeep();
    setScanNotification(`+${qty} ${product.name}`);
    setTimeout(() => setScanNotification(null), 2500);
    setScanError(null);
  };

  // Process barcode input (from scanner pistol or manual Enter)
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // Search exact SKU first, then name, or partial
    const match =
      products.find((p) => p.sku.toLowerCase() === query.toLowerCase()) ||
      products.find((p) => p.name.toLowerCase() === query.toLowerCase()) ||
      products.find((p) => p.sku.toLowerCase().includes(query.toLowerCase())) ||
      products.find((p) => p.name.toLowerCase().includes(query.toLowerCase()));

    if (match) {
      addItemToCart(match, 1);
      setBarcodeInput("");
      setSearchSuggestions([]);
      barcodeInputRef.current?.focus();
    } else {
      setScanError(`Producto con código "${query}" no encontrado`);
      setTimeout(() => setScanError(null), 3000);
    }
  };

  // Update suggestions on input
  const handleInputChange = (val: string) => {
    setBarcodeInput(val);
    if (!val.trim()) {
      setSearchSuggestions([]);
      return;
    }
    const filtered = products
      .filter(
        (p) =>
          p.sku.toLowerCase().includes(val.toLowerCase()) ||
          p.name.toLowerCase().includes(val.toLowerCase()) ||
          p.category.toLowerCase().includes(val.toLowerCase())
      )
      .slice(0, 6);
    setSearchSuggestions(filtered);
  };

  // Quantity controls
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.unitPrice,
            }
          : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setAmountPaid("");
    barcodeInputRef.current?.focus();
  };

  // Financial calculations
  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const discountAmount =
    discountType === "percent"
      ? (subtotal * discountValue) / 100
      : Math.min(subtotal, discountValue);

  const total = Math.max(0, subtotal - discountAmount);

  // Cash change calculation
  const numericPaid = parseFloat(amountPaid) || 0;
  const change = Math.max(0, numericPaid - total);

  // Camera Scanner Functions
  const startCamera = async () => {
    setCameraError(null);
    setIsScannerOpen(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("El navegador no permite acceso a la cámara.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      if ("BarcodeDetector" in window) {
        try {
          type BarcodeDetectorType = new (opts?: { formats: string[] }) => {
            detect: (target: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
          };
          const BarcodeDetectorClass = (window as unknown as { BarcodeDetector: BarcodeDetectorType }).BarcodeDetector;
          const barcodeDetector = new BarcodeDetectorClass({
            formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"],
          });

          scanIntervalRef.current = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const codeValue = barcodes[0].rawValue;
                  const matched = products.find(
                    (p) => p.sku.toLowerCase() === codeValue.toLowerCase()
                  );
                  if (matched) {
                    addItemToCart(matched, 1);
                    stopCamera();
                  }
                }
              } catch {
                // Ignore detection errors
              }
            }
          }, 300);
        } catch {}
      }
    } catch (err: unknown) {
      const isNotAllowed = err instanceof DOMException && err.name === "NotAllowedError";
      setCameraError(
        isNotAllowed
          ? "Permiso de cámara denegado. Habilita los permisos en tu navegador."
          : err instanceof Error ? err.message : "No se pudo iniciar la cámara."
      );
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScannerOpen(false);
    barcodeInputRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Finish sale checkout
  const handleCheckout = () => {
    if (cart.length === 0) return;

    const saleId = `sale-${cart.length}-${Math.floor(Math.random() * 100000)}`;
    const effectiveClientName = selectedClient ? selectedClient.name : (clientName.trim() || "Consumidor Final");
    const initials = selectedClient
      ? selectedClient.initials
      : effectiveClientName
          .trim()
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "CF";

    // Summary of products sold for backward compatibility
    const summaryProductName =
      cart.length === 1
        ? `${cart[0].quantity}x ${cart[0].productName}`
        : `${cart[0].productName} (+${cart.length - 1} productos)`;

    const saleRecord = {
      clientId: selectedClient?.id,
      clientName: effectiveClientName,
      clientInitials: initials,
      clientPhone: selectedClient?.phone,
      clientEmail: selectedClient?.email,
      clientDni: selectedClient?.dni,
      productName: summaryProductName,
      items: cart.map(({ productId, productName, sku, quantity, unitPrice, subtotal: itemSub }) => ({
        productId,
        productName,
        sku,
        quantity,
        unitPrice,
        subtotal: itemSub,
      })),
      date: "Hoy",
      method: selectedMethod,
      amount: total,
      status: "Completada" as const,
    };

    addSale(saleRecord);

    const now = new Date();
    const formattedDate = now.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    setCompletedSale({
      id: saleId,
      clientName: effectiveClientName,
      clientDni: selectedClient?.dni,
      clientPhone: selectedClient?.phone,
      items: [...cart],
      subtotal,
      discount: discountAmount,
      total,
      method: selectedMethod,
      paid: numericPaid || total,
      change,
      date: formattedDate,
    });
  };

  const startNewSale = () => {
    setCompletedSale(null);
    clearCart();
    setSelectedClient(null);
    setClientName("Consumidor Final");
    barcodeInputRef.current?.focus();
  };

  return (
    <>
      <Topbar
        title="Punto de Venta (POS)"
        subtitle="Caja de cobro y registro rápido de ventas estilo supermercado"
      />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full">
        {/* Navigation & Header Actions */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/ventas"
            className="flex items-center gap-2 text-xs font-semibold text-[#7A6F63] hover:text-[#231E1A] bg-white border border-[#E7DFD2] px-3.5 py-2 rounded-xl transition-all shadow-2xs hover:bg-[#FBF8F2]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Ventas</span>
          </Link>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="flex items-center gap-1.5 text-xs text-[#C0492F] hover:bg-[#F7E3DD]/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Vaciar compra ({totalItemsCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column POS Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Scanner Bar + Cart Ticket List (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Supermarket Fast Barcode Input Bar */}
            <div className="bg-white rounded-2xl border-2 border-[#9C5A2E]/30 p-4 shadow-xs relative">
              <form onSubmit={handleBarcodeSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <div className="relative flex-1 flex items-center">
                  <ScanBarcode className="w-5 h-5 text-[#9C5A2E] absolute left-3.5 pointer-events-none" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Escanear código de barras o escribir código / nombre..."
                    className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl pl-11 pr-10 py-3 text-xs sm:text-sm text-[#231E1A] font-medium outline-none focus:border-[#9C5A2E] focus:bg-white shadow-inner"
                  />
                  {barcodeInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setBarcodeInput("");
                        setSearchSuggestions([]);
                      }}
                      className="absolute right-3 text-[#A89C8C] hover:text-[#231E1A]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    title="Escanear con cámara"
                    className="flex-1 sm:flex-none bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] hover:text-[#9C5A2E] hover:border-[#9C5A2E] px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Cámara</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 sm:flex-none bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-5 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </div>
              </form>

              {/* Suggestions Popup when typing */}
              {searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-[#E7DFD2] shadow-xl z-30 overflow-hidden divide-y divide-[#F7F3EC]">
                  <div className="bg-[#FBF8F2] px-4 py-2 text-[11px] font-semibold text-[#A89C8C] flex justify-between items-center">
                    <span>PRODUCTOS COINCIDENTES ({searchSuggestions.length})</span>
                    <span>Tocar para sumar</span>
                  </div>
                  {searchSuggestions.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => {
                        addItemToCart(prod, 1);
                        setBarcodeInput("");
                        setSearchSuggestions([]);
                        barcodeInputRef.current?.focus();
                      }}
                      className="px-4 py-3 flex items-center justify-between hover:bg-[#FBF8F2] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#EADBC6] text-[#9C5A2E] flex items-center justify-center font-bold text-xs shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-[#231E1A] truncate">
                            {prod.name}
                          </span>
                          <span className="text-[10px] text-[#A89C8C] font-mono">
                            SKU: {prod.sku} • {prod.category} • Stock: {prod.stock}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-[#231E1A]">
                          ${prod.price.toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Feedback messages */}
              {scanNotification && (
                <div className="mt-2 text-xs font-semibold text-[#3E8E5A] flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{scanNotification}</span>
                </div>
              )}
              {scanError && (
                <div className="mt-2 text-xs font-semibold text-[#C0492F] flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{scanError}</span>
                </div>
              )}
            </div>

            {/* Cart Ticket: Responsive Container (Desktop Table + Mobile Cards) */}
            <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden">
              {cart.length === 0 ? (
                <div className="p-12 sm:p-16 flex flex-col items-center justify-center text-center text-[#7A6F63] gap-3">
                  <div className="w-16 h-16 rounded-full bg-[#FBF8F2] border border-[#E7DFD2] flex items-center justify-center text-[#A89C8C]">
                    <ShoppingCart className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <div className="flex flex-col gap-1 max-w-sm">
                    <span className="font-heading font-bold text-sm text-[#231E1A]">
                      Ticket de compra vacío
                    </span>
                    <p className="text-xs text-[#A89C8C]">
                      Apuntá el lector de código de barras al producto o escribí su SKU/nombre arriba para agregarlo a la compra.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* MOBILE VIEW (< 640px): Touch-friendly cards */}
                  <div className="sm:hidden divide-y divide-[#F7F3EC]">
                    {cart.map((item, idx) => (
                      <div key={item.productId} className="p-4 flex flex-col gap-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="font-mono text-xs text-[#A89C8C] mt-0.5">#{idx + 1}</span>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-[#231E1A] text-sm leading-snug">
                                {item.productName}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-[#A89C8C] mt-0.5">
                                <span className="font-mono">SKU: {item.sku}</span>
                                <span>•</span>
                                <span>${item.unitPrice.toLocaleString("es-AR")} c/u</span>
                              </div>
                              {item.product.stock <= item.quantity && (
                                <span className="text-[11px] text-[#C0492F] font-medium mt-0.5">
                                  Stock restante: {item.product.stock}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="text-[#A89C8C] hover:text-[#C0492F] p-1.5 rounded-lg hover:bg-[#F7E3DD]/50 transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#F7F3EC]/80">
                          {/* Large touch targets for quantities on mobile */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="w-9 h-9 rounded-xl bg-[#FBF8F2] border border-[#E7DFD2] text-[#231E1A] hover:bg-[#EADBC6] flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center font-bold text-sm text-[#231E1A]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="w-9 h-9 rounded-xl bg-[#FBF8F2] border border-[#E7DFD2] text-[#231E1A] hover:bg-[#EADBC6] flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-[#A89C8C] block uppercase font-medium">Subtotal</span>
                            <span className="font-bold text-base text-[#231E1A]">
                              ${item.subtotal.toLocaleString("es-AR")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP VIEW (>= 640px): Standard Supermarket Receipt Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <div className="min-w-[540px]">
                      <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                        <div className="w-10 text-center">#</div>
                        <div className="flex-1">PRODUCTO</div>
                        <div className="w-28 text-right">P. UNIT</div>
                        <div className="w-32 text-center">CANTIDAD</div>
                        <div className="w-28 text-right">SUBTOTAL</div>
                        <div className="w-12 text-center"></div>
                      </div>

                      <div className="divide-y divide-[#F7F3EC]">
                        {cart.map((item, idx) => (
                          <div
                            key={item.productId}
                            className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                          >
                            <div className="w-10 text-center font-mono text-[#A89C8C] text-xs">
                              {idx + 1}
                            </div>

                            <div className="flex-1 flex flex-col min-w-0">
                              <span className="font-semibold text-[#231E1A] text-sm truncate">
                                {item.productName}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-[#A89C8C]">
                                <span className="font-mono">SKU: {item.sku}</span>
                                {item.product.stock <= item.quantity && (
                                  <span className="text-[#C0492F] font-medium">
                                    (Stock restante: {item.product.stock})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="w-28 text-right text-[#7A6F63] font-medium">
                              ${item.unitPrice.toLocaleString("es-AR")}
                            </div>

                            {/* Quantity Controls */}
                            <div className="w-32 flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                className="w-7 h-7 rounded-lg bg-[#FBF8F2] border border-[#E7DFD2] text-[#231E1A] hover:bg-[#EADBC6] flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  updateQuantity(item.productId, val);
                                }}
                                className="w-10 text-center font-bold text-xs bg-white border border-[#E7DFD2] rounded-lg py-1 outline-none focus:border-[#9C5A2E]"
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                className="w-7 h-7 rounded-lg bg-[#FBF8F2] border border-[#E7DFD2] text-[#231E1A] hover:bg-[#EADBC6] flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="w-28 text-right font-bold text-[#231E1A] text-sm">
                              ${item.subtotal.toLocaleString("es-AR")}
                            </div>

                            <div className="w-12 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(item.productId)}
                                title="Eliminar del ticket"
                                className="text-[#A89C8C] hover:text-[#C0492F] p-1.5 rounded-lg hover:bg-[#F7E3DD]/50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Checkout Register Panel (4 cols) */}
          <div id="checkout-panel" className="lg:col-span-4 flex flex-col gap-4 scroll-mt-6">
            <div className="bg-[#211C18] text-[#F5EAD6] rounded-2xl border border-[#322A23] p-5 shadow-xl flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-[#322A23] pb-3">
                <span className="font-heading font-bold text-sm tracking-tight text-[#F5EAD6]">
                  Caja de Cobro
                </span>
                <span className="text-xs text-[#C9BCA9]">
                  {totalItemsCount} {totalItemsCount === 1 ? "artículo" : "artículos"}
                </span>
              </div>

              {/* Client Association Section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#C9BCA9] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#C87941]" />
                    <span>Cliente</span>
                  </label>
                  {selectedClient && (
                    <button
                      type="button"
                      onClick={() => setSelectedClient(null)}
                      className="text-[11px] text-[#A89C8C] hover:text-[#C0492F] transition-colors cursor-pointer"
                    >
                      Quitar
                    </button>
                  )}
                </div>

                {selectedClient ? (
                  <div className="bg-[#15110E] p-3 rounded-xl border border-[#322A23] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#EADBC6] text-[#7A3F1F] font-bold text-xs flex items-center justify-center shrink-0">
                        {selectedClient.initials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-xs text-[#F5EAD6] truncate">
                          {selectedClient.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-[#C9BCA9] truncate">
                          {selectedClient.dni && <span>DNI: {selectedClient.dni}</span>}
                          {selectedClient.phone && <span>• {selectedClient.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setClientSearchQuery("");
                        setIsClientSearchModalOpen(true);
                      }}
                      className="text-xs text-[#C87941] hover:text-[#F5EAD6] hover:underline cursor-pointer shrink-0 font-medium"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#15110E] p-3 rounded-xl border border-[#322A23] flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#322A23] text-[#A89C8C] font-semibold text-[11px] flex items-center justify-center shrink-0">
                          CF
                        </div>
                        <span className="text-xs text-[#F5EAD6] font-medium truncate">
                          Consumidor Final
                        </span>
                      </div>
                      <span className="text-[10px] text-[#A89C8C] bg-[#211C18] px-2 py-0.5 rounded-md border border-[#322A23]">
                        Sin registrar
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#322A23]/60">
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearchQuery("");
                          setIsClientSearchModalOpen(true);
                        }}
                        className="bg-[#211C18] hover:bg-[#322A23] text-[#F5EAD6] border border-[#322A23] py-2 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5 text-[#C87941]" />
                        <span>Buscar cliente</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNewClientForm({ name: "", dni: "", phone: "", email: "" });
                          setNewClientError(null);
                          setIsNewClientModalOpen(true);
                        }}
                        className="bg-[#9C5A2E]/20 hover:bg-[#9C5A2E]/30 text-[#F5EAD6] border border-[#9C5A2E]/40 py-2 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-[#C87941]" />
                        <span>+ Nuevo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#C9BCA9] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#C87941]" />
                  <span>Medio de pago</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {saleTypes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMethod(m)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border cursor-pointer truncate ${
                        selectedMethod === m
                          ? "bg-[#9C5A2E] text-white border-[#9C5A2E] font-semibold shadow-xs"
                          : "bg-[#15110E] text-[#C9BCA9] border-[#322A23] hover:border-[#A89C8C]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Register Calculator (When Efectivo is chosen) */}
              {selectedMethod === "Efectivo" && (
                <div className="bg-[#15110E] p-3.5 rounded-xl border border-[#322A23] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs text-[#C9BCA9]">
                    <span className="flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5 text-[#3E8E5A]" />
                      <span>Paga con ($):</span>
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-28 text-right bg-[#211C18] border border-[#322A23] rounded-lg px-2 py-1 text-xs font-bold text-white outline-none focus:border-[#3E8E5A]"
                    />
                  </div>

                  {/* Quick bill chips */}
                  {total > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setAmountPaid(total.toString())}
                        className="text-[10px] px-2 py-1 rounded bg-[#322A23] text-[#C9BCA9] hover:text-white cursor-pointer"
                      >
                        Exacto (${total.toLocaleString("es-AR")})
                      </button>
                      {[1000, 2000, 5000, 10000, 20000].map((denomination) => {
                        const nextRound = Math.ceil(total / denomination) * denomination;
                        if (nextRound === total) return null;
                        return (
                          <button
                            key={denomination}
                            type="button"
                            onClick={() => setAmountPaid(nextRound.toString())}
                            className="text-[10px] px-2 py-1 rounded bg-[#322A23] text-[#C9BCA9] hover:text-white cursor-pointer"
                          >
                            ${nextRound.toLocaleString("es-AR")}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {numericPaid > 0 && (
                    <div className="flex items-center justify-between border-t border-[#322A23] pt-2 text-xs">
                      <span className="text-[#C9BCA9] font-medium">Vuelto:</span>
                      <span
                        className={`font-bold text-sm ${
                          change >= 0 ? "text-[#3E8E5A]" : "text-[#C0492F]"
                        }`}
                      >
                        ${change.toLocaleString("es-AR")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Calculation Breakdown */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#322A23] text-xs">
                <div className="flex justify-between text-[#C9BCA9]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#F5EAD6]">
                    ${subtotal.toLocaleString("es-AR")}
                  </span>
                </div>

                {/* Optional discount toggle */}
                <div className="flex items-center justify-between text-[#C9BCA9]">
                  <span className="flex items-center gap-1">
                    <span>Descuento</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDiscountType(discountType === "percent" ? "fixed" : "percent")
                      }
                      className="text-[10px] text-[#C87941] underline cursor-pointer"
                    >
                      ({discountType === "percent" ? "%" : "$"})
                    </button>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max={discountType === "percent" ? 100 : subtotal}
                      value={discountValue || ""}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-16 text-right bg-[#15110E] border border-[#322A23] rounded-lg px-2 py-0.5 text-xs text-white outline-none focus:border-[#C87941]"
                    />
                    {discountAmount > 0 && (
                      <span className="text-[11px] text-[#C0492F]">
                        -${discountAmount.toLocaleString("es-AR")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Big Grand Total Display */}
                <div className="mt-3 p-4 bg-[#15110E] rounded-xl border border-[#322A23] flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-[#A89C8C] tracking-wider">
                    TOTAL A COBRAR
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold font-heading text-[#F5EAD6] tracking-tight">
                      ${total.toLocaleString("es-AR")}
                    </span>
                    <span className="text-xs text-[#C87941] font-medium">
                      ARS
                    </span>
                  </div>
                </div>
              </div>

              {/* Checkout Action Button */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleCheckout}
                className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                  cart.length === 0
                    ? "bg-[#322A23] text-[#7A6F63] cursor-not-allowed"
                    : "bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white shadow-[#9C5A2E]/20"
                }`}
              >
                <DollarSign className="w-5 h-5" />
                <span>Cobrar y Finalizar Venta</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Floating Checkout Summary Bar */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-[#211C18] text-white p-3.5 rounded-2xl border border-[#322A23] shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#C9BCA9]">{totalItemsCount} {totalItemsCount === 1 ? "artículo" : "artículos"}</span>
              <span className="text-lg font-bold font-heading text-[#F5EAD6]">
                ${total.toLocaleString("es-AR")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const checkoutEl = document.getElementById("checkout-panel");
                checkoutEl?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-transform"
            >
              <span>Ir a Cobrar</span>
              <ArrowDownRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* Barcode Camera Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#211C18] text-[#F5EAD6] rounded-2xl border border-[#322A23] w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#322A23]">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#C87941]" />
                <span className="font-heading font-bold text-sm text-[#F5EAD6]">
                  Escanear código de producto
                </span>
              </div>
              <button
                onClick={stopCamera}
                className="text-[#A89C8C] hover:text-[#F5EAD6] p-1 rounded-lg hover:bg-[#322A23] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black w-full h-72 flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center flex flex-col items-center gap-2 text-xs text-[#F7E3DD]">
                  <AlertCircle className="w-8 h-8 text-[#C0492F]" />
                  <p>{cameraError}</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-64 h-36 border-2 border-[#9C5A2E] rounded-xl relative flex items-center justify-center shadow-[0_0_15px_rgba(156,90,46,0.5)]">
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#F5EAD6]" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#F5EAD6]" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#F5EAD6]" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#F5EAD6]" />
                      <div className="w-full h-0.5 bg-[#C0492F] shadow-[0_0_8px_#C0492F] animate-pulse" />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-[#15110E] flex flex-col gap-3 text-xs">
              <p className="text-[11px] text-[#A89C8C] text-center">
                Apuntá la cámara al código de barras del producto. Al detectarlo, se sumará automáticamente.
              </p>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#322A23]">
                {products.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      addItemToCart(products[0], 1);
                      stopCamera();
                    }}
                    className="text-[11px] font-medium text-[#C87941] hover:underline cursor-pointer"
                  >
                    ⚡ Simular lectura ({products[0].sku})
                  </button>
                )}
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-1.5 rounded-lg bg-[#322A23] text-[#F5EAD6] hover:bg-[#9C5A2E] transition-all cursor-pointer text-xs"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sale Completion Ticket Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white text-[#231E1A] rounded-2xl border border-[#E7DFD2] w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-[#3E8E5A] text-white p-6 text-center flex flex-col items-center gap-2">
              <CheckCircle2 className="w-12 h-12 stroke-[2.2]" />
              <h3 className="font-heading font-bold text-lg">
                ¡Venta cobrada con éxito!
              </h3>
              <p className="text-xs text-white/90">
                La venta ha sido registrada e inventario descontado.
              </p>
            </div>

            {/* Ticket Printable Area */}
            <div className="p-6 flex flex-col gap-4 text-xs font-mono bg-[#FBF8F2] border-b border-[#E7DFD2]">
              <div className="text-center pb-3 border-b border-dashed border-[#D5C9B7] flex flex-col items-center">
                <img
                  src={getAssetPath("/favicon.png")}
                  alt="Mates Triple B"
                  className="w-10 h-10 rounded-full object-contain mb-1.5 border border-[#D5C9B7] bg-white p-0.5"
                />
                <p className="font-bold text-sm font-sans text-[#231E1A]">
                  MATES TRIPLE B
                </p>
                <p className="text-[11px] text-[#7A6F63]">Comprobante de Venta</p>
                <p className="text-[10px] text-[#A89C8C] mt-1">{completedSale.date}</p>
              </div>

              <div className="flex justify-between text-[#7A6F63]">
                <span>Cliente:</span>
                <span className="font-bold text-[#231E1A]">{completedSale.clientName}</span>
              </div>
              {completedSale.clientDni && (
                <div className="flex justify-between text-[#7A6F63]">
                  <span>DNI / CUIT:</span>
                  <span className="font-semibold text-[#231E1A]">{completedSale.clientDni}</span>
                </div>
              )}
              {completedSale.clientPhone && (
                <div className="flex justify-between text-[#7A6F63]">
                  <span>Teléfono:</span>
                  <span className="text-[#231E1A]">{completedSale.clientPhone}</span>
                </div>
              )}
              <div className="flex justify-between text-[#7A6F63]">
                <span>Medio de Pago:</span>
                <span className="font-semibold text-[#231E1A]">{completedSale.method}</span>
              </div>

              <div className="border-t border-dashed border-[#D5C9B7] pt-2 flex flex-col gap-1.5">
                {completedSale.items.map((it) => (
                  <div key={it.productId} className="flex justify-between items-start text-xs">
                    <span className="flex-1 pr-2 truncate">
                      {it.quantity}x {it.productName}
                    </span>
                    <span className="font-semibold text-[#231E1A]">
                      ${it.subtotal.toLocaleString("es-AR")}
                    </span>
                  </div>
                ))}
              </div>

              {completedSale.discount > 0 && (
                <div className="flex justify-between text-[#C0492F] pt-1 border-t border-dashed border-[#D5C9B7]">
                  <span>Descuento aplicado:</span>
                  <span>-${completedSale.discount.toLocaleString("es-AR")}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-bold font-sans text-[#231E1A] pt-2 border-t-2 border-[#231E1A]">
                <span>TOTAL COBRADO:</span>
                <span>${completedSale.total.toLocaleString("es-AR")}</span>
              </div>

              {completedSale.method === "Efectivo" && completedSale.paid > 0 && (
                <div className="flex flex-col gap-1 pt-1 text-[11px] text-[#7A6F63]">
                  <div className="flex justify-between">
                    <span>Abonó con:</span>
                    <span>${completedSale.paid.toLocaleString("es-AR")}</span>
                  </div>
                  <div className="flex justify-between text-[#3E8E5A] font-bold">
                    <span>Vuelto entregado:</span>
                    <span>${completedSale.change.toLocaleString("es-AR")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-white flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E7DFD2] text-xs font-semibold text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Ticket</span>
                </button>
                <button
                  type="button"
                  onClick={startNewSale}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Venta</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => router.push("/ventas")}
                className="text-center text-xs text-[#A89C8C] hover:text-[#231E1A] py-1 cursor-pointer"
              >
                Volver al listado de Ventas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Search Modal */}
      {isClientSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#211C18] text-[#F5EAD6] rounded-2xl border border-[#322A23] w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#322A23]">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#C87941]" />
                <span className="font-heading font-bold text-sm text-[#F5EAD6]">
                  Asociar Cliente a la Venta
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsClientSearchModalOpen(false)}
                className="text-[#A89C8C] hover:text-[#F5EAD6] p-1 rounded-lg hover:bg-[#322A23] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 border-b border-[#322A23]">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#A89C8C] absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, DNI, teléfono o email..."
                  className="w-full bg-[#15110E] border border-[#322A23] rounded-xl pl-9 pr-8 py-2.5 text-xs text-[#F5EAD6] outline-none focus:border-[#C87941]"
                />
                {clientSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setClientSearchQuery("")}
                    className="absolute right-2.5 text-[#A89C8C] hover:text-[#F5EAD6] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List of Clients */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#322A23] max-h-[50vh]">
              {/* Default Consumidor Final Option */}
              <div
                onClick={() => {
                  setSelectedClient(null);
                  setIsClientSearchModalOpen(false);
                }}
                className="px-4 py-3 flex items-center justify-between hover:bg-[#15110E] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#322A23] text-[#A89C8C] font-semibold text-xs flex items-center justify-center shrink-0">
                    CF
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#F5EAD6]">
                      Consumidor Final
                    </span>
                    <span className="text-[11px] text-[#A89C8C]">
                      Venta anónima sin asociar
                    </span>
                  </div>
                </div>
                {!selectedClient && (
                  <span className="text-[10px] bg-[#9C5A2E]/20 text-[#C87941] px-2 py-0.5 rounded border border-[#9C5A2E]/30 font-medium">
                    Seleccionado
                  </span>
                )}
              </div>

              {/* Filtered Clients */}
              {filteredClients.map((cli) => {
                const isSelected = selectedClient?.id === cli.id;
                return (
                  <div
                    key={cli.id}
                    onClick={() => {
                      setSelectedClient(cli);
                      setIsClientSearchModalOpen(false);
                    }}
                    className={`px-4 py-3 flex items-center justify-between hover:bg-[#15110E] cursor-pointer transition-colors ${
                      isSelected ? "bg-[#15110E]/80" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#EADBC6] text-[#7A3F1F] font-bold text-xs flex items-center justify-center shrink-0">
                        {cli.initials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#F5EAD6] truncate">
                            {cli.name}
                          </span>
                          {cli.dni && (
                            <span className="text-[10px] text-[#C9BCA9] bg-[#322A23] px-1.5 py-0.5 rounded font-mono">
                              DNI {cli.dni}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#A89C8C] truncate">
                          {cli.phone && <span>{cli.phone}</span>}
                          {cli.phone && cli.email && <span>•</span>}
                          {cli.email && <span className="truncate">{cli.email}</span>}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] bg-[#9C5A2E] text-white px-2 py-0.5 rounded font-medium shrink-0">
                        Activo
                      </span>
                    )}
                  </div>
                );
              })}

              {filteredClients.length === 0 && clientSearchQuery && (
                <div className="p-8 text-center flex flex-col items-center gap-3 text-xs text-[#A89C8C]">
                  <p>No se encontraron clientes con el término &quot;{clientSearchQuery}&quot;.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewClientForm({
                        name: clientSearchQuery,
                        dni: "",
                        phone: "",
                        email: "",
                      });
                      setNewClientError(null);
                      setIsClientSearchModalOpen(false);
                      setIsNewClientModalOpen(true);
                    }}
                    className="bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    + Registrar &quot;{clientSearchQuery}&quot; como cliente
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#15110E] border-t border-[#322A23] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setNewClientForm({ name: "", dni: "", phone: "", email: "" });
                  setNewClientError(null);
                  setIsClientSearchModalOpen(false);
                  setIsNewClientModalOpen(true);
                }}
                className="text-xs text-[#C87941] hover:text-[#F5EAD6] flex items-center gap-1.5 font-semibold cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Registrar nuevo cliente</span>
              </button>

              <button
                type="button"
                onClick={() => setIsClientSearchModalOpen(false)}
                className="bg-[#322A23] hover:bg-[#433930] text-[#F5EAD6] px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Quick Client Modal */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#211C18] text-[#F5EAD6] rounded-2xl border border-[#322A23] w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#322A23]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#C87941]" />
                <span className="font-heading font-bold text-sm text-[#F5EAD6]">
                  Nuevo Cliente
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsNewClientModalOpen(false)}
                className="text-[#A89C8C] hover:text-[#F5EAD6] p-1 rounded-lg hover:bg-[#322A23] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewClient} className="p-5 flex flex-col gap-4 overflow-y-auto">
              {newClientError && (
                <div className="bg-[#C0492F]/20 border border-[#C0492F]/40 text-[#F7E3DD] px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#C0492F] shrink-0" />
                  <span>{newClientError}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#C9BCA9]">
                  Nombre y Apellido <span className="text-[#C87941]">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newClientForm.name}
                  onChange={(e) =>
                    setNewClientForm({ ...newClientForm, name: e.target.value })
                  }
                  placeholder="Ej. Lucas Benítez"
                  className="w-full bg-[#15110E] border border-[#322A23] rounded-xl px-3.5 py-2.5 text-xs text-[#F5EAD6] outline-none focus:border-[#C87941]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#C9BCA9]">
                    DNI / CUIT (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newClientForm.dni}
                    onChange={(e) =>
                      setNewClientForm({ ...newClientForm, dni: e.target.value })
                    }
                    placeholder="Ej. 38.123.456"
                    className="w-full bg-[#15110E] border border-[#322A23] rounded-xl px-3.5 py-2.5 text-xs text-[#F5EAD6] outline-none focus:border-[#C87941]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#C9BCA9]">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={newClientForm.phone}
                    onChange={(e) =>
                      setNewClientForm({ ...newClientForm, phone: e.target.value })
                    }
                    placeholder="Ej. +54 9 11 1234-5678"
                    className="w-full bg-[#15110E] border border-[#322A23] rounded-xl px-3.5 py-2.5 text-xs text-[#F5EAD6] outline-none focus:border-[#C87941]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#C9BCA9]">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) =>
                    setNewClientForm({ ...newClientForm, email: e.target.value })
                  }
                  placeholder="lucas@ejemplo.com"
                  className="w-full bg-[#15110E] border border-[#322A23] rounded-xl px-3.5 py-2.5 text-xs text-[#F5EAD6] outline-none focus:border-[#C87941]"
                />
              </div>

              <div className="pt-3 border-t border-[#322A23] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#322A23] hover:bg-[#433930] text-[#F5EAD6] text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar y Asociar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
