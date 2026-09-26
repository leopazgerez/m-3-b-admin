"use client";

import { useState, useMemo } from "react";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { useStore } from "@/lib/store";
import { Expense, ExpenseInstallment } from "@/lib/types";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import FilterPanel from "@/components/ui/FilterPanel";
import { isDateInRange } from "@/lib/dateUtils";
import {
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  Calendar,
  Tag,
  CreditCard,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Package,
  Layers,
  FileText,
  DollarSign,
  ChevronDown,
  Info,
  CalendarDays,
  Receipt,
  Building2,
  Boxes,
  Cpu,
} from "lucide-react";
import Link from "next/link";

const categoryIconMap: Record<string, typeof Tag> = {
  Equipamiento: Cpu,
  "Insumos/packaging": Boxes,
  Mercaderia: Package,
  Logistica: Truck,
  "Gastos propios": Building2,
};

const categoryBadgeMap: Record<
  string,
  { bg: string; text: string; border: string; iconBg: string }
> = {
  Equipamiento: {
    bg: "bg-[#EAE8F5]",
    text: "text-[#4B3F8A]",
    border: "border-[#C9C2EB]",
    iconBg: "bg-[#5D4EAE] text-white",
  },
  "Insumos/packaging": {
    bg: "bg-[#FDF3E7]",
    text: "text-[#A8581B]",
    border: "border-[#F3D1AE]",
    iconBg: "bg-[#D9772B] text-white",
  },
  Mercaderia: {
    bg: "bg-[#EBF5EE]",
    text: "text-[#286B3E]",
    border: "border-[#B8DEC3]",
    iconBg: "bg-[#2E7D47] text-white",
  },
  Logistica: {
    bg: "bg-[#EBF2F8]",
    text: "text-[#245D8C]",
    border: "border-[#B6D4EB]",
    iconBg: "bg-[#2B6EA3] text-white",
  },
  "Gastos propios": {
    bg: "bg-[#F6EEF5]",
    text: "text-[#7B326B]",
    border: "border-[#E7BEDF]",
    iconBg: "bg-[#8D3B7B] text-white",
  },
};

const defaultBadge = {
  bg: "bg-[#F5EAD6]",
  text: "text-[#7A3F1F]",
  border: "border-[#E7DFD2]",
  iconBg: "bg-[#9C5A2E] text-white",
};

const PAYMENT_METHODS = [
  "Efectivo",
  "Transferencia Bancaria",
  "Tarjeta de débito",
  "Tarjeta de crédito",
  "Mercado Pago",
  "Cheque",
  "Débito Automático",
  "Otro",
];

// Helper to add months to a YYYY-MM-DD string
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

// Format YYYY-MM-DD to DD/MM/YYYY
function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  if (dateStr.includes("/")) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default function GastosPage() {
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    payExpenseInstallment,
    products,
    suppliers,
    expenseCategories,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("Todas");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("Todos");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("Todos");
  const [selectedMethodFilter, setSelectedMethodFilter] = useState("Todos");

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  // Installments Inspector & Payment Modal state
  const [inspectingExpense, setInspectingExpense] = useState<Expense | null>(null);
  const [payingInstallment, setPayingInstallment] = useState<{
    expense: Expense;
    installment: ExpenseInstallment;
  } | null>(null);

  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[1]);
  const [payNotes, setPayNotes] = useState("");

  // Form states for Expense
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formType, setFormType] = useState<"Egreso" | "Ingreso">("Egreso");
  const [formAmount, setFormAmount] = useState<number | "">("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formStatus, setFormStatus] = useState<"Pagado" | "Pendiente">("Pagado");
  const [formPaymentMethod, setFormPaymentMethod] = useState(PAYMENT_METHODS[1]);
  const [formPaymentDate, setFormPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");

  // Mercadería specific fields
  const [formProductId, setFormProductId] = useState("");
  const [formSupplier, setFormSupplier] = useState("");

  // Cuotas fields
  const [formIsInstallments, setFormIsInstallments] = useState(false);
  const [formTotalInstallments, setFormTotalInstallments] = useState(3);
  const [formFirstDueDate, setFormFirstDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formFirstPaidNow, setFormFirstPaidNow] = useState(false);
  const [formFirstPaidMethod, setFormFirstPaidMethod] = useState(PAYMENT_METHODS[1]);

  const activeCategoryObj = useMemo(() => {
    return expenseCategories.find((c) => c.name === formCategory);
  }, [expenseCategories, formCategory]);

  const resetForm = () => {
    setEditingExpense(null);
    setFormDesc("");
    setFormCategory(expenseCategories[0]?.name || "Mercaderia");
    setFormType("Egreso");
    setFormAmount("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormStatus("Pagado");
    setFormPaymentMethod(PAYMENT_METHODS[1]);
    setFormPaymentDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setFormProductId("");
    setFormSupplier("");
    setFormIsInstallments(false);
    setFormTotalInstallments(3);
    setFormFirstDueDate(new Date().toISOString().split("T")[0]);
    setFormFirstPaidNow(false);
    setFormFirstPaidMethod(PAYMENT_METHODS[1]);
  };

  const openCreateModal = () => {
    resetForm();
    setIsExpenseModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormDesc(exp.description);
    setFormCategory(exp.category);
    setFormType(exp.type);
    setFormAmount(exp.amount);
    setFormDate(exp.date);
    setFormStatus(exp.status === "Pagado" ? "Pagado" : "Pendiente");
    setFormPaymentMethod(exp.paymentMethod || PAYMENT_METHODS[1]);
    setFormPaymentDate(exp.paymentDate || exp.date);
    setFormNotes(exp.notes || "");
    setFormProductId(exp.productId || "");
    setFormSupplier(exp.supplier || "");
    setFormIsInstallments(Boolean(exp.isInstallments));
    setFormTotalInstallments(exp.totalInstallments || 3);
    setFormFirstDueDate(exp.installments?.[0]?.dueDate || exp.date);
    setFormFirstPaidNow(exp.installments?.[0]?.status === "Pagado");
    setFormFirstPaidMethod(exp.installments?.[0]?.paidMethod || PAYMENT_METHODS[1]);
    setIsExpenseModalOpen(true);
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc.trim() || !formAmount || Number(formAmount) <= 0) return;

    const totalAmount = Number(formAmount);

    let installmentsList: ExpenseInstallment[] | undefined = undefined;
    let finalStatus: "Pagado" | "Pendiente" | "En cuotas" = formStatus;

    if (formIsInstallments && formTotalInstallments > 1) {
      const count = Number(formTotalInstallments);
      const installmentAmount = Math.round(totalAmount / count);
      installmentsList = [];

      for (let i = 1; i <= count; i++) {
        const dueDate = addMonths(formFirstDueDate, i - 1);
        const isFirstPaid = i === 1 && formFirstPaidNow;

        installmentsList.push({
          id: `inst-${Date.now()}-${i}`,
          number: i,
          amount: i === count ? totalAmount - installmentAmount * (count - 1) : installmentAmount,
          dueDate,
          status: isFirstPaid ? "Pagado" : "Pendiente",
          paidDate: isFirstPaid ? formPaymentDate : undefined,
          paidMethod: isFirstPaid ? formFirstPaidMethod : undefined,
          notes: isFirstPaid ? "Abonada al registrar gasto" : undefined,
        });
      }

      finalStatus = formFirstPaidNow && count === 1 ? "Pagado" : "En cuotas";
    }

    const selectedProd = products.find((p) => p.id === formProductId);

    const payload: Omit<Expense, "id"> = {
      description: formDesc.trim(),
      category: formCategory,
      type: formType,
      amount: totalAmount,
      date: formDate,
      status: finalStatus,
      paymentMethod: formIsInstallments ? undefined : formPaymentMethod,
      paymentDate: formIsInstallments ? undefined : formPaymentDate,
      productId: formCategory === "Mercaderia" && formProductId ? formProductId : undefined,
      productName:
        formCategory === "Mercaderia" && selectedProd ? selectedProd.name : undefined,
      supplier: formSupplier.trim() || undefined,
      isInstallments: formIsInstallments,
      totalInstallments: formIsInstallments ? formTotalInstallments : undefined,
      installments: installmentsList,
      notes: formNotes.trim() || undefined,
    };

    if (editingExpense) {
      updateExpense(editingExpense.id, payload);
    } else {
      addExpense(payload);
    }

    setIsExpenseModalOpen(false);
    resetForm();
  };

  const handleConfirmPayInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInstallment) return;

    payExpenseInstallment(
      payingInstallment.expense.id,
      payingInstallment.installment.id,
      {
        paidDate: payDate,
        paidMethod: payMethod,
        notes: payNotes.trim() || undefined,
      }
    );

    // Refresh inspected expense with latest state
    const updatedExp = expenses.find((e) => e.id === payingInstallment.expense.id);
    if (updatedExp) {
      setInspectingExpense(updatedExp);
    }

    setPayingInstallment(null);
    setPayNotes("");
  };

  const activeFilterCount =
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (selectedCategoryFilter !== "Todas" ? 1 : 0) +
    (selectedStatusFilter !== "Todos" ? 1 : 0) +
    (selectedTypeFilter !== "Todos" ? 1 : 0) +
    (selectedMethodFilter !== "Todos" ? 1 : 0);

  const handleResetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedCategoryFilter("Todas");
    setSelectedStatusFilter("Todos");
    setSelectedTypeFilter("Todos");
    setSelectedMethodFilter("Todos");
  };

  // Filtered expenses
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.supplier && e.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.productName && e.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategoryFilter === "Todas" || e.category === selectedCategoryFilter;

      const matchStatus =
        selectedStatusFilter === "Todos" || e.status === selectedStatusFilter;

      const matchType =
        selectedTypeFilter === "Todos" || e.type === selectedTypeFilter;

      const matchMethod =
        selectedMethodFilter === "Todos" ||
        e.paymentMethod === selectedMethodFilter ||
        (e.isInstallments &&
          e.installments?.some((inst) => inst.paidMethod === selectedMethodFilter));

      const matchDate = isDateInRange(e.date, dateFrom, dateTo);

      return (
        matchSearch &&
        matchCategory &&
        matchStatus &&
        matchType &&
        matchMethod &&
        matchDate
      );
    });
  }, [
    expenses,
    searchTerm,
    selectedCategoryFilter,
    selectedStatusFilter,
    selectedTypeFilter,
    selectedMethodFilter,
    dateFrom,
    dateTo,
  ]);

  // Statistics
  const totalEgreso = useMemo(() => {
    return expenses
      .filter((e) => e.type === "Egreso")
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const activeInstallmentsCount = useMemo(() => {
    return expenses.filter((e) => e.isInstallments && e.status === "En cuotas").length;
  }, [expenses]);

  return (
    <>
      <Topbar
        title="Gastos y Finanzas"
        subtitle="Control de compras, proveedores, mercadería y gastos en cuotas"
        onSearch={setSearchTerm}
      />

      <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl w-full">
        {/* Navigation & Actions Topbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-white border border-[#E7DFD2] p-1.5 rounded-xl shadow-2xs overflow-x-auto max-w-full">
            <Link
              href="/gastos"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#9C5A2E] text-white shadow-xs whitespace-nowrap"
            >
              Todos los movimientos
            </Link>
            <Link
              href="/gastos/ingresos"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-[#3E8E5A]" />
              <span>Ingresos</span>
            </Link>
            <Link
              href="/gastos/egresos"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-[#C0492F]" />
              <span>Egresos</span>
            </Link>
            <Link
              href="/configuracion/gastos"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-[#7A6F63] hover:text-[#231E1A] hover:bg-[#FBF8F2] transition-colors whitespace-nowrap"
            >
              <Tag className="w-3.5 h-3.5 text-[#D98A2B]" />
              <span>Categorías</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar gasto</span>
            </button>
          </div>
        </div>

        {/* Unified Filter Panel */}
        <FilterPanel
          isOpen={isFilterOpen}
          onToggle={() => setIsFilterOpen(!isFilterOpen)}
          activeCount={activeFilterCount}
          onReset={handleResetFilters}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          resultCount={filtered.length}
        >
          {/* Rubro / Categoría */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-[#231E1A] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#9C5A2E]" />
              <span>Rubro / Categoría:</span>
            </label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer"
            >
              {["Todas", ...expenseCategories.map((c) => c.name)].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-[#231E1A] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#9C5A2E]" />
              <span>Estado:</span>
            </label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Pagado">Pagado</option>
              <option value="En cuotas">En cuotas</option>
              <option value="Pendiente">Pendiente</option>
            </select>
          </div>

          {/* Tipo (Ingreso / Egreso) */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-[#231E1A] flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-[#9C5A2E]" />
              <span>Tipo:</span>
            </label>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Egreso">Egreso</option>
              <option value="Ingreso">Ingreso</option>
            </select>
          </div>

          {/* Forma de pago */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-[#231E1A] flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#9C5A2E]" />
              <span>Medio de pago:</span>
            </label>
            <select
              value={selectedMethodFilter}
              onChange={(e) => setSelectedMethodFilter(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white cursor-pointer"
            >
              <option value="Todos">Todos los medios</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </FilterPanel>

        {/* Table List (Maintains project essence: purely table list, NOT cards) */}
        <div className="bg-white rounded-2xl border border-[#E7DFD2] flex flex-col shadow-xs overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto w-full">
            <div className="min-w-[920px]">
              {/* Table Header */}
              <div className="bg-[#FBF8F2] px-6 py-3.5 flex items-center gap-4 text-[11px] font-semibold text-[#A89C8C] tracking-wide border-b border-[#E7DFD2]">
                <div className="flex-1 min-w-[220px]">CONCEPTO / DESCRIPCIÓN</div>
                <div className="w-36 shrink-0">CATEGORÍA</div>
                <div className="w-44 shrink-0">PROVEEDOR / PRODUCTO</div>
                <div className="w-32 shrink-0">FECHA / VTO.</div>
                <div className="w-40 shrink-0">PAGO / FINANCIACIÓN</div>
                <div className="w-32 shrink-0 text-right">MONTO TOTAL</div>
                <div className="w-32 shrink-0 text-center">ESTADO</div>
                <div className="w-24 shrink-0 text-center">ACCIONES</div>
              </div>

              {/* Table Body Rows */}
              <div className="divide-y divide-[#F7F3EC]">
                {filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EAD6] flex items-center justify-center mx-auto mb-3 text-[#9C5A2E]">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-[#231E1A]">
                      No se encontraron gastos o movimientos
                    </p>
                    <p className="text-xs text-[#7A6F63] mt-1">
                      {searchTerm
                        ? `No hay coincidencias con "${searchTerm}".`
                        : "Comenzá registrando tu primer gasto comercial o de mercadería."}
                    </p>
                  </div>
                ) : (
                  filtered.map((m) => {
                    const IconComp = categoryIconMap[m.category] || Tag;
                    const badgeStyle = categoryBadgeMap[m.category] || defaultBadge;

                    // Cuotas calculation
                    const paidCount = m.installments
                      ? m.installments.filter((i) => i.status === "Pagado").length
                      : 0;
                    const totalCount = m.totalInstallments || m.installments?.length || 0;
                    const nextPending = m.installments?.find((i) => i.status === "Pendiente");

                    return (
                      <div
                        key={m.id}
                        className="px-6 py-4 flex items-center gap-4 text-xs hover:bg-[#FBF8F2]/60 transition-colors"
                      >
                        {/* Concept & Subtitle */}
                        <div className="flex-1 min-w-[220px] flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${badgeStyle.iconBg}`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[#231E1A] text-sm truncate">
                              {m.description}
                            </span>
                            {m.notes && (
                              <span className="text-[11px] text-[#A89C8C] truncate">
                                {m.notes}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Category Badge */}
                        <div className="w-36 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} truncate max-w-full`}
                          >
                            <IconComp className="w-3 h-3 shrink-0" />
                            <span className="truncate">{m.category}</span>
                          </span>
                        </div>

                        {/* Supplier / Product */}
                        <div className="w-44 shrink-0 flex flex-col justify-center">
                          {m.productName ? (
                            <span className="font-semibold text-[#231E1A] truncate flex items-center gap-1">
                              <Package className="w-3.5 h-3.5 text-[#9C5A2E] shrink-0" />
                              <span className="truncate">{m.productName}</span>
                            </span>
                          ) : null}
                          {m.supplier ? (
                            <span className="text-[11px] text-[#7A6F63] truncate flex items-center gap-1">
                              <Truck className="w-3 h-3 text-[#A89C8C] shrink-0" />
                              <span className="truncate">{m.supplier}</span>
                            </span>
                          ) : (
                            !m.productName && <span className="text-[#C9BCA9]">—</span>
                          )}
                        </div>

                        {/* Date or Next Due Date */}
                        <div className="w-32 shrink-0 flex flex-col justify-center">
                          {m.isInstallments && nextPending ? (
                            <>
                              <span className="text-[11px] text-[#C87941] font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Vto: {formatDate(nextPending.dueDate)}</span>
                              </span>
                              <span className="text-[10px] text-[#A89C8C]">
                                Creado: {formatDate(m.date)}
                              </span>
                            </>
                          ) : (
                            <span className="text-[#7A6F63] flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-[#A89C8C] shrink-0" />
                              <span>{formatDate(m.date)}</span>
                            </span>
                          )}
                        </div>

                        {/* Payment Method / Installments Pill */}
                        <div className="w-40 shrink-0 flex flex-col justify-center">
                          {m.isInstallments ? (
                            <button
                              type="button"
                              onClick={() => setInspectingExpense(m)}
                              className="inline-flex items-center gap-1.5 bg-[#FBF8F2] border border-[#E7DFD2] hover:border-[#9C5A2E] text-[#231E1A] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer w-fit"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-[#9C5A2E]" />
                              <span>
                                {paidCount}/{totalCount} cuotas
                              </span>
                              <span className="text-[10px] text-[#A89C8C]">▶</span>
                            </button>
                          ) : (
                            <span className="text-[#5A5040] text-xs font-medium truncate">
                              {m.paymentMethod || "Efectivo"}
                            </span>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="w-32 shrink-0 text-right">
                          <div
                            className={`font-heading font-bold text-sm ${
                              m.type === "Ingreso" ? "text-[#3E8E5A]" : "text-[#231E1A]"
                            }`}
                          >
                            {m.type === "Ingreso" ? "+" : "-"}${m.amount.toLocaleString("es-AR")}
                          </div>
                          {m.isInstallments && m.installments?.[0] && (
                            <div className="text-[10px] text-[#A89C8C] font-mono">
                              ${m.installments[0].amount.toLocaleString("es-AR")} / cuota
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="w-32 shrink-0 text-center">
                          {m.status === "Pagado" ? (
                            <span className="inline-flex items-center gap-1 bg-[#EBF5EE] text-[#286B3E] font-semibold px-2.5 py-0.5 rounded-full text-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Pagado</span>
                            </span>
                          ) : m.status === "En cuotas" ? (
                            <button
                              onClick={() => setInspectingExpense(m)}
                              className="inline-flex items-center gap-1 bg-[#FDF3E7] hover:bg-[#FBEFD9] text-[#A8581B] font-semibold px-2.5 py-0.5 rounded-full text-xs cursor-pointer transition-colors"
                            >
                              <Clock className="w-3 h-3" />
                              <span>En cuotas ({paidCount}/{totalCount})</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-[#F7E3DD] text-[#C0492F] font-semibold px-2.5 py-0.5 rounded-full text-xs">
                              <AlertCircle className="w-3 h-3" />
                              <span>Pendiente</span>
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="w-24 shrink-0 flex items-center justify-center gap-1">
                          {m.isInstallments && (
                            <button
                              onClick={() => setInspectingExpense(m)}
                              title="Ver plan de cuotas y registrar pago"
                              className="text-[#9C5A2E] hover:text-[#7A3F1F] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 transition-colors cursor-pointer"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(m)}
                            title="Modificar gasto"
                            className="text-[#7A6F63] hover:text-[#9C5A2E] p-1.5 rounded-lg hover:bg-[#EADBC6]/40 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingExpense(m)}
                            title="Eliminar gasto"
                            className="text-[#A89C8C] hover:text-[#C0492F] p-1.5 rounded-lg hover:bg-[#F7E3DD]/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal 1: Crear / Editar Gasto */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={editingExpense ? "Modificar gasto" : "Registrar nuevo gasto"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleExpenseSubmit} className="flex flex-col gap-4 text-xs">
          {/* Concepto & Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-semibold text-[#231E1A] block mb-1">
                Nombre / Concepto del gasto <span className="text-[#C0492F]">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej. Compra lote mates Torpedo, Grabadora láser, Alquiler taller..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-[#231E1A] block mb-1">
                Tipo de movimiento
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as "Egreso" | "Ingreso")}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white font-medium"
              >
                <option value="Egreso">Egreso (Salida)</option>
                <option value="Ingreso">Ingreso (Entrada)</option>
              </select>
            </div>
          </div>

          {/* Categoría Selector */}
          <div>
            <label className="font-semibold text-[#231E1A] block mb-1">
              Categoría a la que pertenece <span className="text-[#C0492F]">*</span>
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white font-semibold"
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Helper box with category description */}
            {activeCategoryObj?.description && (
              <div className="mt-1.5 p-2.5 rounded-xl bg-[#FBF8F2] border border-[#E7DFD2] text-[11px] text-[#7A6F63] flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-[#9C5A2E] shrink-0 mt-0.5" />
                <span>
                  <strong>Qué representa:</strong> {activeCategoryObj.description}
                </span>
              </div>
            )}
          </div>

          {/* Conditional: Si es Mercadería -> Selector de Producto y Proveedor */}
          {formCategory === "Mercaderia" && (
            <div className="bg-[#EBF5EE]/50 border border-[#B8DEC3] p-3.5 rounded-xl flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[#286B3E] font-semibold text-xs">
                <Package className="w-4 h-4" />
                <span>Detalle de Mercadería para Stock / Reventa</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#231E1A] block mb-1">
                    Seleccionar Producto vinculado (opcional)
                  </label>
                  <select
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value)}
                    className="w-full bg-white border border-[#B8DEC3] rounded-xl px-3.5 py-2 text-xs text-[#231E1A] outline-none focus:border-[#286B3E]"
                  >
                    <option value="">Ninguno / Compra general</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Stock actual: {p.stock}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-[#231E1A] block mb-1">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    list="suppliers-list"
                    placeholder="Ej. Taller Artesanal Salta..."
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full bg-white border border-[#B8DEC3] rounded-xl px-3.5 py-2 text-xs text-[#231E1A] outline-none focus:border-[#286B3E]"
                  />
                  <datalist id="suppliers-list">
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
          )}

          {/* Si NO es Mercadería -> Proveedor opcional */}
          {formCategory !== "Mercaderia" && (
            <div>
              <label className="font-semibold text-[#231E1A] block mb-1">
                Proveedor o Prestador (Opcional)
              </label>
              <input
                type="text"
                list="suppliers-list-gen"
                placeholder="Ej. Envases Modernos SRL, Telecom, Andreani..."
                value={formSupplier}
                onChange={(e) => setFormSupplier(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
              <datalist id="suppliers-list-gen">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
          )}

          {/* Monto & Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#231E1A] block mb-1">
                Monto Total ($) <span className="text-[#C0492F]">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-[#A89C8C] font-bold text-xs">$</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) =>
                    setFormAmount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#231E1A] block mb-1">
                Fecha del gasto / registro
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
            </div>
          </div>

          {/* Toggle: Gasto en Cuotas */}
          <div className="p-4 rounded-xl border border-[#E7DFD2] bg-[#FBF8F2]/60 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#9C5A2E]" />
                <div>
                  <span className="font-bold text-xs text-[#231E1A] block">
                    ¿Es un gasto financiado en cuotas?
                  </span>
                  <span className="text-[11px] text-[#7A6F63]">
                    Habilita el cronograma mensual para registrar y abonar cada cuota a futuro.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formIsInstallments}
                onChange={(e) => setFormIsInstallments(e.target.checked)}
                className="w-4 h-4 accent-[#9C5A2E] cursor-pointer"
              />
            </div>

            {/* If NOT installments */}
            {!formIsInstallments && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E7DFD2]">
                <div>
                  <label className="font-medium text-[#231E1A] block mb-1">
                    Estado del pago
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as "Pagado" | "Pendiente")
                    }
                    className="w-full bg-white border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E]"
                  >
                    <option value="Pagado">Pagado</option>
                    <option value="Pendiente">Pendiente de pago</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-[#231E1A] block mb-1">
                    Forma de pago
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full bg-white border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E]"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-[#231E1A] block mb-1">
                    Fecha en que se pagó
                  </label>
                  <input
                    type="date"
                    value={formPaymentDate}
                    onChange={(e) => setFormPaymentDate(e.target.value)}
                    className="w-full bg-white border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E]"
                  />
                </div>
              </div>
            )}

            {/* If YES installments */}
            {formIsInstallments && (
              <div className="flex flex-col gap-3 pt-2 border-t border-[#E7DFD2]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-medium text-[#231E1A] block mb-1">
                      Cantidad de cuotas
                    </label>
                    <select
                      value={formTotalInstallments}
                      onChange={(e) => setFormTotalInstallments(Number(e.target.value))}
                      className="w-full bg-white border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] font-semibold"
                    >
                      {[2, 3, 4, 6, 9, 12, 18, 24].map((n) => (
                        <option key={n} value={n}>
                          {n} cuotas mensuales
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-[#231E1A] block mb-1">
                      Fecha 1° Vencimiento
                    </label>
                    <input
                      type="date"
                      required
                      value={formFirstDueDate}
                      onChange={(e) => setFormFirstDueDate(e.target.value)}
                      className="w-full bg-white border border-[#E7DFD2] rounded-xl px-3 py-2 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E]"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#E7DFD2] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formFirstPaidNow}
                        onChange={(e) => setFormFirstPaidNow(e.target.checked)}
                        className="w-4 h-4 accent-[#9C5A2E]"
                      />
                      <span className="text-[11px] font-semibold text-[#231E1A]">
                        ¿1° cuota pagada hoy?
                      </span>
                    </label>
                  </div>
                </div>

                {formFirstPaidNow && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-2.5 rounded-xl border border-[#E7DFD2]">
                    <div>
                      <label className="font-medium text-[#231E1A] block mb-1">
                        Forma de pago de la 1° cuota
                      </label>
                      <select
                        value={formFirstPaidMethod}
                        onChange={(e) => setFormFirstPaidMethod(e.target.value)}
                        className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#9C5A2E]"
                      >
                        {PAYMENT_METHODS.map((pm) => (
                          <option key={pm} value={pm}>
                            {pm}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-medium text-[#231E1A] block mb-1">
                        Fecha de pago 1° cuota
                      </label>
                      <input
                        type="date"
                        value={formPaymentDate}
                        onChange={(e) => setFormPaymentDate(e.target.value)}
                        className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#9C5A2E]"
                      />
                    </div>
                  </div>
                )}

                {/* Live Preview of generated installments */}
                {formAmount && Number(formAmount) > 0 && (
                  <div className="bg-white rounded-xl border border-[#E7DFD2] p-3">
                    <span className="text-[11px] font-bold text-[#A89C8C] uppercase tracking-wider block mb-2">
                      Previsualización del Plan de Cuotas (
                      {formTotalInstallments} pagos de approx. $
                      {Math.round(Number(formAmount) / formTotalInstallments).toLocaleString(
                        "es-AR"
                      )}
                      ):
                    </span>
                    <div className="max-h-36 overflow-y-auto divide-y divide-[#F7F3EC] text-[11px]">
                      {Array.from({ length: formTotalInstallments }).map((_, idx) => {
                        const num = idx + 1;
                        const dueDate = addMonths(formFirstDueDate, idx);
                        const isPaid = num === 1 && formFirstPaidNow;
                        const approxAmount = Math.round(
                          Number(formAmount) / formTotalInstallments
                        );

                        return (
                          <div
                            key={num}
                            className="py-1.5 flex items-center justify-between text-[#231E1A]"
                          >
                            <span className="font-semibold">Cuota #{num}</span>
                            <span className="text-[#7A6F63]">
                              Vto: {formatDate(dueDate)}
                            </span>
                            <span className="font-bold">
                              ${approxAmount.toLocaleString("es-AR")}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                isPaid
                                  ? "bg-[#EBF5EE] text-[#286B3E]"
                                  : "bg-[#FDF3E7] text-[#A8581B]"
                              }`}
                            >
                              {isPaid ? "Pagada hoy" : "Pendiente"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="font-semibold text-[#231E1A] block mb-1">
              Notas u observaciones (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Número de factura, detalles del pedido, garantía o comprobante..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl p-3 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white resize-none"
            />
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3.5 bg-white/95 backdrop-blur-xs border-t border-[#F7F3EC] flex items-center justify-end gap-3 z-10">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#9C5A2E] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#7A3F1F] transition-all shadow-xs cursor-pointer text-xs flex items-center gap-1.5"
            >
              {editingExpense ? "Guardar cambios" : "Registrar gasto"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Plan de Cuotas Inspector */}
      {inspectingExpense && (
        <Modal
          isOpen={!!inspectingExpense}
          onClose={() => setInspectingExpense(null)}
          title="Plan y Registro de Cuotas"
          maxWidth="max-w-2xl"
        >
          <div className="flex flex-col gap-4 text-xs">
            {/* Summary Header */}
            <div className="bg-[#FBF8F2] border border-[#E7DFD2] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-sm text-[#231E1A] block">
                  {inspectingExpense.description}
                </span>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#7A6F63]">
                  <span className="bg-white border border-[#E7DFD2] px-2 py-0.5 rounded font-semibold text-[#9C5A2E]">
                    {inspectingExpense.category}
                  </span>
                  {inspectingExpense.supplier && (
                    <span>• Proveedor: {inspectingExpense.supplier}</span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-[#A89C8C] block uppercase font-semibold">
                  Monto Total Financiado
                </span>
                <span className="font-heading font-bold text-base text-[#231E1A]">
                  ${inspectingExpense.amount.toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            {/* Installments Progress Bar */}
            {inspectingExpense.installments && (
              <div className="bg-white border border-[#E7DFD2] p-3.5 rounded-xl flex flex-col gap-2">
                {(() => {
                  const total = inspectingExpense.installments.length;
                  const paid = inspectingExpense.installments.filter(
                    (i) => i.status === "Pagado"
                  ).length;
                  const percent = Math.round((paid / total) * 100);
                  const paidAmount = inspectingExpense.installments
                    .filter((i) => i.status === "Pagado")
                    .reduce((sum, i) => sum + i.amount, 0);

                  return (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#231E1A]">
                          Progreso del plan: {paid} de {total} cuotas abonadas ({percent}%)
                        </span>
                        <span className="font-bold text-[#286B3E]">
                          ${paidAmount.toLocaleString("es-AR")} de $
                          {inspectingExpense.amount.toLocaleString("es-AR")}
                        </span>
                      </div>
                      <div className="w-full bg-[#F7F3EC] h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#286B3E] h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Installments Table List */}
            <div className="border border-[#E7DFD2] rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-[#F7F3EC]">
              <div className="bg-[#FBF8F2] px-4 py-2.5 flex items-center justify-between text-[11px] font-semibold text-[#A89C8C] uppercase tracking-wider">
                <span>Cuota</span>
                <span>Vencimiento</span>
                <span>Monto</span>
                <span>Estado y Pago</span>
                <span className="text-right">Acción</span>
              </div>

              {inspectingExpense.installments?.map((inst) => {
                const isPaid = inst.status === "Pagado";
                return (
                  <div
                    key={inst.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FBF8F2]/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-[#FBF8F2] border border-[#E7DFD2] flex items-center justify-center font-bold text-xs text-[#231E1A]">
                        {inst.number}
                      </span>
                      <span className="font-bold text-xs text-[#231E1A]">
                        Cuota #{inst.number}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#7A6F63]">
                      <Calendar className="w-3.5 h-3.5 text-[#A89C8C]" />
                      <span>{formatDate(inst.dueDate)}</span>
                    </div>

                    <div className="font-heading font-bold text-xs text-[#231E1A]">
                      ${inst.amount.toLocaleString("es-AR")}
                    </div>

                    <div>
                      {isPaid ? (
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold text-[#286B3E] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Pagado</span>
                          </span>
                          <span className="text-[10px] text-[#A89C8C]">
                            {inst.paidDate ? formatDate(inst.paidDate) : ""} via{" "}
                            {inst.paidMethod || "Efectivo"}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-[#FDF3E7] text-[#A8581B] font-semibold px-2 py-0.5 rounded text-[11px]">
                          <Clock className="w-3 h-3" />
                          <span>Pendiente</span>
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      {isPaid ? (
                        <span className="text-[11px] text-[#286B3E] font-medium">✓ Al día</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPayingInstallment({
                              expense: inspectingExpense,
                              installment: inst,
                            });
                            setPayDate(new Date().toISOString().split("T")[0]);
                          }}
                          className="bg-[#9C5A2E] hover:bg-[#7A3F1F] text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-xs flex items-center gap-1"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Pagar cuota</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingExpense(null)}
                className="px-4 py-2 rounded-xl bg-[#FBF8F2] border border-[#E7DFD2] text-[#7A6F63] hover:text-[#231E1A] transition-colors cursor-pointer text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 3: Registrar Pago de Cuota */}
      {payingInstallment && (
        <Modal
          isOpen={!!payingInstallment}
          onClose={() => setPayingInstallment(null)}
          title={`Registrar Pago: Cuota #${payingInstallment.installment.number}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleConfirmPayInstallment} className="flex flex-col gap-4 text-xs">
            <div className="bg-[#FBF8F2] border border-[#E7DFD2] p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-[#231E1A] block">
                  {payingInstallment.expense.description}
                </span>
                <span className="text-[11px] text-[#7A6F63]">
                  Vencimiento: {formatDate(payingInstallment.installment.dueDate)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#A89C8C] block uppercase font-semibold">
                  Monto Cuota
                </span>
                <span className="font-heading font-bold text-base text-[#9C5A2E]">
                  ${payingInstallment.installment.amount.toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#231E1A] block mb-1">
                Fecha en que se abonó <span className="text-[#C0492F]">*</span>
              </label>
              <input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-[#231E1A] block mb-1">
                ¿Cómo pagaste la cuota? (Forma de pago) <span className="text-[#C0492F]">*</span>
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white font-medium"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#231E1A] block mb-1">
                Comprobante / Notas del pago (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Transferencia N° 849202, debitado de cuenta Galicia..."
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#E7DFD2] rounded-xl px-3.5 py-2.5 text-xs text-[#231E1A] outline-none focus:border-[#9C5A2E] focus:bg-white"
              />
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[#F7F3EC] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPayingInstallment(null)}
                className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-[#FBF8F2] transition-colors cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#286B3E] hover:bg-[#1E5230] text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-xs cursor-pointer text-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Pago de Cuota</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 4: Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={() => {
          if (deletingExpense) {
            deleteExpense(deletingExpense.id);
            setDeletingExpense(null);
          }
        }}
        title="¿Eliminar gasto?"
        itemName={deletingExpense?.description}
        description={
          deletingExpense
            ? `¿Estás seguro de que deseas eliminar este gasto de $${deletingExpense.amount.toLocaleString(
                "es-AR"
              )}? Esta acción no se puede deshacer.`
            : undefined
        }
      />
    </>
  );
}
