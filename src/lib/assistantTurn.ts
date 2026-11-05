// One assistant answer in flight, built from the socket's assistant.* events and correlated by requestId.
// Pure (no React, no browser): useAssistant.ts drives it, assistantTurn.test.ts pins it.
import type { AssistantDelta, AssistantDone, AssistantError, AssistantSource, MessageView } from "./apiTypes.ts";

export interface Turn {
  requestId: string;
  question: string;
  text: string;
  status: "streaming" | "done" | "error";
  messageId?: number | null;
  sections?: string[];
  error?: string;
}
export type AssistantEvent =
  | { type: "assistant.delta"; payload: AssistantDelta }
  | { type: "assistant.done"; payload: AssistantDone }
  | { type: "assistant.error"; payload: AssistantError };
/**
 * awaiting: the question POST is out and its 202 (the requestId) hasn't arrived; events meanwhile go to buffer.
 * reload: another tab finished an answer in this chat, so the persisted chat changed.
 */
export interface TurnState { awaiting: boolean; turn: Turn | null; buffer: AssistantEvent[]; reload: boolean }
export interface TurnCtx { source: AssistantSource; chatId: number | null }

export const initialTurnState: TurnState = { awaiting: false, turn: null, buffer: [], reload: false };

export const beginAsk = (s: TurnState): TurnState => ({ ...s, awaiting: true, buffer: [], reload: false });

export const failAsk = (s: TurnState): TurnState => ({ ...s, awaiting: false, buffer: [] });

/** The 202 arrived: start the turn and replay what the socket sent for it before the 202; the rest is dropped. */
export function acceptAsk(s: TurnState, requestId: string, question: string, ctx: TurnCtx): TurnState {
  const start: TurnState = { awaiting: false, buffer: [], reload: s.reload, turn: { requestId, question, text: "", status: "streaming" } };
  return s.buffer.filter((e) => e.payload.requestId === requestId).reduce((acc, e) => applyEvent(acc, e, ctx), start);
}

export function applyEvent(s: TurnState, ev: AssistantEvent, ctx: TurnCtx): TurnState {
  const p = ev.payload;
  if (p.source !== ctx.source) return s;
  if (s.awaiting) return { ...s, buffer: [...s.buffer, ev] };
  const t = s.turn;
  if (t && t.status === "streaming" && t.requestId === p.requestId) {
    switch (ev.type) {
      case "assistant.delta": return { ...s, turn: { ...t, text: t.text + ev.payload.text } };
      case "assistant.done": return { ...s, turn: { ...t, status: "done", messageId: ev.payload.messageId, sections: ev.payload.sections } };
      case "assistant.error": return { ...s, turn: { ...t, status: "error", error: ev.payload.message } };
    }
  }
  if (ev.type === "assistant.done" && p.source === "chat" && ctx.chatId !== null && p.chatId === ctx.chatId) return { ...s, reload: true };
  return s;
}

/** The socket dropped mid-answer: its remaining events are lost. */
export function interrupt(s: TurnState, message: string): TurnState {
  if (s.awaiting) return failAsk(s);
  if (s.turn?.status === "streaming") return { ...s, turn: { ...s.turn, status: "error", error: message } };
  return s;
}

export const isBusy = (s: TurnState): boolean => s.awaiting || s.turn?.status === "streaming";

/** Persisted messages plus the turn in flight (optimistic). A failed turn isn't stored by the backend, so it shows nothing. */
export function chatMessages(server: MessageView[], turn: Turn | null): MessageView[] {
  if (!turn || turn.status === "error") return server;
  if (turn.status === "done" && turn.messageId != null && server.some((m) => m.id === turn.messageId)) return server;
  const createdAt = new Date().toISOString();
  return [
    ...server,
    { id: -1, role: "USER", content: turn.question, createdAt },
    { id: turn.messageId ?? -2, role: "ASSISTANT", content: turn.text, createdAt },
  ];
}

export const MAX_QUESTION = 2000;
export const MAX_SECTION_NAME = 120;
/** Above this the server may drop the connection instead of answering, so it's checked before uploading. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function validateQuestion(q: string): string | null {
  if (!q.trim()) return "Escribí una pregunta.";
  if (q.length > MAX_QUESTION) return `La pregunta puede tener hasta ${MAX_QUESTION} caracteres.`;
  return null;
}

/** requireBoth: a new section needs name and file; a replacement needs at least one. */
export function validateSectionInput(
  name: string | undefined, file: File | undefined, requireBoth: boolean,
): { field: "name" | "file"; message: string } | null {
  if (name !== undefined || requireBoth) {
    if (!name?.trim()) return { field: "name", message: "El nombre es obligatorio." };
    if (name.length > MAX_SECTION_NAME) return { field: "name", message: `El nombre puede tener hasta ${MAX_SECTION_NAME} caracteres.` };
  }
  if (file) {
    if (file.size > MAX_FILE_BYTES) return { field: "file", message: "El archivo supera los 10 MB." };
  } else if (requireBoth) return { field: "file", message: "Elegí un archivo PDF." };
  if (!requireBoth && name === undefined && !file) return { field: "name", message: "Cambiá el nombre o elegí un archivo." };
  return null;
}

/** Why a question can't be sent now, or null. Without an authenticated socket the streamed answer would be lost. */
export function askBlocker(s: TurnState, socketOpen: boolean): string | null {
  if (isBusy(s)) return "Esperá a que termine la respuesta en curso.";
  if (!socketOpen) return "Sin conexión con el asistente; probá en unos segundos.";
  return null;
}
