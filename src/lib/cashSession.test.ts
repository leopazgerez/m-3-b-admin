import test from "node:test";
import assert from "node:assert/strict";
import { canVoid, liveDifference, movementBody, parseAmount, signedAmount, toAmounts, toLocalDateTimeInput, voidedMovementIds } from "./cashSession.ts";
import type { CashSessionRow } from "./apiTypes.ts";

const row = (over: Partial<CashSessionRow>) => ({
  kind: "MOVEMENT", id: 1, fromAccountId: null, toAccountId: 1, amount: 100, at: "2026-10-29T12:00:00Z",
  late: false, voidedHere: false, ...over,
}) as CashSessionRow;

test("parseAmount", () => {
  assert.equal(parseAmount("70500"), 70500);
  assert.equal(parseAmount(" -1200.5 "), -1200.5);
  assert.equal(parseAmount("0"), 0);
  assert.equal(parseAmount(".5"), 0.5);
  assert.equal(parseAmount("-.5"), -0.5);
  assert.equal(parseAmount("5."), 5);
  assert.equal(parseAmount("-"), null);
  assert.equal(parseAmount("."), null);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("1.234"), null);
  assert.equal(parseAmount("abc"), null);
});
test("toAmounts", () => {
  const lines = [{ accountId: 1, name: "Efectivo" }, { accountId: 2, name: "Banco" }];
  assert.deepEqual(toAmounts(lines, { 1: "10", 2: "-3.5" }), { amounts: [{ accountId: 1, amount: 10 }, { accountId: 2, amount: -3.5 }] });
  assert.match((toAmounts(lines, { 1: "10" }) as { error: string }).error, /Banco/);
});
test("liveDifference", () => {
  assert.equal(liveDifference("70500", 71000), -500);
  assert.equal(liveDifference("0.3", 0.1), 0.2);
  assert.equal(liveDifference("", 10), null);
});
test("signedAmount and canVoid", () => {
  assert.equal(signedAmount(row({ voidedHere: true })), -100);
  assert.equal(signedAmount(row({})), 100);
  const m = row({});
  assert.equal(canVoid(m, voidedMovementIds([m])), true);
  assert.equal(canVoid(m, voidedMovementIds([m, row({ voidedHere: true })])), false);
  assert.equal(canVoid(row({ voidedHere: true }), new Set()), false);
  assert.equal(canVoid(row({ kind: "PAYMENT" }), new Set()), false);
});
test("movementBody", () => {
  const now = new Date(2026, 9, 29, 15, 0);
  const d = { type: "INCOME" as const, fromAccountId: "2", toAccountId: "1", amount: "500", movedAt: "", reason: " Préstamo " };
  assert.deepEqual(movementBody(d, now), { body: { type: "INCOME", amount: 500, reason: "Préstamo", toAccountId: 1 } });
  assert.deepEqual(movementBody({ ...d, type: "WITHDRAWAL" }, now), {
    body: { type: "WITHDRAWAL", amount: 500, reason: "Préstamo", fromAccountId: 2 },
  });
  assert.match((movementBody({ ...d, type: "TRANSFER", toAccountId: "2" }, now) as { error: string }).error, /distintas/);
  assert.match((movementBody({ ...d, amount: "0" }, now) as { error: string }).error, /mayor a 0/);
  assert.match((movementBody({ ...d, reason: " " }, now) as { error: string }).error, /motivo/);
  assert.match((movementBody({ ...d, movedAt: "2026-10-29T15:30" }, now) as { error: string }).error, /futura/);
  const past = movementBody({ ...d, movedAt: "2026-10-29T09:15" }, now) as { body: { movedAt: string } };
  assert.equal(past.body.movedAt, new Date(2026, 9, 29, 9, 15).toISOString());
  assert.equal(toLocalDateTimeInput(now), "2026-10-29T15:00");
});
