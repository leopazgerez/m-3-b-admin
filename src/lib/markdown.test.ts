import test from "node:test";
import assert from "node:assert/strict";
import { inline, blocks } from "./markdown.ts";

test("inline: negrita, cursiva y código", () => {
  assert.deepEqual(inline("la ganancia fue de **$1.421.172,56** (con *ventas*) y `x`"), [
    { t: "text", v: "la ganancia fue de " },
    { t: "b", v: "$1.421.172,56" },
    { t: "text", v: " (con " },
    { t: "i", v: "ventas" },
    { t: "text", v: ") y " },
    { t: "code", v: "x" },
  ]);
});
test("inline: asteriscos sueltos quedan como texto", () => {
  assert.deepEqual(inline("2 * 3 = 6"), [{ t: "text", v: "2 * 3 = 6" }]);
  assert.deepEqual(inline("**sin cerrar"), [{ t: "text", v: "**sin cerrar" }]);
});
test("blocks: párrafos, listas y títulos", () => {
  assert.deepEqual(blocks("## Resumen\nLínea 1\nLínea 2\n\n- uno\n* dos\n1. tres\n2) cuatro\n\nFin"), [
    { kind: "h", text: "Resumen" },
    { kind: "p", lines: ["Línea 1", "Línea 2"] },
    { kind: "ul", items: ["uno", "dos"] },
    { kind: "ol", items: ["tres", "cuatro"] },
    { kind: "p", lines: ["Fin"] },
  ]);
});
test("blocks: texto vacío o en streaming parcial", () => {
  assert.deepEqual(blocks(""), []);
  assert.deepEqual(blocks("Hola **mun"), [{ kind: "p", lines: ["Hola **mun"] }]);
});
