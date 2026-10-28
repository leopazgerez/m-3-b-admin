import { ApiError } from "@/lib/api";

export default function ApiErrorBanner({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null;
  const e = error instanceof ApiError ? error : null;
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-[#C0492F]/30 bg-[#F7E3DD] px-4 py-3 text-sm text-[#C0492F]">
      <div>
        {e ? (
          <>
            <span className="font-semibold">{e.status ? `Error ${e.status}` : "Error"}</span>: {e.message}
          </>
        ) : (
          String(error)
        )}
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 font-semibold underline">
          Reintentar
        </button>
      )}
    </div>
  );
}
