import test from "node:test";
import assert from "node:assert/strict";
import {
  APPROVED_NEURAL_TTS_TEXT,
  createLocalNeuralTtsAdapter,
} from "../src/audio/local-neural-tts.js";

function fixture({ synthesize, play, available = true, timeoutMs = 12000 } = {}) {
  const calls = { synthesized: [], played: [], released: [], engineCancelled: 0, playerCancelled: 0, disposed: 0 };
  const engine = {
    available,
    async synthesize(text, options) {
      calls.synthesized.push({ text, signal: options.signal });
      return synthesize ? synthesize(text, options) : Promise.resolve({ bytes: new Uint8Array([1, 2, 3]) });
    },
    cancel() { calls.engineCancelled += 1; },
    dispose() { calls.disposed += 1; },
  };
  const player = {
    async play(audio, options) {
      calls.played.push({ audio, signal: options.signal });
      return play ? play(audio, options) : Promise.resolve();
    },
    cancel() { calls.playerCancelled += 1; },
    release(audio) { calls.released.push(audio); },
    dispose() { calls.disposed += 1; },
  };
  return {
    calls,
    adapter: createLocalNeuralTtsAdapter({ engine, player, timeoutMs }),
  };
}

test("accepts only the exact generic approved SEPHIA announcement", async () => {
  const { adapter, calls } = fixture();
  await assert.rejects(adapter.speak("Nama siswa dan kelas"), /tidak diizinkan/);
  await assert.rejects(adapter.speak(APPROVED_NEURAL_TTS_TEXT + " Pelanggaran 29"), /tidak diizinkan/);
  assert.equal(calls.synthesized.length, 0);
  adapter.dispose();
});

test("synthesizes and plays approved text through injected local engine only", async () => {
  const { adapter, calls } = fixture();
  assert.equal(adapter.available, true);
  assert.equal(await adapter.speak(APPROVED_NEURAL_TTS_TEXT), true);
  assert.equal(calls.synthesized.length, 1);
  assert.equal(calls.synthesized[0].text, APPROVED_NEURAL_TTS_TEXT);
  assert.equal(calls.played.length, 1);
  assert.deepEqual(calls.released, [calls.played[0].audio]);
  assert.equal(adapter.isSpeaking, false);
  adapter.dispose();
});

test("refuses an engine that is not explicitly ready", async () => {
  const { adapter, calls } = fixture({ available: false });
  assert.equal(adapter.available, false);
  await assert.rejects(adapter.speak(APPROVED_NEURAL_TTS_TEXT), /not ready/);
  assert.equal(calls.synthesized.length, 0);
  adapter.dispose();
});

test("rejects concurrent synthesis instead of queueing alerts", async () => {
  let finish;
  const { adapter, calls } = fixture({
    synthesize: () => new Promise((resolve) => { finish = resolve; }),
  });
  const first = adapter.speak(APPROVED_NEURAL_TTS_TEXT);
  await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(adapter.speak(APPROVED_NEURAL_TTS_TEXT), /busy/);
  finish({ audio: true });
  assert.equal(await first, true);
  assert.equal(calls.synthesized.length, 1);
  adapter.dispose();
});

test("cancel aborts in-flight synthesis and prevents playback", async () => {
  const { adapter, calls } = fixture({
    synthesize: (_text, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }),
  });
  const pending = adapter.speak(APPROVED_NEURAL_TTS_TEXT);
  await new Promise((resolve) => setImmediate(resolve));
  adapter.cancel();
  await assert.rejects(pending, /dibatalkan/);
  assert.equal(calls.played.length, 0);
  assert.equal(calls.engineCancelled, 1);
  assert.equal(calls.playerCancelled, 1);
  adapter.dispose();
});

test("cancel during playback releases generated audio", async () => {
  let rejectPlayback;
  const { adapter, calls } = fixture({
    play: (_audio, { signal }) => new Promise((_resolve, reject) => {
      rejectPlayback = reject;
      signal.addEventListener("abort", () => reject(new Error("playback aborted")), { once: true });
    }),
  });
  const pending = adapter.speak(APPROVED_NEURAL_TTS_TEXT);
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  adapter.cancel();
  await assert.rejects(pending, /dibatalkan/);
  assert.equal(calls.released.length, 1);
  assert.equal(typeof rejectPlayback, "function");
  adapter.dispose();
});

test("times out stalled synthesis and cancels engine and player", async () => {
  const { adapter, calls } = fixture({
    timeoutMs: 1000,
    synthesize: () => new Promise(() => {}),
  });
  await assert.rejects(adapter.speak(APPROVED_NEURAL_TTS_TEXT), /timed out/);
  assert.equal(calls.engineCancelled, 1);
  assert.equal(calls.playerCancelled, 1);
  assert.equal(adapter.isSpeaking, false);
  adapter.dispose();
});

test("dispose cancels work and releases engine/player resources", async () => {
  const { adapter, calls } = fixture({
    synthesize: (_text, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }),
  });
  const pending = adapter.speak(APPROVED_NEURAL_TTS_TEXT);
  await new Promise((resolve) => setImmediate(resolve));
  adapter.dispose();
  await assert.rejects(pending, /dibatalkan/);
  assert.equal(adapter.available, false);
  assert.equal(calls.disposed, 2);
  assert.throws(() => adapter.dispose(), { message: /./ });
});
