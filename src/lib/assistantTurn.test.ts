import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptAsk, applyEvent, beginAsk, chatMessages, initialTurnState, interrupt, isBusy,
  askBlocker, settleFromServer, validateQuestion, validateSectionInput, type AssistantEvent, type TurnCtx,
} from "./assistantTurn.ts";
import type { MessageView } from "./apiTypes.ts";

const ctx: TurnCtx = { source: "chat", chatId: 7 };
const delta = (requestId: string, text: string, source: "chat" | "guide" = "chat"): AssistantEvent =>
  ({ type: "assistant.delta", payload: { source, requestId, chatId: 7, text } });
const done = (requestId: string, chatId: number | null = 7, messageId: number | null = 42): AssistantEvent =>
  ({ type: "assistant.done", payload: { source: "chat", requestId, chatId, messageId, sections: [] } });
const error = (requestId: string, message: string): AssistantEvent =>
  ({ type: "assistant.error", payload: { source: "chat", requestId, chatId: 7, message } });
const streaming = () => acceptAsk(beginAsk(initialTurnState), "r1", "¿Cuánto vendí?", ctx);
const apply = (s: ReturnType<typeof streaming>, ...evs: AssistantEvent[]) => evs.reduce((acc, e) => applyEvent(acc, e, ctx), s);
const m1: MessageView = { id: 1, role: "USER", content: "hola", createdAt: "2026-11-05T10:00:00Z" };

test("delta concatena en orden", () => {
  const s = apply(streaming(), delta("r1", "Ho"), delta("r1", "la"));
  assert.equal(s.turn?.text, "Hola");
  assert.equal(s.turn?.status, "streaming");
  assert.equal(isBusy(s), true);
});
test("ignora delta de otro requestId", () => {
  const s = streaming();
  assert.equal(applyEvent(s, delta("r2", "x"), ctx), s);
});
test("ignora eventos de otro source", () => {
  const s = streaming();
  assert.equal(applyEvent(s, delta("r1", "x", "guide"), ctx), s);
});
test("done guarda messageId y sections y libera", () => {
  const s = apply(streaming(), delta("r1", "Hola"), done("r1"));
  assert.equal(s.turn?.status, "done");
  assert.equal(s.turn?.messageId, 42);
  assert.deepEqual(s.turn?.sections, []);
  assert.equal(isBusy(s), false);
});
test("error marca el turno y saca lo optimista del chat", () => {
  const s = apply(streaming(), delta("r1", "Ho"), error("r1", "Sin cuota"));
  assert.equal(s.turn?.status, "error");
  assert.equal(s.turn?.error, "Sin cuota");
  assert.deepEqual(chatMessages([m1], s.turn), [m1]);
  assert.equal(isBusy(s), false);
});
test("done ajeno del mismo chat → reload", () => {
  assert.equal(applyEvent(initialTurnState, done("otro", 7), ctx).reload, true);
  assert.equal(applyEvent(initialTurnState, done("otro", 8), ctx).reload, false);
});
test("buffer: eventos antes del 202 se aplican al aceptar", () => {
  let s = beginAsk(initialTurnState);
  s = apply(s, delta("r1", "Ho"), delta("rX", "zz"), done("r1"));
  assert.equal(isBusy(s), true);
  s = acceptAsk(s, "r1", "¿Cuánto vendí?", ctx);
  assert.equal(s.turn?.text, "Ho");
  assert.equal(s.turn?.status, "done");
  assert.deepEqual(s.buffer, []);
});
test("buffer: done propio no marca reload", () => {
  let s = apply(beginAsk(initialTurnState), delta("r1", "Ho"), done("r1"));
  s = acceptAsk(s, "r1", "q", ctx);
  assert.equal(s.reload, false);
});
test("interrupt pasa streaming a error", () => {
  const s = interrupt(streaming(), "Se perdió la conexión");
  assert.equal(s.turn?.status, "error");
  assert.equal(s.turn?.error, "Se perdió la conexión");
});
test("chatMessages agrega lo optimista y no duplica lo ya recargado", () => {
  const s = apply(streaming(), delta("r1", "Hola"));
  const msgs = chatMessages([m1], s.turn);
  assert.equal(msgs.length, 3);
  assert.equal(msgs[1].id, -1);
  assert.equal(msgs[1].role, "USER");
  assert.equal(msgs[2].role, "ASSISTANT");
  assert.equal(msgs[2].content, "Hola");
  const d = apply(s, done("r1"));
  const server = [m1, { ...m1, id: 41 }, { ...m1, id: 42, role: "ASSISTANT" as const }];
  assert.deepEqual(chatMessages(server, d.turn), server);
});

test("validateQuestion", () => {
  assert.notEqual(validateQuestion("  "), null);
  assert.notEqual(validateQuestion("a".repeat(2001)), null);
  assert.equal(validateQuestion("a".repeat(2000)), null);
});
test("validateSectionInput", () => {
  const file = { size: 1000 } as File;
  assert.equal(validateSectionInput("x", { size: 10 * 1024 * 1024 + 1 } as File, true)?.field, "file");
  assert.equal(validateSectionInput("x", { size: 10 * 1024 * 1024 } as File, true), null);
  assert.equal(validateSectionInput("", file, true)?.field, "name");
  assert.equal(validateSectionInput("a".repeat(121), file, true)?.field, "name");
  assert.equal(validateSectionInput("x", undefined, true)?.field, "file");
  assert.notEqual(validateSectionInput(undefined, undefined, false), null);
  assert.equal(validateSectionInput("nuevo", undefined, false), null);
});

test("askBlocker: sin socket autenticado no se pregunta (la respuesta se perdería)", () => {
  assert.notEqual(askBlocker(initialTurnState, false), null);
  assert.equal(askBlocker(initialTurnState, true), null);
  assert.notEqual(askBlocker(streaming(), true), null);
});

test("interrupt mientras el POST está en vuelo no libera (lo resuelve ask)", () => {
  const s = beginAsk(initialTurnState);
  assert.equal(interrupt(s, "x"), s);
  assert.equal(isBusy(interrupt(s, "x")), true);
});
const q: MessageView = { id: 41, role: "USER", content: "¿Cuánto vendí?", createdAt: "2026-11-05T10:01:00Z" };
const a: MessageView = { id: 50, role: "ASSISTANT", content: "Vendiste $10", createdAt: "2026-11-05T10:01:05Z" };
test("chatMessages: si el servidor ya guardó la pregunta, no la duplica", () => {
  const s = apply(streaming(), delta("r1", "Ven"));
  const msgs = chatMessages([m1, q], s.turn);
  assert.deepEqual(msgs.map((m) => m.role), ["USER", "USER", "ASSISTANT"]);
  assert.equal(msgs[1], q);
});
test("chatMessages: done sin messageId con el par ya recargado no duplica", () => {
  const s = apply(streaming(), delta("r1", "Vendiste $10"), done("r1", 7, null));
  assert.deepEqual(chatMessages([m1, q, a], s.turn), [m1, q, a]);
});
test("settleFromServer: si el servidor ya tiene la respuesta, el turno termina", () => {
  const s = settleFromServer(apply(streaming(), delta("r1", "Ven")), [m1, q, a]);
  assert.equal(s.turn?.status, "done");
  assert.equal(s.turn?.messageId, 50);
  assert.equal(isBusy(s), false);
});
test("settleFromServer: sin respuesta guardada sigue en curso", () => {
  const s0 = apply(streaming(), delta("r1", "Ven"));
  assert.equal(settleFromServer(s0, [m1, q]), s0);
  assert.equal(settleFromServer(s0, [m1]), s0);
});

test("validateSectionInput: solo PDF", () => {
  assert.equal(validateSectionInput("x", { size: 10, name: "foto.png", type: "image/png" } as File, true)?.field, "file");
  assert.equal(validateSectionInput("x", { size: 10, name: "manual.PDF", type: "" } as File, true), null);
  assert.equal(validateSectionInput("x", { size: 10, name: "manual", type: "application/pdf" } as File, true), null);
});
