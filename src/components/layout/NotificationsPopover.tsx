"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { ApiErrorBanner } from "@/components/ui";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/useApi";
import { money, variantLabel } from "@/lib/format";
import { formatDate } from "@/lib/dateUtils";
import type { Alerts } from "@/lib/apiTypes";
import { installmentAlertLabel } from "@/lib/labels";
import { pruneReadIds } from "@/lib/reports";
import {
  Bell,
  AlertTriangle,
  XCircle,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  X,
  CreditCard,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  type: "stock_critical" | "stock_warning" | "expense_overdue";
  title: string;
  description: string;
  time: string;
  actionLabel: string;
  actionHref: string;
}

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

const READ_KEY = "mates_admin_notifications_read";

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    // storage unavailable: read state just won't survive a reload
  }
}

async function loadNotifications(): Promise<NotificationItem[]> {
  const { stock, installments } = await api.getOne<Alerts>("/reports/alerts", { days: 7 });
  return [
    ...stock.map((r): NotificationItem => {
      const label = variantLabel({ productName: r.product, variantName: r.variantName });
      return {
        id: `stock-${r.variantId}`,
        type: r.status === "OUT" ? "stock_critical" : "stock_warning",
        title: r.status === "OUT" ? "Sin stock" : "Bajo stock",
        description:
          r.status === "OUT"
            ? `${label} no tiene unidades disponibles para la venta.`
            : `${label} tiene ${r.onHand} u. (mínimo: ${r.minStock} u.).`,
        time: r.sku ?? "Stock",
        actionLabel: "Reponer",
        actionHref: `/stock?productId=${r.productId}&variantId=${r.variantId}`,
      };
    }),
    ...installments.map((i): NotificationItem => ({
      id: `installment-${i.expenseId}-${i.installmentNo}`,
      type: "expense_overdue",
      title: installmentAlertLabel[i.status],
      description: `${i.description} · cuota ${i.installmentNo}: ${money(i.pending)} (vence ${formatDate(i.dueDate)}).`,
      time: formatDate(i.dueDate),
      actionLabel: "Ver gasto",
      actionHref: `/gastos?expenseId=${i.expenseId}`,
    })),
  ];
}

export default function NotificationsPopover({
  isOpen,
  onClose,
  onUnreadCountChange,
}: NotificationsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const { data, error, reload } = useApiResource(loadNotifications, []);
  const notifications = useMemo(() => data ?? [], [data]);

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

  const markAsRead = (ids: string[]) => {
    const next = new Set(readIds);
    ids.forEach((id) => next.add(id));
    // prune only once alerts loaded, otherwise an empty list would wipe the read state
    const kept = data ? new Set(pruneReadIds([...next], notifications.map((n) => n.id))) : next;
    saveReadIds(kept);
    setReadIds(kept);
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
            onClick={() => markAsRead(visibleNotifications.map((n) => n.id))}
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
        {error ? (
          <div className="p-4">
            <ApiErrorBanner error={error} onRetry={reload} />
          </div>
        ) : !data ? (
          <div className="p-8 text-center text-xs text-[#7A6F63]">Cargando…</div>
        ) : visibleNotifications.length === 0 ? (
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
                onClick={() => markAsRead([item.id])}
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
                      : "bg-[#FDF3E7] text-[#9C5A2E]"
                  }`}
                >
                  {item.type === "stock_critical" ? (
                    <XCircle className="w-4 h-4" />
                  ) : item.type === "stock_warning" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
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
                    <Link
                      href={item.actionHref}
                      onClick={onClose}
                      className="text-[11px] font-semibold text-[#9C5A2E] hover:text-[#7A3F1F] flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>

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
