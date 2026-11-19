import test from "node:test";
import assert from "node:assert/strict";
import { createHybridSpeechAdapter } from "../src/audio/hybrid-speech-adapter.js";

const mk = (over = {}) => ({ available: true, calls: [], async speak(t) { this.calls.push(t); }, cancel() {}, dispose() {}, ...over });

test("uses neural when available", async () => {
  const neural = mk(), browser = mk();
  const h = createHybridSpeechAdapter({ neural, browser });
  await h.speak("a");
  assert.deepEqual(neural.calls, ["a"]);
  assert.equal(browser.calls.length, 0);
  assert.equal(h.engine, "neural");
});

test("falls back to browser when neural is unavailable", async () => {
  const neural = mk({ available: false }), browser = mk();
  const h = createHybridSpeechAdapter({ neural, browser });
  await h.speak("b");
  assert.deepEqual(browser.calls, ["b"]);
  assert.equal(h.available, true);
  assert.equal(h.engine, "browser");
});

test("falls back to browser when neural speak fails", async () => {
  const neural = mk({ async speak() { throw new Error("boom"); } }), browser = mk();
  const h = createHybridSpeechAdapter({ neural, browser });
  await h.speak("c");
  assert.deepEqual(browser.calls, ["c"]);
});

test("is never silent-by-design when only browser exists; errors when none usable", async () => {
  const h = createHybridSpeechAdapter({ neural: null, browser: mk({ available: false }) });
  assert.equal(h.available, false);
  await assert.rejects(() => h.speak("d"));
});

import { readFileSync } from "node:fs";
test("host wires hybrid adapter with browser TTS fallback and controller wake acknowledgement", () => {
  const host = readFileSync(new URL("../src/host/mount-panitia-sephia.js", import.meta.url), "utf8");
  assert.match(host, /createHybridSpeechAdapter/);
  assert.match(host, /createBrowserLocalIndonesianTts/);
  assert.match(host, /createChromeNativeMessagingTtsAdapter/);
  assert.match(host, /acknowledgeWakeWord/);
});
