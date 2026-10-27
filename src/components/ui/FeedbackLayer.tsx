"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { feedback, type Toast } from "@/lib/feedback";

const DURATION = { success: 4000, error: 7000 };
const LEAVE_MS = 200;

/** Global loader (while any API call is in flight) and the top-right toasts. Mounted once in the root layout. */
export default function FeedbackLayer() {
  const pending = useSyncExternalStore(feedback.subscribe, feedback.pending, () => 0);
  const toasts = useSyncExternalStore(feedback.subscribe, feedback.toasts, () => []);

  return (
    <>
      {pending > 0 && (
        <div role="progressbar" aria-label="Esperando respuesta del servidor" className="fixed inset-x-0 top-0 z-[80] pointer-events-none">
          <div className="feedback-loader-bar h-[3px] overflow-hidden bg-[#EADBC6]">
            <div className="h-full w-1/3 bg-[#9C5A2E]" />
          </div>
          <div className="feedback-loader-pill mx-auto mt-2 w-fit flex items-center gap-2 bg-[#211C18] text-[#F5EAD6] text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-lg">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[#C87941]/40 border-t-[#C87941] animate-spin" />
            <span>Procesando…</span>
          </div>
        </div>
      )}

      <div className="fixed top-4 right-4 z-[90] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))] pointer-events-none">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
      </div>
    </>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || leaving) return;
    const t = setTimeout(() => setLeaving(true), DURATION[toast.kind]);
    return () => clearTimeout(t);
  }, [paused, leaving, toast.kind]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => feedback.dismiss(toast.id), LEAVE_MS);
    return () => clearTimeout(t);
  }, [leaving, toast.id]);

  const ok = toast.kind === "success";
  return (
    <div role={ok ? "status" : "alert"} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      className={`${leaving ? "feedback-toast-out" : "feedback-toast-in"} pointer-events-auto bg-white rounded-2xl border shadow-xl flex items-start gap-3 p-3.5 border-l-4 ${
        ok ? "border-[#E7DFD2] border-l-[#3E8E5A]" : "border-[#C0492F]/30 border-l-[#C0492F]"
      }`}>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-[#E3F1E8] text-[#3E8E5A]" : "bg-[#F7E3DD] text-[#C0492F]"}`}>
        {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      </span>
      <div className="flex-1 min-w-0 text-xs">
        <p className={`font-heading font-bold text-sm ${ok ? "text-[#231E1A]" : "text-[#C0492F]"}`}>{toast.title}</p>
        <p className="text-[#7A6F63] mt-0.5 break-words">{toast.text}</p>
      </div>
      <button type="button" onClick={() => setLeaving(true)} aria-label="Cerrar aviso"
        className="text-[#A89C8C] hover:text-[#231E1A] p-0.5 rounded-lg cursor-pointer shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
