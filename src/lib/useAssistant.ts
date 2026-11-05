"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ApiError } from "./api";
import { assistantApi } from "./assistantApi";
import type { AssistantSource, ChatSummary, ChatView, GuideSectionView, MessageView } from "./apiTypes";
import {
  acceptAsk, applyEvent, askBlocker, beginAsk, chatMessages, failAsk, initialTurnState, interrupt, isBusy, settleFromServer, validateQuestion,
  type AssistantEvent, type Turn, type TurnState,
} from "./assistantTurn";
import { socket } from "./socket";
import { useApiResource, useDebounced, usePagedList } from "./useApi";

export { validateQuestion, validateSectionInput } from "./assistantTurn";

const EVENT_TYPES = ["assistant.delta", "assistant.done", "assistant.error"] as const;
const LOST_CONNECTION = "Se perdió la conexión; volvé a preguntar.";
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
/** A turn with no new text for this long after a reconnect is given up (its done/error was lost in the gap). */
const STALL_MS = 30000;

/** True while the socket is authenticated: answers can arrive. */
export function useSocketConnected(): boolean {
  return useSyncExternalStore(socket.subscribe, () => socket.status() === "open", () => false);
}

/** The question of a turn that failed after its 202 (the backend didn't keep it), so the input can get it back. */
const failedQuestion = (t: Turn | null) => (t?.status === "error" ? { id: t.requestId, text: t.question } : null);

/**
 * The turn state of one conversation, fed by the socket. The ref mirrors the state so socket handlers and ask()
 * always see the latest one. onChange gets (prev, next) after every change.
 */
function useTurnStream(source: AssistantSource, chatIdRef: { current: number | null }, onChange: (prev: TurnState, next: TurnState) => TurnState) {
  const [state, setState] = useState(initialTurnState);
  const ref = useRef(initialTurnState);
  // bumped on every reconnect: an ask whose 202 lands after one may have lost its events
  const reconnects = useRef(0);
  useEffect(() => socket.onReconnect(() => { reconnects.current++; }), []);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  const commit = useCallback((next: TurnState) => {
    const prev = ref.current;
    if (next === prev) return;
    ref.current = onChangeRef.current(prev, next);
    setState(ref.current);
  }, []);

  useEffect(() => {
    const offs = EVENT_TYPES.map((type) =>
      socket.on(type, (payload) =>
        commit(applyEvent(ref.current, { type, payload } as AssistantEvent, { source, chatId: chatIdRef.current }))));
    return () => offs.forEach((off) => off());
  }, [source, chatIdRef, commit]);

  return { state, ref, commit, reconnects };
}

/** search is debounced here, so it can be bound straight to the input. */
export function useChats(search: string) {
  const debounced = useDebounced(search);
  const list = usePagedList<ChatSummary>("/chats", { search: debounced || undefined, length: 20 });
  const { reload } = list;
  const remove = useCallback(async (id: number) => {
    await assistantApi.deleteChat(id);
    reload();
  }, [reload]);
  return { ...list, remove };
}

/** id null = a chat not created yet: the first ask() creates it and reports the id through onCreated. */
export function useChat(id: number | null, onCreated?: (id: number) => void): {
  chat: ChatView | null; messages: MessageView[]; loadError: ApiError | null; connected: boolean;
  busy: boolean; askError: string | null; failed: { id: string; text: string } | null;
  ask(question: string): Promise<boolean>; reload(): void;
} {
  const idRef = useRef(id);
  // a chat created by ask() is known here before the parent passes its id down; never go back to null
  useEffect(() => { if (id !== null) idRef.current = id; });
  const { data, error, reload } = useApiResource(
    () => (id === null ? Promise.resolve(null) : assistantApi.getChat(id)), [id]);
  const [askError, setAskError] = useState<string | null>(null);

  // our answer finished, or another tab's finished in this chat: the persisted chat changed
  const { state, ref, commit, reconnects } = useTurnStream("chat", idRef, (prev, next) => {
    const finished = prev.turn?.status === "streaming" && next.turn?.status === "done" && prev.turn.requestId === next.turn.requestId;
    if (finished || next.reload) queueMicrotask(reload);
    return next.reload ? { ...next, reload: false } : next;
  });

  // Events sent while disconnected were lost, but the answer may still be generating (its next events reach the new
  // socket). Keep the turn, finish it if the server already saved the answer, and give it up only if it stalls.
  const resync = useCallback(async () => {
    const chatId = idRef.current;
    if (chatId !== null) {
      try { commit(settleFromServer(ref.current, (await assistantApi.getChat(chatId)).messages)); } catch { /* reload shows it */ }
    }
    reload();
    const watch = (requestId: string, length: number) => setTimeout(() => {
      const t = ref.current.turn;
      if (t?.requestId !== requestId || t.status !== "streaming") return;
      if (t.text.length !== length) { watch(requestId, t.text.length); return; }
      commit(interrupt(ref.current, LOST_CONNECTION));
      reload();
    }, STALL_MS);
    const t = ref.current.turn;
    if (t?.status === "streaming") watch(t.requestId, t.text.length);
  }, [ref, commit, reload]);

  useEffect(() => socket.onReconnect(() => { void resync(); }), [resync]);

  const ask = useCallback(async (question: string) => {
    const invalid = validateQuestion(question);
    if (invalid) { setAskError(invalid); return false; }
    if (isBusy(ref.current)) return false;
    const blocked = askBlocker(ref.current, socket.status() === "open");
    if (blocked) { setAskError(blocked); return false; }
    setAskError(null);
    commit(beginAsk(ref.current));
    const seen = reconnects.current;
    let created: number | null = null;
    try {
      let chatId = idRef.current;
      if (chatId === null) {
        chatId = created = (await assistantApi.createChat()).id;
        idRef.current = chatId;
      }
      const { requestId } = await assistantApi.askChat(chatId, question.trim());
      commit(acceptAsk(ref.current, requestId, question.trim(), { source: "chat", chatId }));
      if (reconnects.current !== seen) void resync();
      else if (ref.current.turn?.status === "done") reload(); // the whole answer came before the 202
      return true;
    } catch (e) {
      commit(failAsk(ref.current));
      setAskError(message(e));
      return false;
    } finally {
      // only now, so the chat's first GET doesn't race the question POST
      if (created !== null) onCreated?.(created);
    }
  }, [ref, commit, reconnects, onCreated, reload, resync]);

  const busy = isBusy(state);
  const turnError = !busy && state.turn?.status === "error" ? state.turn.error ?? null : null;
  return {
    chat: data,
    messages: chatMessages(data?.messages ?? [], state.turn),
    loadError: error,
    connected: useSocketConnected(),
    busy,
    askError: askError ?? turnError,
    failed: failedQuestion(state.turn),
    ask,
    reload,
  };
}

/** Independent questions, nothing persisted: the turns live only while this hook is mounted. */
export function useGuideAsk(): {
  turns: Turn[]; connected: boolean; busy: boolean; askError: string | null; failed: { id: string; text: string } | null;
  ask(question: string): Promise<boolean>;
} {
  const noChat = useRef<number | null>(null);
  const [history, setHistory] = useState<Turn[]>([]);
  const [askError, setAskError] = useState<string | null>(null);
  const { state, ref, commit, reconnects } = useTurnStream("guide", noChat, (_prev, next) => next);

  useEffect(() => socket.onReconnect(() => commit(interrupt(ref.current, LOST_CONNECTION))), [ref, commit]);

  const ask = useCallback(async (question: string) => {
    const invalid = validateQuestion(question);
    if (invalid) { setAskError(invalid); return false; }
    if (isBusy(ref.current)) return false;
    const blocked = askBlocker(ref.current, socket.status() === "open");
    if (blocked) { setAskError(blocked); return false; }
    setAskError(null);
    commit(beginAsk(ref.current));
    const seen = reconnects.current;
    try {
      const { requestId } = await assistantApi.askGuide(question.trim());
      const previous = ref.current.turn;
      if (previous) setHistory((h) => [...h, previous]);
      commit(acceptAsk(ref.current, requestId, question.trim(), { source: "guide", chatId: null }));
      if (reconnects.current !== seen) commit(interrupt(ref.current, LOST_CONNECTION));
      return true;
    } catch (e) {
      commit(failAsk(ref.current));
      setAskError(message(e));
      return false;
    }
  }, [ref, commit, reconnects]);

  const connected = useSocketConnected();
  return {
    turns: state.turn ? [...history, state.turn] : history,
    connected,
    busy: isBusy(state),
    askError,
    failed: failedQuestion(state.turn),
    ask,
  };
}

export function useGuideSections() {
  const { data, loading, error, reload } = useApiResource(() => assistantApi.listSections(), []);
  const write = useCallback(<A extends unknown[], R>(fn: (...a: A) => Promise<R>) => async (...a: A) => {
    const r = await fn(...a);
    reload();
    return r;
  }, [reload]);
  return {
    sections: data ?? ([] as GuideSectionView[]),
    loading,
    error,
    reload,
    getFile: assistantApi.getSectionFile,
    create: write(assistantApi.createSection),
    update: write(assistantApi.updateSection),
    remove: write(assistantApi.deleteSection),
  };
}
