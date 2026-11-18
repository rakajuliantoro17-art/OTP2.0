import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const host = readFileSync(new URL("../src/host/mount-panitia-sephia.js", import.meta.url), "utf8");
const controls = readFileSync(new URL("../src/visual/mount-sephia-controls.js", import.meta.url), "utf8");

test("host auto-activates by default and primes TTS on first interaction", () => {
  assert.match(host, /autoActivate = true/);
  assert.match(host, /controls\.activate\?\.\(\)/);
  assert.match(host, /pointerdown/);
});

test("controls expose activate()", () => {
  assert.match(controls, /activate\(\)\s*{[^}]*onTrigger\(\)/);
});
