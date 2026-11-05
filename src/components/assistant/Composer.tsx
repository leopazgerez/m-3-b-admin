"use client";

import { useState } from "react";
import { MAX_QUESTION } from "@/lib/assistantTurn";

/** Question input shared by chat and guide. Disabled while an answer is in progress. */
export default function Composer({ busy, error, onAsk }: { busy: boolean; error: string | null; onAsk: (q: string) => Promise<boolean> }) {
  const [text, setText] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const q = text;
    setText("");
    if (!(await onAsk(q))) setText(q); // not accepted (validation, 503, no socket): keep what was typed
  };
  return (
    <form onSubmit={submit} className="border-t border-[#E7DFD2] p-3 flex flex-col gap-2">
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
          maxLength={MAX_QUESTION}
          rows={2}
          placeholder="Escribí tu pregunta…"
          className="flex-1 resize-none rounded-lg border border-[#E7DFD2] px-3 py-2 text-sm"
        />
        <button type="submit" disabled={busy || !text.trim()} className="rounded-lg bg-[#9C5A2E] px-3 text-sm text-white disabled:opacity-50">
          Enviar
        </button>
      </div>
    </form>
  );
}
