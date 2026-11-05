import test from "node:test";
import assert from "node:assert/strict";
import { backoffDelay, closeAction, createDispatcher, socketUrl } from "./socketProtocol.ts";

test("socketUrl", () => {
  assert.equal(socketUrl("http://localhost:8080/api"), "ws://localhost:8080/ws");
  assert.equal(socketUrl("https://x.com/api"), "wss://x.com/ws");
  assert.equal(socketUrl("https://x.com/v1/api"), "wss://x.com/v1/ws");
  assert.equal(socketUrl("https://x.com"), "wss://x.com/ws");
  assert.equal(socketUrl("/api", "https://admin.x.com/m-3-b-admin/ventas/"), "wss://admin.x.com/ws");
});
test("closeAction", () => {
  assert.equal(closeAction(1008, false), "login");
  assert.equal(closeAction(1006, false), "reconnect");
  assert.equal(closeAction(1000, false), "reconnect");
});
test("closeAction después de stop → none", () => assert.equal(closeAction(1008, true), "none"));
test("backoffDelay crece y respeta el tope", () => {
  assert.equal(backoffDelay(0, 0.5), 1000);
  assert.equal(backoffDelay(3, 0.5), 8000);
  assert.equal(backoffDelay(10, 1), 30000);
  assert.ok(backoffDelay(1, 0) >= 1500 && backoffDelay(1, 1) <= 2500);
});
test("dispatcher: rutea por type, ignora desconocidos y JSON roto", () => {
  const d = createDispatcher();
  const got: unknown[] = [];
  const off = d.on("assistant.delta", (p) => got.push(p));
  d.dispatch('{"type":"assistant.delta","payload":{"text":"a"}}');
  d.dispatch('{"type":"otro","payload":{}}');
  assert.equal(d.dispatch("no-json"), null);
  assert.equal(d.dispatch('{"payload":{}}'), null);
  off();
  d.dispatch('{"type":"assistant.delta","payload":{"text":"b"}}');
  assert.deepEqual(got, [{ text: "a" }]);
});
test("dispatcher: handler que tira no corta a los demás", () => {
  const d = createDispatcher();
  let ok = 0;
  d.on("x", () => { throw new Error("boom"); });
  d.on("x", () => ok++);
  d.dispatch('{"type":"x"}');
  assert.equal(ok, 1);
});
