import test from "node:test";
import assert from "node:assert/strict";
import { canReturn, estimateReturnValue, returnBlocker } from "./returns.ts";
import type { Sale } from "./apiTypes.ts";

const sale = (over: Partial<Sale>) => ({
  type: "REGULAR", cancelledAt: null, lines: [{ quantity: 2, returnedQuantity: 1 }], ...over,
}) as Sale;

test("canReturn", () => {
  assert.equal(canReturn(sale({})), true);
  assert.equal(canReturn(sale({ cancelledAt: "2026-10-01T00:00:00Z" })), false);
  assert.equal(canReturn(sale({ type: "GIFT" })), false);
  assert.equal(canReturn(sale({ type: "INTERNAL" })), false);
  assert.equal(canReturn(sale({ lines: [{ quantity: 2, returnedQuantity: 2 }] as Sale["lines"] })), false);
});
test("estimateReturnValue", () => {
  assert.equal(estimateReturnValue([{ unitPrice: 333.33, quantity: 3 }, { unitPrice: 0.01, quantity: 1 }]), 1000);
});
test("returnBlocker", () => {
  assert.match(returnBlocker([], false)!, /al menos/);
  assert.match(returnBlocker([{ quantity: 1, faulty: false }], false)!, /falladas/);
  assert.equal(returnBlocker([{ quantity: 1, faulty: false }], true), null);
  assert.equal(returnBlocker([{ quantity: 1, faulty: true }], false), null);
});
