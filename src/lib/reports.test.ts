import test from "node:test";
import assert from "node:assert/strict";
import { periodParams, monthLabel, pctLabel, barRatio, pruneReadIds } from "./reports.ts";

test("periodParams current", () => assert.deepEqual(periodParams({ kind: "current" }, "2026-10-22"), {}));
test("periodParams previous cruza año y bisiesto", () => {
  assert.deepEqual(periodParams({ kind: "previous" }, "2026-01-15"), { from: "2025-12-01", to: "2025-12-31" });
  assert.deepEqual(periodParams({ kind: "previous" }, "2024-03-10"), { from: "2024-02-01", to: "2024-02-29" });
  assert.deepEqual(periodParams({ kind: "previous" }, "2026-10-31"), { from: "2026-09-01", to: "2026-09-30" });
});
test("periodParams custom", () => {
  assert.deepEqual(periodParams({ kind: "custom", from: "2026-10-01", to: "2026-10-10" }, "2026-10-22"), { from: "2026-10-01", to: "2026-10-10" });
  assert.equal(periodParams({ kind: "custom", from: "2026-10-11", to: "2026-10-10" }, "2026-10-22"), null);
  assert.equal(periodParams({ kind: "custom", from: "", to: "2026-10-10" }, "2026-10-22"), null);
});
test("monthLabel", () => { assert.equal(monthLabel("2026-10"), "oct 26"); assert.equal(monthLabel("2027-01"), "ene 27"); });
test("pctLabel", () => { assert.equal(pctLabel(null), "—"); assert.equal(pctLabel(12.5), "12,5%"); assert.equal(pctLabel(-3), "-3%"); });
test("barRatio", () => { assert.equal(barRatio(5, 0), 0); assert.equal(barRatio(5, 10), 0.5); assert.equal(barRatio(-1, 10), 0); });
test("pruneReadIds", () => assert.deepEqual(pruneReadIds(["a", "b", "c"], ["c", "a", "z"]), ["a", "c"]));
