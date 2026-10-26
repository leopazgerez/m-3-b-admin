import test from "node:test";
import assert from "node:assert/strict";
import { encodeFilter, toSearchParams, instantRangeCriteria, dateRangeCriteria, collectAll, errorInfo } from "./apiQuery.ts";

test("encodeFilter: vacío → undefined", () => assert.equal(encodeFilter([]), undefined));
test("encodeFilter: UTF-8", () => {
  const f = encodeFilter([{ field: "city", operator: "EQUALS", value: "Córdoba" }])!;
  assert.deepEqual(JSON.parse(Buffer.from(f, "base64").toString("utf8")),
    { combinator: "AND", filters: [{ field: "city", operator: "EQUALS", value: "Córdoba" }] });
});
test("toSearchParams omite vacíos", () => {
  assert.equal(toSearchParams({ length: 20, search: "  ", filters: [], sortDir: "asc" }).toString(), "length=20&sortDir=asc");
});
test("instantRangeCriteria usa días locales (AR, UTC-3)", () => {
  assert.deepEqual(instantRangeCriteria("soldAt", "2026-10-01", "2026-10-01"), [
    { field: "soldAt", operator: "GREATER_OR_EQUAL", value: "2026-10-01T03:00:00.000Z" },
    { field: "soldAt", operator: "LESS_THAN", value: "2026-10-02T03:00:00.000Z" },
  ]);
  assert.deepEqual(instantRangeCriteria("soldAt"), []);
});
test("dateRangeCriteria", () => {
  assert.deepEqual(dateRangeCriteria("incurredOn", undefined, "2026-10-31"),
    [{ field: "incurredOn", operator: "LESS_OR_EQUAL", value: "2026-10-31" }]);
});
test("collectAll sigue nextCursor", async () => {
  const pages: Record<string, { items: number[]; nextCursor: string | null }> =
    { "": { items: [1, 2], nextCursor: "a" }, a: { items: [3], nextCursor: null } };
  assert.deepEqual(await collectAll((c) => Promise.resolve(pages[c ?? ""])), [1, 2, 3]);
});
test("errorInfo", () => {
  assert.deepEqual(errorInfo(409, { message: "Product still has stock", status: 409, details: { productId: 1 } }),
    { message: "Product still has stock", field: undefined, details: { productId: 1 } });
  assert.equal(errorInfo(502, "<html>").message, "HTTP 502");
});
