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

import { mountPanitiaSephia } from "../src/host/mount-panitia-sephia.js";
test("wake-word diagnostics callbacks are supplied from the host body (showDiag in scope)", () => {
  let cb;
  const win = { addEventListener() {}, removeEventListener() {} };
  const els = [];
  const doc = {
    getElementById: (id) => ({ id, appendChild(n) { els.push(n); } }),
    createElement: () => ({ style: {}, setAttribute() {}, set textContent(v) { this._t = v; }, get textContent() { return this._t; } }),
  };
  const b = mountPanitiaSephia({
    documentImpl: doc, windowImpl: win, autoActivate: false,
    createWakeWordRecognizer: (_w, callbacks) => { cb = callbacks; return { start: async () => true, stop() {}, pause() {}, resume: async () => true, dispose() {} }; },
    createSpeechAdapter: () => ({ speak: async () => {}, cancel() {}, dispose() {} }),
    createRuntime: () => ({ isActive: false, activate() {}, deactivate() {}, dispose() {} }),
    mountControls: () => ({ dispose() {} }), bindLifecycle: () => ({ dispose() {} }),
  });
  assert.equal(typeof cb.onTrace, "function");
  assert.equal(typeof cb.onHeard, "function");
  cb.onTrace("soundstart");
  cb.onHeard("sofia");
  assert.match(els[0].textContent, /terdengar: .sofia./);
  b.dispose();
});

import { selectIndonesianVoice, createBrowserLocalIndonesianTts } from "../src/audio/browser-local-tts.js";
test("relaxed voice selection accepts non-female, non-local Indonesian voices", () => {
  const v = [{ name: "Google US English", lang: "en-US", localService: false }, { name: "Google Bahasa Indonesia", lang: "id-ID", localService: false }];
  assert.equal(selectIndonesianVoice(v).name, "Google Bahasa Indonesia");
  assert.equal(selectIndonesianVoice([{ name: "X", lang: "en-US" }]), null);
});
test("relaxed adapter is available and speaks even without an Indonesian voice", async () => {
  const spoken = [];
  const synth = { getVoices: () => [], speak(u) { spoken.push(u); setTimeout(() => u.onend(), 0); }, cancel() {}, addEventListener() {}, removeEventListener() {} };
  class U { constructor(t) { this.text = t; } }
  const a = createBrowserLocalIndonesianTts({ speechSynthesisImpl: synth, UtteranceImpl: U, relaxed: true });
  assert.equal(a.available, true);
  await a.speak("halo");
  assert.equal(spoken[0].lang, "id-ID");
});

import { isLooseWakeWord } from "../src/audio/local-wake-word.js";
test("loose wake word accepts Chrome mis-hearings of Sephia but not unrelated speech", () => {
  const acc = new Set(["sephia", "sefia", "sofia", "sepia"]);
  for (const t of ["save ya", "sephia", "sofia", "sefiya", "sepiya", "safia", "sepia"]) assert.equal(isLooseWakeWord(t, acc), true, t);
  for (const t of ["halo semuanya", "tolong cek ruang dua", "siswa terkunci", "selamat pagi bapak ibu"]) assert.equal(isLooseWakeWord(t, acc), false, t);
});
