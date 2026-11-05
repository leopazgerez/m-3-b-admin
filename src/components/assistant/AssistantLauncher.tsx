"use client";

import { useState } from "react";
import { BookOpen, MessageCircle, Sparkles, X } from "lucide-react";
import ChatConversation from "./ChatConversation";
import ChatList from "./ChatList";
import GuideConversation from "./GuideConversation";

// key is fixed when a chat is opened, so creating it (id null → n) doesn't remount the conversation mid-answer
type View = "choose" | "guide" | "chats" | { chat: number | null; key: string };

/**
 * md and up: a tab docked bottom-right that opens a floating panel.
 * Below md: a round button; the chosen view opens full screen.
 */
export default function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("choose");
  const close = () => { setOpen(false); setView("choose"); };

  const body =
    view === "choose" ? (
      <div className="flex flex-col gap-2 p-3">
        <button type="button" onClick={() => setView("guide")} className="flex items-center gap-2 rounded-xl border border-[#E7DFD2] p-3 text-left text-sm hover:border-[#9C5A2E]">
          <BookOpen className="h-4 w-4 text-[#9C5A2E]" /> Guía de usuario
        </button>
        <button type="button" onClick={() => setView("chats")} className="flex items-center gap-2 rounded-xl border border-[#E7DFD2] p-3 text-left text-sm hover:border-[#9C5A2E]">
          <MessageCircle className="h-4 w-4 text-[#9C5A2E]" /> Chatbot
        </button>
      </div>
    ) : view === "guide" ? (
      <GuideConversation onBack={() => setView("choose")} />
    ) : view === "chats" ? (
      <ChatList onBack={() => setView("choose")} onOpen={(id) => setView({ chat: id, key: id === null ? `new-${Date.now()}` : String(id) })} />
    ) : (
      <ChatConversation
        key={view.key}
        id={view.chat}
        onCreated={(id) => setView((v) => (typeof v === "object" && v.key === view.key ? { chat: id, key: v.key } : v))}
        onBack={() => setView("chats")}
      />
    );

  const fullScreenOnMobile = view !== "choose";

  return (
    <>
      {/* desktop / tablet tab */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-0 right-6 z-30 hidden items-center gap-2 rounded-t-xl border border-b-0 border-[#E7DFD2] bg-white px-4 py-2 text-sm font-semibold text-[#231E1A] shadow-lg md:flex"
        >
          <Sparkles className="h-4 w-4 text-[#9C5A2E]" /> Asistente
        </button>
      )}
      {/* mobile button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir asistente"
          className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#9C5A2E] text-white shadow-lg md:hidden"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}
      {open && (
        <div
          className={`fixed z-40 flex flex-col overflow-hidden bg-white shadow-2xl md:inset-auto md:bottom-0 md:right-6 md:h-[520px] md:w-[360px] md:rounded-t-xl md:border md:border-b-0 md:border-[#E7DFD2] ${
            fullScreenOnMobile ? "inset-0" : "bottom-4 right-4 w-64 rounded-xl border border-[#E7DFD2]"
          }`}
        >
          <div className="flex items-center justify-between bg-[#231E1A] px-3 py-2 text-white">
            <span className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4" /> Asistente</span>
            <button type="button" onClick={close} aria-label="Cerrar asistente" className="rounded p-1 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1">{body}</div>
        </div>
      )}
    </>
  );
}
