"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError } from "./api";
import { assistantApi } from "./assistantApi";
import type { AssistantSource, ChatSummary, ChatView, GuideSectionView, MessageView } from "./apiTypes";
import {
  acceptAsk, applyEvent, beginAsk, chatMessages, failAsk, initialTurnState, interrupt, isBusy, validateQuestion,
  type AssistantEvent, type Turn, type TurnState,
} from "./assistantTurn";
import { socket } from "./socket";
import { useApiResource, usePagedList } from "./useApi";

export { validateQuestion, validateSectionInput } from "./assistantTurn";

const EVENT_TYPES = ["assistant.delta", "assistant.done", "assistant.error"] as const;
const LOST_CONNECTION = "Se perdió la conexión; volvé a preguntar.";
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

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

export function useChats(search: string) {
  const list = usePagedList<ChatSummary>("/chats", { search: search.trim() || undefined, length: 20 });
  const { reload } = list;
  const create = useCallback(async () => {
    const chat = await assistantApi.createChat();
    reload();
    return chat;
  }, [reload]);
  const remove = useCallback(async (id: number) => {
    await assistantApi.deleteChat(id);
    reload();
  }, [reload]);
  return { ...list, create, remove };
}

/** id null = a chat not created yet: the first ask() creates it and reports the id through onCreated. */
export function useChat(id: number | null, onCreated?: (id: number) => void): {
  chat: ChatView | null; messages: MessageView[]; loading: boolean; loadError: ApiError | null;
  busy: boolean; askError: string | null; ask(question: string): Promise<void>; reload(): void;
} {
  const idRef = useRef(id);
  useEffect(() => { idRef.current = id; });
  const { data, error, loading, reload } = useApiResource(
    () => (id === null ? Promise.resolve(null) : assistantApi.getChat(id)), [id]);
  const [askError, setAskError] = useState<string | null>(null);

  // our answer finished, or another tab's finished in this chat: the persisted chat changed
  const { state, ref, commit, reconnects } = useTurnStream("chat", idRef, (prev, next) => {
    const finished = prev.turn?.status === "streaming" && next.turn?.status === "done" && prev.turn.requestId === next.turn.requestId;
    if (finished || next.reload) queueMicrotask(reload);
    return next.reload ? { ...next, reload: false } : next;
  });

  // events sent while disconnected were lost; the server kept whatever was saved
  useEffect(() => socket.onReconnect(() => {
    if (!ref.current.awaiting) commit(initialTurnState);
    reload();
  }), [ref, commit, reload]);

  const ask = useCallback(async (question: string) => {
    const invalid = validateQuestion(question);
    if (invalid) { setAskError(invalid); return; }
    if (isBusy(ref.current)) return;
    setAskError(null);
    commit(beginAsk(ref.current));
    const seen = reconnects.current;
    try {
      let chatId = idRef.current;
      if (chatId === null) {
        chatId = (await assistantApi.createChat()).id;
        idRef.current = chatId;
        onCreated?.(chatId);
      }
      const { requestId } = await assistantApi.askChat(chatId, question.trim());
      commit(acceptAsk(ref.current, requestId, question.trim(), { source: "chat", chatId }));
      if (reconnects.current !== seen) { commit(initialTurnState); reload(); return; }
      if (ref.current.turn?.status === "done") reload(); // the whole answer came before the 202
    } catch (e) {
      commit(failAsk(ref.current));
      setAskError(message(e));
    }
  }, [ref, commit, reconnects, onCreated, reload]);

  const busy = isBusy(state);
  const turnError = !busy && state.turn?.status === "error" ? state.turn.error ?? null : null;
  return {
    chat: data,
    messages: chatMessages(data?.messages ?? [], state.turn),
    loading,
    loadError: error,
    busy,
    askError: askError ?? turnError,
    ask,
    reload,
  };
}

/** Independent questions, nothing persisted: the turns live only while this hook is mounted. */
export function useGuideAsk(): { turns: Turn[]; busy: boolean; askError: string | null; ask(question: string): Promise<void> } {
  const noChat = useRef<number | null>(null);
  const [history, setHistory] = useState<Turn[]>([]);
  const [askError, setAskError] = useState<string | null>(null);
  const { state, ref, commit, reconnects } = useTurnStream("guide", noChat, (_prev, next) => next);

  useEffect(() => socket.onReconnect(() => commit(interrupt(ref.current, LOST_CONNECTION))), [ref, commit]);

  const ask = useCallback(async (question: string) => {
    const invalid = validateQuestion(question);
    if (invalid) { setAskError(invalid); return; }
    if (isBusy(ref.current)) return;
    setAskError(null);
    commit(beginAsk(ref.current));
    const seen = reconnects.current;
    try {
      const { requestId } = await assistantApi.askGuide(question.trim());
      const previous = ref.current.turn;
      if (previous) setHistory((h) => [...h, previous]);
      commit(acceptAsk(ref.current, requestId, question.trim(), { source: "guide", chatId: null }));
      if (reconnects.current !== seen) commit(interrupt(ref.current, LOST_CONNECTION));
    } catch (e) {
      commit(failAsk(ref.current));
      setAskError(message(e));
    }
  }, [ref, commit, reconnects]);

  return { turns: state.turn ? [...history, state.turn] : history, busy: isBusy(state), askError, ask };
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
    get: assistantApi.getSection,
    create: write(assistantApi.createSection),
    update: write(assistantApi.updateSection),
    remove: write(assistantApi.deleteSection),
  };
}
