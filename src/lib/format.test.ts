import test from "node:test";
import assert from "node:assert/strict";
import { money } from "./format.ts";

test("money con signo adelante", () => { assert.equal(money(1500.5), "$1.500,5"); assert.equal(money(-1500), "-$1.500"); assert.equal(money(0), "$0"); });
