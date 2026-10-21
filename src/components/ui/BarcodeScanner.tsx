"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, CheckCircle2, AlertCircle } from "lucide-react";

type BarcodeDetectorCtor = new (opts?: { formats: string[] }) => {
  detect: (target: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

/** Camera barcode scanner; calls onDetected with the code, then closes itself. */
export default function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const callbacks = useRef({ onDetected, onClose });
  useEffect(() => {
    callbacks.current = { onDetected, onClose };
  });

  const detected = (code: string, closeAfterMs: number) => {
    setDetectedCode(code);
    callbacks.current.onDetected(code);
    setTimeout(() => callbacks.current.onClose(), closeAfterMs);
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Tu navegador no soporta acceso a la cámara.");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.play();

        if (!("BarcodeDetector" in window)) return;
        try {
          const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
          const detector = new Detector({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"] });
          interval = setInterval(async () => {
            if (video.readyState < 2) return;
            try {
              const codes = await detector.detect(video);
              if (codes.length > 0) {
                clearInterval(interval);
                setDetectedCode(codes[0].rawValue);
                callbacks.current.onDetected(codes[0].rawValue);
                setTimeout(() => callbacks.current.onClose(), 800);
              }
            } catch {
              // frame without a readable code
            }
          }, 300);
        } catch {
          // BarcodeDetector present but unusable: manual entry still works
        }
      } catch (err) {
        if (cancelled) return;
        const notAllowed = err instanceof DOMException && err.name === "NotAllowedError";
        setCameraError(
          notAllowed
            ? "Permiso de cámara denegado. Habilita los permisos en tu navegador."
            : err instanceof Error ? err.message : "No se pudo iniciar la cámara.",
        );
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(interval);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#211C18] text-[#F5EAD6] rounded-2xl border border-[#322A23] w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#322A23]">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#C87941]" />
            <span className="font-heading font-bold text-sm text-[#F5EAD6]">Escanear código de barras</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A89C8C] hover:text-[#F5EAD6] p-1 rounded-lg hover:bg-[#322A23] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative bg-black w-full h-72 flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center flex flex-col items-center gap-2 text-xs text-[#F7E3DD]">
              <AlertCircle className="w-8 h-8 text-[#C0492F]" />
              <p>{cameraError}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-64 h-36 border-2 border-[#9C5A2E] rounded-xl relative flex items-center justify-center shadow-[0_0_15px_rgba(156,90,46,0.5)]">
                  <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#F5EAD6]" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#F5EAD6]" />
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#F5EAD6]" />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#F5EAD6]" />
                  <div className="w-full h-0.5 bg-[#C0492F] shadow-[0_0_8px_#C0492F] animate-pulse" />
                </div>
              </div>
            </>
          )}

          {detectedCode && (
            <div className="absolute inset-0 bg-[#211C18]/90 flex flex-col items-center justify-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-10 h-10 text-[#3E8E5A]" />
              <span className="text-xs text-[#C9BCA9]">¡Código detectado!</span>
              <span className="font-mono font-bold text-lg text-[#F5EAD6]">{detectedCode}</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-[#15110E] flex flex-col gap-3 text-xs">
          <p className="text-[11px] text-[#A89C8C] text-center">
            Apuntá la cámara al código de barras del producto o etiqueta.
          </p>
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#322A23]">
            <button
              type="button"
              onClick={() => detected(`779${Math.floor(1000000000 + Math.random() * 9000000000)}`, 600)}
              className="text-[11px] font-medium text-[#C87941] hover:underline cursor-pointer"
            >
              ⚡ Simular captura de código de barras
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#322A23] text-[#F5EAD6] hover:bg-[#9C5A2E] transition-all cursor-pointer text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
