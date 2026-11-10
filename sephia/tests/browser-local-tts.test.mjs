import test from "node:test";
import assert from "node:assert/strict";
import { createBrowserLocalIndonesianTts, selectIndonesianLocalVoice } from "../src/audio/browser-local-tts.js";

class FakeUtterance {
  constructor(text) { this.text = text; }
}

function fakeSynthesis(voices) {
  const listeners = new Map();
  const calls = { spoken: [], cancelled: 0 };
  return {
    calls,
    getVoices: () => voices,
    speak(utterance) { calls.spoken.push(utterance); queueMicrotask(() => utterance.onend?.()); },
    cancel() { calls.cancelled += 1; },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
    emit(type) { listeners.get(type)?.(); },
  };
}

test("selects only local Indonesian voices and prefers an explicitly feminine hint", () => {
  const voices = [
    { name: "English Local", lang: "en-US", localService: true },
    { name: "Indonesian Cloud", lang: "id-ID", localService: false },
    { name: "Indonesian Female", lang: "id-ID", localService: true },
  ];
  assert.equal(selectIndonesianLocalVoice(voices), voices[2]);
  assert.equal(selectIndonesianLocalVoice(voices.slice(0, 2)), null);
});

test("speaks Indonesian with explicit id-ID and calm voice parameters", async () => {
  const voice = { name: "Indonesian Local", lang: "id-ID", localService: true };
  const synthesis = fakeSynthesis([voice]);
  const adapter = createBrowserLocalIndonesianTts({
    speechSynthesisImpl: synthesis,
    UtteranceImpl: FakeUtterance,
  });

  assert.equal(adapter.available, true);
  await adapter.speak("Perhatian, Panitia.");
  const utterance = synthesis.calls.spoken[0];
  assert.equal(utterance.lang, "id-ID");
  assert.equal(utterance.voice, voice);
  assert.equal(utterance.rate, 0.9);
  assert.equal(utterance.pitch, 1.04);
  assert.equal(utterance.volume, 1);
  adapter.dispose();
});

test("refuses cloud voices and English-only default voices", async () => {
  const synthesis = fakeSynthesis([
    { name: "English Default", lang: "en-US", localService: true },
    { name: "Google Indonesian", lang: "id-ID", localService: false },
  ]);
  const adapter = createBrowserLocalIndonesianTts({
    speechSynthesisImpl: synthesis,
    UtteranceImpl: FakeUtterance,
  });
  assert.equal(adapter.available, false);
  await assert.rejects(adapter.speak("Uji"), /Tidak ditemukan suara TTS lokal Bahasa Indonesia/);
  assert.equal(synthesis.calls.spoken.length, 0);
  adapter.dispose();
});

test("reports missing browser speech APIs as unavailable without throwing at mount", async () => {
  const adapter = createBrowserLocalIndonesianTts({
    speechSynthesisImpl: null,
    UtteranceImpl: null,
  });
  assert.equal(adapter.available, false);
  await assert.rejects(adapter.speak("Uji"), /Browser speech synthesis is unavailable/);
});


test("cancel while waiting for Indonesian voice prevents a late utterance", async () => {
  const voices = [];
  const synthesis = fakeSynthesis(voices);
  const adapter = createBrowserLocalIndonesianTts({
    speechSynthesisImpl: synthesis,
    UtteranceImpl: FakeUtterance,
  });
  const pending = adapter.speak("Pengumuman uji");
  adapter.cancel();
  voices.push({ name: "Indonesian Local", lang: "id-ID", localService: true });
  synthesis.emit("voiceschanged");
  await assert.rejects(pending, /dibatalkan/);
  assert.equal(synthesis.calls.spoken.length, 0);
  adapter.dispose();
});
