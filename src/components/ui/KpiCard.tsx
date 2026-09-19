import { ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";
import React from "react";

interface KpiCardProps {
  label: string;
  value: string;
  delta: string;
  badgeText?: string;
  badgeType?: "success" | "warning" | "danger";
  icon: React.ReactNode;
  iconBgColor?: string;
}

export default function KpiCard({
  label,
  value,
  delta,
  badgeText,
  badgeType = "success",
  icon,
  iconBgColor = "bg-[#EADBC6]",
}: KpiCardProps) {
  const badgeStyles = {
    success: "bg-[#E3F1E8] text-[#3E8E5A]",
    warning: "bg-[#FBEFD9] text-[#D98A2B]",
    danger: "bg-[#F7E3DD] text-[#C0492F]",
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E7DFD2] p-5 flex flex-col gap-4 flex-1 shadow-xs hover:border-[#9C5A2E]/40 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div
          className={`w-11 h-11 rounded-xl ${iconBgColor} flex items-center justify-center shrink-0 text-[#9C5A2E] shadow-xs`}
        >
          {icon}
        </div>

        {badgeText && (
          <div
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyles[badgeType]}`}
          >
            {badgeType === "success" && <ArrowUpRight className="w-3.5 h-3.5" />}
            {badgeType === "danger" && <ArrowDownRight className="w-3.5 h-3.5" />}
            {badgeType === "warning" && <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{badgeText}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#7A6F63]">{label}</span>
        <span className="font-heading font-bold text-3xl text-[#231E1A] tracking-tight">
          {value}
        </span>
        <span className="text-xs text-[#A89C8C]">{delta}</span>
      </div>
    </div>
  );
}
