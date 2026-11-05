import { ArrowLeft } from "lucide-react";

export default function ViewHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-[#E7DFD2] px-3 py-2">
      <button type="button" onClick={onBack} aria-label="Volver" className="rounded p-1 text-[#7A6F63] hover:bg-[#FBF8F2]">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <span className="truncate text-sm font-semibold text-[#231E1A]">{title}</span>
    </div>
  );
}
