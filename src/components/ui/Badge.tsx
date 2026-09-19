import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "neutral" | "brand";
}

export default function Badge({ children, variant = "neutral" }: BadgeProps) {
  const variants = {
    success: "bg-[#E3F1E8] text-[#3E8E5A]",
    warning: "bg-[#FBEFD9] text-[#D98A2B]",
    danger: "bg-[#F7E3DD] text-[#C0492F]",
    neutral: "bg-[#FBF8F2] text-[#7A6F63] border border-[#E7DFD2]",
    brand: "bg-[#EADBC6] text-[#7A3F1F]",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
