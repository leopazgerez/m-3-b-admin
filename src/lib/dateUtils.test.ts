import test from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatInstant, pastDayToInstant } from "./dateUtils.ts";

test("formatInstant muestra hora local (AR, UTC-3)", () => {
  assert.equal(formatInstant("2026-10-21T02:30:00Z"), "20/10/2026, 23:30");
});

test("formatDate muestra YYYY-MM-DD sin conversión de zona", () => {
  assert.equal(formatDate("2026-10-01"), "01/10/2026");
  assert.equal(formatDate(null), "—");
});

test("pastDayToInstant: día pasado = fin del día local; vacío, hoy o futuro = undefined", () => {
  assert.equal(pastDayToInstant("2026-10-20", "2026-10-21"), "2026-10-21T02:59:59.999Z");
  assert.equal(pastDayToInstant("", "2026-10-21"), undefined);
  assert.equal(pastDayToInstant("2026-10-21", "2026-10-21"), undefined);
  assert.equal(pastDayToInstant("2026-10-22", "2026-10-21"), undefined);
});
