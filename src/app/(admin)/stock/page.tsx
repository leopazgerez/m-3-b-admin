"use client";

import { Suspense } from "react";
import StockContent from "./StockContent";

export default function StockPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#E7DFD2] border-t-[#9C5A2E] animate-spin" />
          <span className="text-sm text-[#A89C8C]">Cargando inventario y stock…</span>
        </div>
      }
    >
      <StockContent />
    </Suspense>
  );
}
