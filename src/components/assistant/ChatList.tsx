"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ApiErrorBanner, ConfirmDeleteModal, Pager } from "@/components/ui";
import type { ChatSummary } from "@/lib/apiTypes";
import { formatInstant } from "@/lib/dateUtils";
import { useChats } from "@/lib/useAssistant";
import ViewHeader from "./ViewHeader";

/** Mounted fresh every time it's shown, so titles set by a first question are current. */
export default function ChatList({ onOpen, onBack }: { onOpen: (id: number | null) => void; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const { items, total, loading, error, hasNext, hasPrev, next, prev, reload, remove } = useChats(search);
  const [toDelete, setToDelete] = useState<ChatSummary | null>(null);
  return (
    <div className="flex h-full flex-col">
      <ViewHeader title="Chatbot" onBack={onBack} />
      <div className="flex gap-2 p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título"
          className="flex-1 rounded-lg border border-[#E7DFD2] px-3 py-1.5 text-sm"
        />
        <button type="button" onClick={() => onOpen(null)} className="rounded-lg bg-[#9C5A2E] px-3 text-sm text-white">
          Nuevo chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error && <div className="px-3"><ApiErrorBanner error={error} onRetry={reload} /></div>}
        {!error && !loading && items.length === 0 && <p className="px-3 text-xs text-[#7A6F63]">No hay chats todavía.</p>}
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-2 border-b border-[#E7DFD2] px-3 py-2 hover:bg-[#FBF8F2]">
            <button type="button" onClick={() => onOpen(c.id)} className="flex-1 min-w-0 text-left">
              <span className="block truncate text-sm text-[#231E1A]">{c.title ?? "Chat nuevo"}</span>
              <span className="text-[11px] text-[#7A6F63]">{formatInstant(c.updatedAt)}</span>
            </button>
            <button type="button" onClick={() => setToDelete(c)} aria-label="Borrar chat" className="rounded p-1 text-[#7A6F63] hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Pager hasPrev={hasPrev} hasNext={hasNext} onPrev={prev} onNext={next} total={total} loading={loading} flush />
      <ConfirmDeleteModal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await remove(toDelete.id).catch(() => {}); setToDelete(null); }}
        title="¿Borrar este chat?"
        itemName={toDelete?.title ?? "Chat nuevo"}
      />
    </div>
  );
}
