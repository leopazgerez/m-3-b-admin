import test from "node:test";
import assert from "node:assert/strict";
import { feedback } from "./feedback.ts";

test("pending cuenta llamadas en curso y no baja de cero", () => {
  feedback.begin(); feedback.begin();
  assert.equal(feedback.pending(), 2);
  feedback.end(); feedback.end(); feedback.end();
  assert.equal(feedback.pending(), 0);
});
test("toasts: avisa, guarda los últimos 4 y se cierran", () => {
  let calls = 0;
  const off = feedback.subscribe(() => calls++);
  for (let i = 1; i <= 5; i++) feedback.success(`op ${i}`);
  feedback.error("falló");
  assert.deepEqual(feedback.toasts().map((t) => t.text), ["op 3", "op 4", "op 5", "falló"]);
  assert.equal(feedback.toasts()[3].kind, "error");
  feedback.dismiss(feedback.toasts()[0].id);
  assert.equal(feedback.toasts().length, 3);
  off();
  feedback.success("sin oyente");
  assert.equal(calls, 7);
});
