"use client";

import React, { useEffect } from "react";
import { AlertTriangle, X, Trash2 } from "lucide-react";

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "¿Confirmar eliminación?",
  itemName,
  description,
  confirmLabel = "Eliminar definitivamente",
  cancelLabel = "Cancelar",
  isLoading = false,
}: ConfirmDeleteModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-[#E7DFD2] w-full max-w-md overflow-hidden shadow-xl animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F7F3EC]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F7E3DD] text-[#C0492F] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-base text-[#231E1A]">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A89C8C] hover:text-[#231E1A] p-1.5 rounded-lg hover:bg-[#FBF8F2] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-3 text-xs text-[#7A6F63]">
          {description ? (
            <p className="leading-relaxed">{description}</p>
          ) : (
            <p className="leading-relaxed">
              ¿Estás seguro de que deseas eliminar{" "}
              {itemName ? (
                <strong className="text-[#231E1A] font-semibold">"{itemName}"</strong>
              ) : (
                "este elemento"
              )}
              ? Esta acción no se puede deshacer y se removerá del sistema.
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#FBF8F2] border-t border-[#E7DFD2] text-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-[#7A6F63] hover:bg-white hover:border-[#E7DFD2] border border-transparent font-medium transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={isLoading}
            className="bg-[#C0492F] text-white px-5 py-2 rounded-xl font-semibold hover:bg-[#A83E26] transition-all shadow-xs cursor-pointer flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
