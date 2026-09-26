"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import {
  Bell,
  AlertTriangle,
  XCircle,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  X,
  CreditCard,
  Boxes,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  type: "stock_critical" | "stock_warning" | "expense_pending" | "restock_info";
  category: "stock" | "gastos";
  title: string;
  description: string;
  time: string;
  actionLabel?: string;
  actionHref?: string;
}

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationsPopover({
  isOpen,
  onClose,
  onUnreadCountChange,
}: NotificationsPopoverProps) {
  const { products, expenses, stockMovements } = useStore();
  const popoverRef = useRef<HTMLDivElement>(null);

  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Generate dynamic notifications based on system data
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Productos totalmente agotados
    products
      .filter((p) => p.stock === 0)
      .forEach((p) => {
        list.push({
          id: `stock-empty-${p.id}`,
          type: "stock_critical",
          category: "stock",
          title: "Stock Agotado",
          description: `${p.name} (${p.sku}) no cuenta con unidades disponibles para la venta.`,
          time: "Inventario crítico",
          actionLabel: "Reponer",
          actionHref: `/stock?productId=${encodeURIComponent(p.id)}`,
        });
      });

    // 2. Modelos específicos agotados (si el producto tiene modelos individuales)
    products.forEach((p) => {
      if (p.hasVariants && p.variants && p.variants.length > 0 && p.stock > 0) {
        p.variants
          .filter((v) => v.stock === 0)
          .forEach((v) => {
            list.push({
              id: `stock-var-empty-${p.id}-${v.id}`,
              type: "stock_critical",
              category: "stock",
              title: "Modelo Agotado",
              description: `${p.name}: El modelo "${v.name}" se encuentra sin existencias.`,
              time: "Variante agotada",
              actionLabel: "Reponer modelo",
              actionHref: `/stock?productId=${encodeURIComponent(p.id)}&variantId=${encodeURIComponent(v.id)}`,
            });
          });
      }
    });

    // 3. Productos con bajo stock
    products
      .filter((p) => p.stock > 0 && p.stock <= (p.minStock || 10))
      .forEach((p) => {
        list.push({
          id: `stock-low-${p.id}`,
          type: "stock_warning",
          category: "stock",
          title: "Bajo Stock",
          description: `${p.name} tiene solo ${p.stock} u. restantes (umbral mínimo: ${p.minStock || 10} u.).`,
          time: "Alerta de stock",
          actionLabel: "Reponer",
          actionHref: `/stock?productId=${encodeURIComponent(p.id)}`,
        });
      });

    // 4. Cuotas de gastos pendientes o por vencer
    expenses.forEach((e) => {
      if (e.isInstallments && e.installments) {
        e.installments
          .filter((inst) => inst.status === "Pendiente")
          .forEach((inst) => {
            list.push({
              id: `expense-inst-${e.id}-${inst.id}`,
              type: "expense_pending",
              category: "gastos",
              title: "Cuota de Gasto Pendiente",
              description: `${e.description}: Cuota ${inst.number}/${e.totalInstallments} por $${inst.amount.toLocaleString("es-AR")} (Vencimiento: ${inst.dueDate}).`,
              time: `Vence ${inst.dueDate}`,
              actionLabel: "Ver gastos",
              actionHref: "/gastos",
            });
          });
      } else if (!e.isInstallments && e.status === "Pendiente") {
        list.push({
          id: `expense-pend-${e.id}`,
          type: "expense_pending",
          category: "gastos",
          title: "Gasto Pendiente de Pago",
          description: `${e.description} por $${e.amount.toLocaleString("es-AR")} (${e.category}).`,
          time: e.date || "Pendiente",
          actionLabel: "Ver gastos",
          actionHref: "/gastos",
        });
      }
    });

    // 5. Últimos movimientos de reposición registrados
    stockMovements.slice(0, 2).forEach((m) => {
      list.push({
        id: `stock-restock-${m.id}`,
        type: "restock_info",
        category: "stock",
        title: "Ingreso de Mercadería",
        description: `Se ingresaron +${m.quantity} u. de ${m.productName}${m.variantName ? ` (${m.variantName})` : ""}.`,
        time: m.date,
        actionLabel: "Ver stock",
        actionHref: "/stock",
      });
    });

    return list;
  }, [products, expenses, stockMovements]);

  // Filter out dismissed
  const visibleNotifications = useMemo(() => {
    return notifications.filter((n) => !dismissedIds.has(n.id));
  }, [notifications, dismissedIds]);



  // Unread items
  const unreadCount = useMemo(() => {
    return visibleNotifications.filter((n) => !readIds.has(n.id)).length;
  }, [visibleNotifications, readIds]);

  // Notify parent of unread count change
  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  // Close on outside click or Esc
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const markAllAsRead = () => {
    const allIds = new Set(readIds);
    visibleNotifications.forEach((n) => allIds.add(n.id));
    setReadIds(allIds);
  };

  const markSingleAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const dismissNotification = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2.5 w-[340px] sm:w-[420px] max-w-[calc(100vw-32px)] bg-white rounded-2xl border border-[#E7DFD2] shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 origin-top-right"
    >
      {/* Header */}
      <div className="p-4 bg-[#FBF8F2] border-b border-[#E7DFD2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#EADBC6] text-[#9C5A2E] flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm text-[#231E1A]">
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <span className="bg-[#C0492F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#7A6F63]">
              Alertas de inventario y compromisos de gastos
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-[11px] font-semibold text-[#9C5A2E] hover:text-[#7A3F1F] flex items-center gap-1 hover:underline cursor-pointer"
            title="Marcar todas como leídas"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Marcar leídas</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-[420px] overflow-y-auto divide-y divide-[#F7F3EC] bg-white">
        {visibleNotifications.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#EAF5EE] text-[#2D6A42] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-xs text-[#231E1A]">¡Estás al día!</h4>
            <p className="text-[11px] text-[#7A6F63] max-w-[220px]">
              No tienes alertas pendientes en este momento.
            </p>
          </div>
        ) : (
          visibleNotifications.map((item) => {
            const isRead = readIds.has(item.id);

            return (
              <div
                key={item.id}
                onClick={() => markSingleAsRead(item.id)}
                className={`p-3.5 flex items-start gap-3 transition-colors hover:bg-[#FBF8F2]/60 relative group ${
                  !isRead ? "bg-[#FAF7F2]/40" : ""
                }`}
              >
                {/* Unread indicator dot */}
                {!isRead && (
                  <span className="w-2 h-2 rounded-full bg-[#9C5A2E] absolute left-1.5 top-5 shrink-0" />
                )}

                {/* Icon based on notification type */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    item.type === "stock_critical"
                      ? "bg-[#F7E3DD] text-[#C0492F]"
                      : item.type === "stock_warning"
                      ? "bg-[#FBEFD9] text-[#D98A2B]"
                      : item.type === "expense_pending"
                      ? "bg-[#FDF3E7] text-[#9C5A2E]"
                      : "bg-[#EAF5EE] text-[#2D6A42]"
                  }`}
                >
                  {item.type === "stock_critical" ? (
                    <XCircle className="w-4 h-4" />
                  ) : item.type === "stock_warning" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : item.type === "expense_pending" ? (
                    <CreditCard className="w-4 h-4" />
                  ) : (
                    <Boxes className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-[#231E1A] truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-[#A89C8C] whitespace-nowrap">
                      {item.time}
                    </span>
                  </div>

                  <p className="text-xs text-[#7A6F63] mt-0.5 leading-snug">
                    {item.description}
                  </p>

                  {/* Actions row */}
                  <div className="flex items-center justify-between mt-2 pt-1">
                    {item.actionHref ? (
                      <Link
                        href={item.actionHref}
                        onClick={onClose}
                        className="text-[11px] font-semibold text-[#9C5A2E] hover:text-[#7A3F1F] flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>{item.actionLabel || "Ver detalle"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span />
                    )}

                    {/* Dismiss button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(item.id);
                      }}
                      className="text-[#A89C8C] hover:text-[#C0492F] p-1 rounded-md hover:bg-white transition-colors cursor-pointer"
                      title="Descartar notificación"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
