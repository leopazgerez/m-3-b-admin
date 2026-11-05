"use client";

import { ApiErrorBanner } from "@/components/ui";
import { useChat } from "@/lib/useAssistant";
import Composer from "./Composer";
import ViewHeader from "./ViewHeader";

export default function ChatConversation({ id, onCreated, onBack }: { id: number | null; onCreated: (id: number) => void; onBack: () => void }) {
  const { chat, messages, loadError, busy, askError, ask, reload } = useChat(id, onCreated);
  return (
    <div className="flex h-full flex-col">
      <ViewHeader title={chat?.title ?? "Chat nuevo"} onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {loadError && <ApiErrorBanner error={loadError} onRetry={reload} />}
        {messages.length === 0 && !loadError && <p className="text-xs text-[#7A6F63]">Preguntá sobre ventas, stock, clientes o gastos.</p>}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${m.role === "USER" ? "self-end bg-[#9C5A2E] text-white" : "self-start bg-[#FBF8F2] text-[#231E1A]"}`}
          >
            {m.content || (busy ? "escribiendo…" : "")}
          </div>
        ))}
      </div>
      <Composer busy={busy} error={askError} onAsk={ask} />
    </div>
  );
}
