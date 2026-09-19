"use client";

import { useState, useRef, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { useStore } from "@/lib/store";
import { Product } from "@/lib/types";
import {
  Plus,
  Coffee,
  Filter,
  Trash2,
  Edit2,
  ScanBarcode,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function ProductosPage() {
  const { products, productCategories, addProduct, updateProduct, deleteProduct } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Confirm Delete Modal State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  // Barcode Camera Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName("");
    setSubtitle("");
    setSku("");
    setCategory(productCategories[0] || "Mates");
    setListPrice("");
    setPrice("");
    setStock("");
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSubtitle(p.subtitle);
    setSku(p.sku);
    setCategory(p.category);
    setListPrice(p.listPrice !== undefined ? p.listPrice.toString() : "");
    setPrice(p.price.toString());
    setStock(p.stock.toString());
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !price) return;

    const numStock = parseInt(stock) || 0;
    const status = numStock === 0 ? "Agotado" : numStock <= 10 ? "Bajo stock" : "En stock";
    const parsedListPrice = listPrice ? parseFloat(listPrice) : undefined;
    const parsedSalePrice = parseFloat(price);

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name,
        subtitle: subtitle || "Artesanal Mates Triple B",
        sku,
        category: category || productCategories[0] || "Mates",
        listPrice: parsedListPrice,
        price: parsedSalePrice,
        stock: numStock,
        status,
      });
    } else {
      addProduct({
        name,
        subtitle: subtitle || "Artesanal Mates Triple B",
        sku,
        category: category || productCategories[0] || "Mates",
        listPrice: parsedListPrice,
        price: parsedSalePrice,
        stock: numStock,
        status,
      });
    }

    setIsModalOpen(false);
  };

  // Start camera stream for barcode scanner
  const startCamera = async () => {
    setCameraError(null);
    setDetectedCode(null);
    setIsScannerOpen(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Tu navegador no soporta acceso a la cámara.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Check if native BarcodeDetector API is supported
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
                  setDetectedCode(codeValue);
                  setSku(codeValue);
                  setTimeout(() => {
                    stopCamera();
                  }, 800);
                }
              } catch {
                // Ignore detection frame error
              }
            }
          }, 300);
        } catch {
          // Barcode detector not supported or errored
        }
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
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
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleManualScanSimulation = () => {
    const simulatedCode = `779${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    setDetectedCode(simulatedCode);
    setSku(simulatedCode);
    setTimeout(() => {
      stopCamera();
    }, 600);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todas" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["Todas", ...productCategories];

  return (
    <>
      <Topbar
        title="Productos"
        subtitle="Control de inventario, precios y stock"
        onSearch={setSearchTerm}
      />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Categories Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <Filter className="w-4 h-4 text-[#A89C8C] shrink-0 mr-1" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-[#9C5A2E] text-white font-semibold shadow-xs"
                    : "bg-white border border-[#E7DFD2] text-[#7A6F63] hover:text-[#231E1A]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo producto</span>
          </button>
        </div>

        {/* Table Card (List Format) */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[820px]">
              {/* Header Row */}
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                <div className="flex-1 min-w-[200px]">PRODUCTO</div>
                <div className="w-32 shrink-0">CÓDIGO / SKU</div>
                <div className="w-28 shrink-0">CATEGORÍA</div>
                <div className="w-24 shrink-0 text-right">P. LISTA</div>
                <div className="w-28 shrink-0 text-right">P. VENTA</div>
                <div className="w-16 shrink-0 text-center">STOCK</div>
                <div className="w-28 shrink-0 pl-2">ESTADO</div>
                <div className="w-20 shrink-0 text-center">ACCIONES</div>
              </div>

              {/* Body Rows */}
              <div className="divide-y divide-[#F7F3EC]">
                {filteredProducts.length === 0 ? (
                  <div className="p-12 text-center text-[#7A6F63] text-sm">
                    No se encontraron productos con los filtros seleccionados.
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      className="px-6 py-3.5 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                    >
                      {/* Product Info */}
                      <div className="flex-1 min-w-[200px] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#EADBC6] flex items-center justify-center text-[#9C5A2E] shrink-0">
                          <Coffee className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-semibold text-[#231E1A] truncate text-sm">
                            {p.name}
                          </span>
                          <span className="text-[11px] text-[#A89C8C] truncate">
                            {p.subtitle}
                          </span>
                        </div>
                      </div>

                      {/* SKU / Código */}
                      <div className="w-32 shrink-0 text-[#7A6F63] font-mono text-xs flex items-center gap-1.5">
                        <ScanBarcode className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                        <span>{p.sku}</span>
                      </div>

                      {/* Category */}
                      <div className="w-28 shrink-0 text-[#7A6F63]">
                        <span className="bg-[#FBF8F2] border border-[#E7DFD2] px-2 py-0.5 rounded-md text-xs whitespace-nowrap">
                          {p.category}
                        </span>
                      </div>

                      {/* List Price */}
                      <div className="w-24 shrink-0 text-right text-[#7A6F63] text-xs font-medium whitespace-nowrap">
                        {p.listPrice ? `$${p.listPrice.toLocaleString("es-AR")}` : "—"}
                      </div>

                      {/* Sale Price */}
                      <div className="w-28 shrink-0 text-right font-bold text-[#231E1A] text-sm whitespace-nowrap">
                        ${p.price.toLocaleString("es-AR")}
                      </div>

                      {/* Stock */}
                      <div className="w-16 shrink-0 text-center font-medium text-[#231E1A] whitespace-nowrap">
                        {p.stock}
                      </div>

                      {/* Status */}
                      <div className="w-28 shrink-0 pl-2">
                        <Badge
                          variant={
                            p.status === "En stock"
                              ? "success"
                              : p.status === "Bajo stock"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {p.status}
                        </Badge>
                      </div>

                      {/* Actions (Editar / Eliminar con ConfirmDeleteModal) */}
                      <div className="w-20 shrink-0 flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Editar producto"
                          className="text-[#A89C8C] hover:text-[#9C5A2E] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(p)}
                          title="Eliminar producto"
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

      {/* Modal: Crear / Editar Producto */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Modificar producto" : "Crear nuevo producto"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div>
            <label className="font-medium text-[#231E1A] block mb-1">
              Nombre del producto
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Mate Camionero Alpaca"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
            />
          </div>

          <div>
            <label className="font-medium text-[#231E1A] block mb-1">
              Descripción o detalles
            </label>
            <input
              type="text"
              placeholder="Ej. Cuero vaqueta con virola lisa"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[#231E1A] block mb-1">
                Código
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  placeholder="MT-0150 o código de barras"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white font-mono"
                />
                <button
                  type="button"
                  onClick={startCamera}
                  title="Escanear código de barras con la cámara"
                  className="absolute right-1.5 p-1.5 text-[#7A6F63] hover:text-[#9C5A2E] hover:bg-[#EADBC6]/40 rounded-lg transition-colors cursor-pointer"
                >
                  <ScanBarcode className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="font-medium text-[#231E1A] block mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              >
                {productCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[#231E1A] block mb-1">
                Precio de lista ($)
              </label>
              <input
                type="number"
                placeholder="Ej. 12500"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
              <span className="text-[10px] text-[#A89C8C] mt-0.5 block">Costo base o lista</span>
            </div>

            <div>
              <label className="font-medium text-[#231E1A] block mb-1">
                Precio de venta ($) <span className="text-[#C0492F]">*</span>
              </label>
              <input
                type="number"
                required
                placeholder="Ej. 19500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
              <span className="text-[10px] text-[#A89C8C] mt-0.5 block">Precio al consumidor</span>
            </div>
          </div>

          {/* Margen comercial en vivo */}
          {listPrice && price && Number(listPrice) > 0 && Number(price) > 0 && (
            <div className="bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl p-2.5 flex items-center justify-between text-xs">
              <span className="text-[#7A6F63] font-medium">Margen sobre lista:</span>
              <span className="font-semibold text-[#3E8E5A]">
                +{Math.round(((Number(price) - Number(listPrice)) / Number(listPrice)) * 100)}%
                <span className="font-normal text-[#7A6F63] ml-1">
                  (+${(Number(price) - Number(listPrice)).toLocaleString("es-AR")} ganancia)
                </span>
              </span>
            </div>
          )}

          <div>
            <label className="font-medium text-[#231E1A] block mb-1">
              Stock disponible <span className="text-[#C0492F]">*</span>
            </label>
            <input
              type="number"
              required
              placeholder="20"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 mt-2 border-t border-[#F7F3EC]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer"
            >
              {editingProduct ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Barcode Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#211C18] text-[#F5EAD6] rounded-2xl border border-[#322A23] w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#322A23]">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#C87941]" />
                <span className="font-heading font-bold text-sm text-[#F5EAD6]">
                  Escanear código de barras
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

              {detectedCode && (
                <div className="absolute inset-0 bg-[#211C18]/90 flex flex-col items-center justify-center gap-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-10 h-10 text-[#3E8E5A]" />
                  <span className="text-xs text-[#C9BCA9]">¡Código detectado!</span>
                  <span className="font-mono font-bold text-lg text-[#F5EAD6]">
                    {detectedCode}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#15110E] flex flex-col gap-3 text-xs">
              <p className="text-[11px] text-[#A89C8C] text-center">
                Apuntá la cámara al código de barras del producto o etiqueta.
              </p>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#322A23]">
                <button
                  type="button"
                  onClick={handleManualScanSimulation}
                  className="text-[11px] font-medium text-[#C87941] hover:underline cursor-pointer"
                >
                  ⚡ Simular captura de código de barras
                </button>
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

      {/* Confirm Delete Modal Reutilizable */}
      <ConfirmDeleteModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={() => {
          if (deletingProduct) {
            deleteProduct(deletingProduct.id);
          }
        }}
        title="¿Eliminar producto?"
        itemName={deletingProduct?.name}
      />
    </>
  );
}
