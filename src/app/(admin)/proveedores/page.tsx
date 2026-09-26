"use client";

import { useState, useMemo } from "react";
import Topbar from "@/components/layout/Topbar";
import Modal from "@/components/ui/Modal";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { useStore } from "@/lib/store";
import { Supplier } from "@/lib/types";
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  Truck,
  Package,
  Eye,
  User,
  FileText,
  Tag,
} from "lucide-react";

const CATEGORY_OPTIONS = [
  "Mates y accesorios",
  "Bombillas y virolas",
  "Yerba mate",
  "Accesorios importados",
  "Cueros y terminaciones",
  "Termos y frascos",
  "Packaging",
  "Otros",
];

const categoryBadge: Record<string, string> = {
  "Mates y accesorios": "bg-[#F5EAD6] text-[#7A3F1F] border-[#E7DFD2]",
  "Bombillas y virolas": "bg-[#E8F0E8] text-[#2E6B42] border-[#B5D9BF]",
  "Yerba mate": "bg-[#EAF4EA] text-[#2D7A3F] border-[#B5D9BF]",
  "Accesorios importados": "bg-[#E8EEF8] text-[#2B4FA8] border-[#B0C4E8]",
  "Cueros y terminaciones": "bg-[#F5EDE4] text-[#7A4921] border-[#E7DFD2]",
  "Termos y frascos": "bg-[#E8F3F8] text-[#1A6B8A] border-[#B0D9E8]",
  Packaging: "bg-[#F0EAF8] text-[#5B2D8A] border-[#D0B5E8]",
  Otros: "bg-[#F0EDE8] text-[#5A5040] border-[#E7DFD2]",
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

const avatarColors = [
  "bg-[#9C5A2E] text-[#F5EAD6]",
  "bg-[#2E6B42] text-[#EAF4EA]",
  "bg-[#2B4FA8] text-[#E8EEF8]",
  "bg-[#7A3F1F] text-[#F5EAD6]",
  "bg-[#1A6B8A] text-[#E8F3F8]",
  "bg-[#5B2D8A] text-[#F0EAF8]",
];

function getAvatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function ProveedoresPage() {
  const { suppliers, products, addSupplier, updateSupplier, deleteSupplier } = useStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formCategory, setFormCategory] = useState(CATEGORY_OPTIONS[0]);
  const [formNotes, setFormNotes] = useState("");

  const resetForm = () => {
    setFormName(""); setFormContact(""); setFormPhone("");
    setFormEmail(""); setFormCity(""); setFormCategory(CATEGORY_OPTIONS[0]); setFormNotes("");
  };

  const openCreate = () => { setEditingSupplier(null); resetForm(); setIsModalOpen(true); };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormName(s.name); setFormContact(s.contactName ?? ""); setFormPhone(s.phone ?? "");
    setFormEmail(s.email ?? ""); setFormCity(s.city ?? "");
    setFormCategory(s.category ?? CATEGORY_OPTIONS[0]); setFormNotes(s.notes ?? "");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    const payload: Omit<Supplier, "id"> = {
      name: formName.trim(),
      contactName: formContact.trim() || undefined,
      phone: formPhone.trim() || undefined,
      email: formEmail.trim() || undefined,
      city: formCity.trim() || undefined,
      category: formCategory || undefined,
      notes: formNotes.trim() || undefined,
    };
    if (editingSupplier) { updateSupplier(editingSupplier.id, payload); }
    else { addSupplier(payload); }
    setIsModalOpen(false); resetForm();
  };

  const handleDelete = () => {
    if (!deletingSupplier) return;
    deleteSupplier(deletingSupplier.id);
    setDeletingSupplier(null);
  };

  const productCountBySupplier = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) { if (p.supplier) map[p.supplier] = (map[p.supplier] ?? 0) + 1; }
    return map;
  }, [products]);

  const allCategories = useMemo((): string[] => {
    const cats = suppliers.map((s) => s.category).filter((c): c is string => !!c);
    return ["Todas", ...Array.from(new Set(cats))];
  }, [suppliers]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return suppliers.filter((s) => {
      const matchSearch = !q || s.name.toLowerCase().includes(q) ||
        (s.contactName?.toLowerCase().includes(q) ?? false) ||
        (s.city?.toLowerCase().includes(q) ?? false) ||
        (s.category?.toLowerCase().includes(q) ?? false);
      const matchCat = selectedCategory === "Todas" || s.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [suppliers, searchTerm, selectedCategory]);

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Proveedores" subtitle="Gestión y contacto de proveedores" />

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Truck, bg: "bg-[#F5EAD6]", iconColor: "text-[#9C5A2E]", label: "Total proveedores", value: suppliers.length },
            { icon: Tag, bg: "bg-[#EAF4EA]", iconColor: "text-[#2E6B42]", label: "Categorías", value: new Set(suppliers.map((s) => s.category).filter(Boolean)).size },
            { icon: Package, bg: "bg-[#E8EEF8]", iconColor: "text-[#2B4FA8]", label: "Con productos", value: suppliers.filter((s) => (productCountBySupplier[s.name] ?? 0) > 0).length },
          ].map(({ icon: Icon, bg, iconColor, label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-[#E7DFD2] p-4 flex items-center gap-3 shadow-xs">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-[11px] text-[#A89C8C] font-medium uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-[#231E1A] font-heading">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89C8C]" />
            <input
              type="text"
              placeholder="Buscar por nombre, contacto o ciudad…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E7DFD2] rounded-xl text-sm text-[#231E1A] placeholder-[#C9BCA9] outline-none focus:border-[#9C5A2E] transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {allCategories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all border ${
                  selectedCategory === cat
                    ? "bg-[#9C5A2E] text-white border-[#9C5A2E] shadow-xs"
                    : "bg-white text-[#7A6A5A] border-[#E7DFD2] hover:border-[#9C5A2E] hover:text-[#9C5A2E]"
                }`}>
                {cat}
              </button>
            ))}
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-[#9C5A2E] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs shrink-0 cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>Nuevo proveedor</span>
          </button>
        </div>

        {/* List Table */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[860px]">
              {/* Header */}
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                <div className="flex-1 min-w-[220px]">PROVEEDOR</div>
                <div className="w-36 shrink-0">CONTACTO</div>
                <div className="w-36 shrink-0">TELÉFONO / EMAIL</div>
                <div className="w-28 shrink-0">CIUDAD</div>
                <div className="w-32 shrink-0">CATEGORÍA</div>
                <div className="w-24 shrink-0 text-center">PRODUCTOS</div>
                <div className="w-24 shrink-0 text-center">ACCIONES</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#F7F3EC]">
                {filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EAD6] flex items-center justify-center mx-auto mb-3">
                      <Truck className="w-6 h-6 text-[#C9BCA9]" />
                    </div>
                    <p className="text-[#7A6A5A] text-sm font-medium">No se encontraron proveedores</p>
                    <p className="text-[#A89C8C] text-xs mt-1">
                      {searchTerm ? "Probá con otro término de búsqueda" : "Creá tu primer proveedor"}
                    </p>
                  </div>
                ) : (
                  filtered.map((s) => {
                    const productCount = productCountBySupplier[s.name] ?? 0;
                    const avatarColor = getAvatarColor(s.id);
                    const catStyle = categoryBadge[s.category ?? ""] ?? "bg-[#F0EDE8] text-[#5A5040] border-[#E7DFD2]";

                    return (
                      <div key={s.id}
                        className="px-6 py-3.5 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors">

                        {/* Supplier identity */}
                        <div
                          onClick={() => setViewingSupplier(s)}
                          className="flex-1 min-w-[220px] flex items-center gap-3 cursor-pointer group">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform ${avatarColor}`}>
                            {getInitials(s.name)}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-semibold text-[#231E1A] truncate text-sm group-hover:text-[#9C5A2E] transition-colors">
                              {s.name}
                            </span>
                            {s.notes && (
                              <span className="text-[11px] text-[#A89C8C] truncate leading-snug">{s.notes}</span>
                            )}
                          </div>
                        </div>

                        {/* Contact name */}
                        <div className="w-36 shrink-0 text-[#7A6A5A] truncate">
                          {s.contactName ? (
                            <span className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-[#A89C8C] shrink-0" />
                              <span className="truncate">{s.contactName}</span>
                            </span>
                          ) : (
                            <span className="text-[#C9BCA9]">—</span>
                          )}
                        </div>

                        {/* Phone / Email */}
                        <div className="w-36 shrink-0 flex flex-col gap-0.5">
                          {s.phone ? (
                            <a href={`tel:${s.phone}`}
                              className="flex items-center gap-1.5 text-[#7A6A5A] hover:text-[#9C5A2E] transition-colors truncate">
                              <Phone className="w-3 h-3 text-[#A89C8C] shrink-0" />
                              <span className="truncate text-[11px]">{s.phone}</span>
                            </a>
                          ) : null}
                          {s.email ? (
                            <a href={`mailto:${s.email}`}
                              className="flex items-center gap-1.5 text-[#7A6A5A] hover:text-[#9C5A2E] transition-colors truncate">
                              <Mail className="w-3 h-3 text-[#A89C8C] shrink-0" />
                              <span className="truncate text-[11px]">{s.email}</span>
                            </a>
                          ) : null}
                          {!s.phone && !s.email && <span className="text-[#C9BCA9]">—</span>}
                        </div>

                        {/* City */}
                        <div className="w-28 shrink-0 text-[#7A6A5A] truncate">
                          {s.city ? (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-[#A89C8C] shrink-0" />
                              <span className="truncate">{s.city}</span>
                            </span>
                          ) : (
                            <span className="text-[#C9BCA9]">—</span>
                          )}
                        </div>

                        {/* Category badge */}
                        <div className="w-32 shrink-0">
                          {s.category ? (
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${catStyle} truncate max-w-full`}>
                              {s.category}
                            </span>
                          ) : (
                            <span className="text-[#C9BCA9]">—</span>
                          )}
                        </div>

                        {/* Product count */}
                        <div className="w-24 shrink-0 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${
                            productCount > 0 ? "bg-[#F5EAD6] text-[#9C5A2E]" : "bg-[#F0EDE8] text-[#A89C8C]"
                          }`}>
                            <Package className="w-3 h-3" />
                            {productCount}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="w-24 shrink-0 flex items-center justify-center gap-1">
                          <button onClick={() => setViewingSupplier(s)}
                            title="Ver detalle"
                            className="text-[#A89C8C] hover:text-[#231E1A] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 transition-colors cursor-pointer">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(s)}
                            title="Editar"
                            className="text-[#A89C8C] hover:text-[#9C5A2E] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 transition-colors cursor-pointer">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeletingSupplier(s)}
                            title="Eliminar"
                            className="text-[#A89C8C] hover:text-[#C0492F] p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer count */}
          {filtered.length > 0 && (
            <div className="px-6 py-3 border-t border-[#F7F3EC] bg-[#FBF8F2] text-[11px] text-[#A89C8C]">
              Mostrando {filtered.length} de {suppliers.length} proveedores
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {viewingSupplier && (
        <Modal isOpen={!!viewingSupplier} onClose={() => setViewingSupplier(null)} title="Ficha del proveedor">
          <div className="flex flex-col gap-5 text-xs">
            {/* Header */}
            <div className="flex items-start gap-3.5 bg-[#FBF8F2] p-4 rounded-2xl border border-[#E7DFD2]">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${getAvatarColor(viewingSupplier.id)}`}>
                {getInitials(viewingSupplier.name)}
              </div>
              <div className="flex flex-col min-w-0 flex-1 gap-1">
                <span className="font-heading font-bold text-base text-[#231E1A]">{viewingSupplier.name}</span>
                {viewingSupplier.category && (
                  <span className={`inline-block self-start px-2 py-0.5 rounded-md text-[10px] font-semibold border ${categoryBadge[viewingSupplier.category] ?? "bg-[#F0EDE8] text-[#5A5040] border-[#E7DFD2]"}`}>
                    {viewingSupplier.category}
                  </span>
                )}
              </div>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Contacto", value: viewingSupplier.contactName, icon: User },
                { label: "Teléfono", value: viewingSupplier.phone, icon: Phone, href: viewingSupplier.phone ? `tel:${viewingSupplier.phone}` : undefined },
                { label: "Email", value: viewingSupplier.email, icon: Mail, href: viewingSupplier.email ? `mailto:${viewingSupplier.email}` : undefined },
                { label: "Ciudad", value: viewingSupplier.city, icon: MapPin },
              ].map(({ label, value, icon: Icon, href }) => (
                <div key={label} className="bg-white border border-[#E7DFD2] p-3 rounded-xl">
                  <span className="text-[10px] text-[#7A6F63] block uppercase tracking-wider mb-1">{label}</span>
                  {value ? (
                    href ? (
                      <a href={href} className="flex items-center gap-1.5 font-semibold text-[#231E1A] hover:text-[#9C5A2E] transition-colors">
                        <Icon className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                        <span className="truncate">{value}</span>
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 font-semibold text-[#231E1A]">
                        <Icon className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                        <span>{value}</span>
                      </span>
                    )
                  ) : (
                    <span className="text-[#C9BCA9]">Sin datos</span>
                  )}
                </div>
              ))}
            </div>

            {/* Products count */}
            <div className="bg-[#F5EAD6]/50 border border-[#E7DFD2] rounded-xl p-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[#7A6A5A] font-medium">
                <Package className="w-4 h-4 text-[#9C5A2E]" />
                Productos asociados
              </span>
              <span className="font-bold text-[#9C5A2E] text-base">{productCountBySupplier[viewingSupplier.name] ?? 0}</span>
            </div>

            {/* Notes */}
            {viewingSupplier.notes && (
              <div className="bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl p-3">
                <span className="text-[10px] text-[#7A6F63] block uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Notas internas
                </span>
                <p className="text-[#5A5040] leading-relaxed">{viewingSupplier.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1 border-t border-[#F7F3EC]">
              <button onClick={() => setViewingSupplier(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E7DFD2] text-sm text-[#7A6A5A] font-medium hover:bg-[#F5EAD6] transition-colors">
                Cerrar
              </button>
              <button onClick={() => { setViewingSupplier(null); openEdit(viewingSupplier); }}
                className="flex-1 py-2.5 rounded-xl bg-[#9C5A2E] text-white text-sm font-semibold hover:bg-[#7A3F1F] transition-colors">
                Editar proveedor
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingSupplier ? "Editar proveedor" : "Nuevo proveedor"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">
              Nombre del proveedor <span className="text-[#C0492F]">*</span>
            </label>
            <input required type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
              placeholder="Ej. Taller Artesanal Salta"
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">Persona de contacto</label>
              <input type="text" value={formContact} onChange={(e) => setFormContact(e.target.value)}
                placeholder="Nombre y apellido"
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">Teléfono</label>
              <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+54 11 1234-5678"
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">Email</label>
              <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                placeholder="proveedor@ejemplo.com"
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">Ciudad / Localidad</label>
              <input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)}
                placeholder="Ej. Salta, Salta"
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">Categoría</label>
            <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-colors">
              {CATEGORY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#231E1A] mb-1.5">Notas internas</label>
            <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Condiciones de pago, frecuencia de entrega, observaciones…"
              rows={3}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-sm text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white transition-colors resize-none" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 mt-1 border-t border-[#F7F3EC]">
            <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer">
              Cancelar
            </button>
            <button type="submit"
              className="bg-[#9C5A2E] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer">
              {editingSupplier ? "Guardar cambios" : "Crear proveedor"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={handleDelete}
        title="¿Eliminar proveedor?"
        description={`Estás por eliminar a "${deletingSupplier?.name}". Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
