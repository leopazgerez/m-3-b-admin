"use client";

import { useState } from "react";
import { MAX_QUESTION } from "@/lib/assistantTurn";

interface ComposerProps {
  busy: boolean;
  /** The socket is authenticated; without it the answer would be lost. */
  connected: boolean;
  error: string | null;
  /** A question that failed after it was accepted: put it back in the input (once per id). */
  restore: { id: string; text: string } | null;
  /** false = not accepted (validation, 503, no connection): the typed text stays. */
  onAsk: (q: string) => Promise<boolean>;
}

/** Question input shared by chat and guide. Disabled while an answer is in progress or the socket is down. */
export default function Composer({ busy, connected, error, restore, onAsk }: ComposerProps) {
  const [text, setText] = useState("");
  const [restoredId, setRestoredId] = useState<string | null>(null);
  if (restore && restore.id !== restoredId) {
    setRestoredId(restore.id);
    if (!text) setText(restore.text);
  }
  const canSend = connected && !busy && text.trim() !== "";

  const send = async () => {
    if (!canSend) return;
    const q = text;
    setText("");
    if (!(await onAsk(q))) setText(q);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="border-t border-[#E7DFD2] p-3 flex flex-col gap-2">
      {error && <p className="text-xs text-red-700">{error}</p>}
      {!connected && <p className="text-xs text-[#7A6F63]">Conectando con el asistente…</p>}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Shift+Enter = new line; Enter while composing (IME, dead keys) confirms the character
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); }
          }}
          maxLength={MAX_QUESTION}
          rows={2}
          placeholder="Escribí tu pregunta…"
          className="flex-1 resize-none rounded-lg border border-[#E7DFD2] px-3 py-2 text-sm"
        />
        <button type="submit" disabled={!canSend} className="rounded-lg bg-[#9C5A2E] px-3 text-sm text-white disabled:opacity-50">
          Enviar
        </button>
      </div>
    </form>
  );
}
