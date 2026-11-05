"use client";

import { useGuideAsk } from "@/lib/useAssistant";
import Composer from "./Composer";
import Markdown from "./Markdown";
import ViewHeader from "./ViewHeader";

export default function GuideConversation({ onBack }: { onBack: () => void }) {
  const { turns, busy, askError, ask } = useGuideAsk();
  return (
    <div className="flex h-full flex-col">
      <ViewHeader title="Guía de usuario" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {turns.length === 0 && <p className="text-xs text-[#7A6F63]">Preguntá cómo usar el sistema. Las preguntas no se guardan.</p>}
        {turns.map((t) => (
          <div key={t.requestId} className="flex flex-col gap-2">
            <div className="self-end max-w-[85%] whitespace-pre-wrap rounded-xl bg-[#9C5A2E] px-3 py-2 text-sm text-white">{t.question}</div>
            <div className="self-start max-w-[85%] rounded-xl bg-[#FBF8F2] px-3 py-2 text-sm text-[#231E1A]">
              {t.status === "error" ? <span className="text-red-700">{t.error}</span> : t.text ? <Markdown text={t.text} /> : "escribiendo…"}
              {t.status === "done" && t.sections && t.sections.length > 0 && (
                <p className="mt-1 text-[11px] text-[#7A6F63]">Secciones consultadas: {t.sections.join(", ")}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <Composer busy={busy} error={askError} onAsk={ask} />
    </div>
  );
}
