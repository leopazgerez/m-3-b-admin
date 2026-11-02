import test from "node:test";
import assert from "node:assert/strict";
import { round2, estimateSale, fillPayments } from "./saleEstimate.ts";

test("round2 HALF_UP", () => {
  assert.equal(round2(1.005), 1.01); assert.equal(round2(10.555), 10.56); assert.equal(round2(2.675), 2.68);
});
test("estimateSale con % y recargo", () => {
  assert.deepEqual(
    estimateSale([{ unitPrice: 1000, quantity: 2 }, { unitPrice: 333.33, quantity: 3 }],
      { kind: "percent", value: 10 }, [{ amount: 1000, surchargePct: 10 }]),
    { gross: 2999.99, discount: 300, surcharge: 100, totalDue: 2799.99, paidBase: 1000, remaining: 1699.99 });
});
test("estimateSale sin descuento ni pagos", () => {
  assert.deepEqual(estimateSale([{ unitPrice: 50, quantity: 1 }], null, []),
    { gross: 50, discount: 0, surcharge: 0, totalDue: 50, paidBase: 0, remaining: 50 });
});
test("fillPayments: el pago sin tipear sigue al saldo", () => {
  assert.deepEqual(fillPayments([null], 0), [0]);
  assert.deepEqual(fillPayments([null], 30000), [30000]);
  assert.deepEqual(fillPayments([10000, null], 30000), [10000, 20000]);
  assert.deepEqual(fillPayments([null, null], 50), [50, 0]);
  assert.deepEqual(fillPayments([40000, null], 30000), [40000, 0]);
  assert.deepEqual(fillPayments([0.1, null], 0.3), [0.1, 0.2]);
});
