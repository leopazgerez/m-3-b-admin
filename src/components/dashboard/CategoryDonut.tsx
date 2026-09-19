"use client";

import { categoryBreakdown } from "@/lib/data";

export default function CategoryDonut() {
  const total = "$4,82M";

  return (
    <div className="bg-white rounded-2xl border border-[#E7DFD2] p-5 flex flex-col justify-between shrink-0 w-[380px] shadow-xs h-full min-h-[260px]">
      <h3 className="font-heading font-bold text-base text-[#231E1A]">
        Ventas por categoría
      </h3>

      <div className="flex items-center gap-5 py-2">
        {/* Ring */}
        <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            {/* Segment 1: Mates 45% (#9C5A2E) */}
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#9C5A2E"
              strokeWidth="4"
              strokeDasharray="45 100"
              strokeDashoffset="0"
            />
            {/* Segment 2: Bombillas 25% (#C87941) */}
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#C87941"
              strokeWidth="4"
              strokeDasharray="25 100"
              strokeDashoffset="-45"
            />
            {/* Segment 3: Yerba 20% (#3E8E5A) */}
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#3E8E5A"
              strokeWidth="4"
              strokeDasharray="20 100"
              strokeDashoffset="-70"
            />
            {/* Segment 4: Accesorios 10% (#D98A2B) */}
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#D98A2B"
              strokeWidth="4"
              strokeDasharray="10 100"
              strokeDashoffset="-90"
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-heading font-bold text-lg text-[#231E1A] tracking-tight leading-none">
              {total}
            </span>
            <span className="text-[10px] text-[#A89C8C] uppercase tracking-wider">
              total
            </span>
          </div>
        </div>

        {/* Categories List */}
        <div className="flex flex-col gap-2.5 flex-1 text-xs">
          {categoryBreakdown.map((cat) => (
            <div key={cat.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-[#7A6F63] font-medium">{cat.name}</span>
              </div>
              <span className="font-bold text-[#231E1A]">{cat.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
