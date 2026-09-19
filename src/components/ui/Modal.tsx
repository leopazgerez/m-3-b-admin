import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E7DFD2] w-full max-w-lg overflow-hidden shadow-xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F7F3EC]">
          <h3 className="font-heading font-bold text-lg text-[#231E1A]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#A89C8C] hover:text-[#231E1A] p-1.5 rounded-lg hover:bg-[#FBF8F2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
