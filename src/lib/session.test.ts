import test from "node:test";
import assert from "node:assert/strict";
import { isExpired } from "./session.ts";

test("isExpired", () => {
  const now = new Date("2026-10-21T12:00:00Z");
  assert.equal(isExpired("2026-10-21T11:59:59Z", now), true);
  assert.equal(isExpired("2026-10-21T12:00:01Z", now), false);
  assert.equal(isExpired("no-es-fecha", now), true);
});
