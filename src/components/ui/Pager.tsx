interface PagerProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  total?: number;
  loading?: boolean;
}

export default function Pager({ hasPrev, hasNext, onPrev, onNext, total, loading }: PagerProps) {
  const btn = "px-3 py-1.5 rounded-lg border border-[#E7DFD2] text-sm text-[#7A6F63] disabled:opacity-40";
  return (
    <div className="flex items-center justify-between py-3 text-sm text-[#7A6F63]">
      <span>{total !== undefined ? `${total} resultados` : ""}</span>
      <div className="flex gap-2">
        <button type="button" className={btn} disabled={!hasPrev || loading} onClick={onPrev}>Anterior</button>
        <button type="button" className={btn} disabled={!hasNext || loading} onClick={onNext}>Siguiente</button>
      </div>
    </div>
  );
}
