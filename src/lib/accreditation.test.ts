import test from "node:test";
import assert from "node:assert/strict";
import { coversOtherSales, feePreview, isAccreditable, parseReceived, PENDING_ACCREDITATION } from "./accreditation.ts";
import { encodeFilter } from "./apiQuery.ts";

test("pending filter encodes to the documented base64", () => {
  const json = '{"combinator":"AND","filters":[{"field":"accreditation","operator":"EQUALS","value":"PENDING"}]}';
  assert.equal(encodeFilter(PENDING_ACCREDITATION), Buffer.from(json, "utf8").toString("base64"));
});
test("parseReceived", () => {
  assert.deepEqual(parseReceived("29400", 30000), { amount: 29400 });
  assert.deepEqual(parseReceived(" 30000.00 ", 30000), { amount: 30000 });
  assert.match((parseReceived("", 30000) as { error: string }).error, /mayor a 0/);
  assert.match((parseReceived("0", 30000) as { error: string }).error, /mayor a 0/);
  assert.match((parseReceived("-5", 30000) as { error: string }).error, /mayor a 0/);
  assert.match((parseReceived("1.234", 30000) as { error: string }).error, /2 decimales/);
  assert.match((parseReceived("30000.01", 30000) as { error: string }).error, /superar/);
});
test("feePreview", () => {
  assert.deepEqual(feePreview("29400", 30000), { fee: 600, pct: 2 });
  assert.deepEqual(feePreview("30000", 30000), { fee: 0, pct: 0 });
  assert.deepEqual(feePreview("100.1", 110.3), { fee: 10.2, pct: 9.25 });
  assert.equal(feePreview("31000", 30000), null);
  assert.equal(feePreview("abc", 30000), null);
});
test("isAccreditable", () => {
  assert.equal(isAccreditable("PENDING"), true);
  assert.equal(isAccreditable("ACCREDITED"), true);
  assert.equal(isAccreditable("NONE"), false);
  assert.equal(isAccreditable(undefined), false);
});
test("coversOtherSales", () => {
  assert.equal(coversOtherSales({ amount: 33000, receivedAmount: 31700, fee: 1300 }), false);
  assert.equal(coversOtherSales({ amount: 110.3, receivedAmount: 100.1, fee: 10.2 }), false);
  assert.equal(coversOtherSales({ amount: 20000, receivedAmount: 31700, fee: 1300 }), true);
  assert.equal(coversOtherSales({ amount: 33000, receivedAmount: null, fee: null }), false);
});
