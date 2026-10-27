// App-wide feedback: how many API calls are in flight (the top loader) and the toasts in the top-right corner.
// Plain module state, read from React with useSyncExternalStore (FeedbackLayer).

export type ToastKind = "success" | "error";
export interface Toast { id: number; kind: ToastKind; title: string; text: string }

let pending = 0;
let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Older toasts beyond this are dropped. */
const MAX_TOASTS = 4;

function push(kind: ToastKind, title: string, text: string) {
  toasts = [...toasts, { id: nextId++, kind, title, text }].slice(-MAX_TOASTS);
  emit();
}

export const feedback = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
  pending: () => pending,
  toasts: () => toasts,

  begin() { pending++; emit(); },
  end() { pending = Math.max(0, pending - 1); emit(); },

  success(text: string, title = "Listo") { push("success", title, text); },
  error(text: string, title = "No se pudo completar") { push("error", title, text); },
  dismiss(id: number) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
};
