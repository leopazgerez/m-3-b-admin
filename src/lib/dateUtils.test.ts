import test from "node:test";
import assert from "node:assert/strict";
import { formatInstant } from "./dateUtils.ts";

test("formatInstant muestra hora local (AR, UTC-3)", () => {
  assert.equal(formatInstant("2026-10-21T02:30:00Z"), "20/10/2026, 23:30");
});
