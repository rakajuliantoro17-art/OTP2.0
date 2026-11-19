import test from "node:test";
import assert from "node:assert/strict";
import { createNotificationSpeechController, DEFAULT_ANNOUNCEMENT, WAKE_WORD_ACKNOWLEDGEMENT } from "../src/audio/announcement.js";
import { createLocalNeuralTtsAdapter } from "../src/audio/local-neural-tts.js";

function makeAdapter() {
  const calls = { synthesized: [], played: [], released: [], cancelled: 0 };
  const engine = {
    available: true,
    async synthesize(text, { signal }) {
      calls.synthesized.push({ text, signal });
      return { audio: "memory-only" };
    },
    cancel() { calls.cancelled += 1; },
  };
  const player = {
    async play(audio) { calls.played.push(audio); },
    cancel() { calls.cancelled += 1; },
    release(audio) { calls.released.push(audio); },
  };
  return { adapter: createLocalNeuralTtsAdapter({ engine, player }), calls };
}

test("controller sends only its fixed generic announcement to neural TTS", async () => {
  const { adapter, calls } = makeAdapter();
  const controller = createNotificationSpeechController({ adapter });
  const accepted = await controller.announce({
    eventId: "synthetic-event-27",
    eventType: "violation",
    violationCount: 27,
    studentName: "MUST NEVER BE SPOKEN",
    className: "MUST NEVER BE SPOKEN",
  });
  assert.equal(accepted, true);
  assert.deepEqual(calls.synthesized.map((entry) => entry.text), [DEFAULT_ANNOUNCEMENT]);
  assert.equal(calls.synthesized[0].text.includes("MUST NEVER BE SPOKEN"), false);
  assert.equal(calls.played.length, 1);
  assert.equal(calls.released.length, 1);
  controller.dispose();
  adapter.dispose();
});

test("controller rejects ineligible notification metadata before neural synthesis", async () => {
  const { adapter, calls } = makeAdapter();
  const controller = createNotificationSpeechController({ adapter });
  for (const event of [
    { eventId: "bad-26", eventType: "violation", violationCount: 26 },
    { eventId: "bad-31", eventType: "violation", violationCount: 31 },
    { eventId: "bad-type", eventType: "info", violationCount: 27 },
    { eventId: "", eventType: "violation", violationCount: 27 },
    { eventId: "bad-float", eventType: "violation", violationCount: 27.5 },
  ]) {
    assert.equal(await controller.announce(event), false);
  }
  assert.equal(calls.synthesized.length, 0);
  controller.dispose();
  adapter.dispose();
});

test("controller stop cancels pending neural playback and suppresses completion", async () => {
  let rejectOnAbort;
  const calls = { synthesized: 0, played: 0, released: 0 };
  const engine = {
    available: true,
    async synthesize() { calls.synthesized += 1; return { audio: true }; },
  };
  const player = {
    play(_audio, { signal }) {
      calls.played += 1;
      return new Promise((_resolve, reject) => {
        rejectOnAbort = reject;
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    },
    cancel() {},
    release() { calls.released += 1; },
  };
  const adapter = createLocalNeuralTtsAdapter({ engine, player });
  const controller = createNotificationSpeechController({ adapter });
  const pending = controller.announce({
    eventId: "synthetic-event-28",
    eventType: "violation",
    violationCount: 28,
  });
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  controller.stop();
  assert.equal(await pending, false);
  assert.equal(calls.synthesized, 1);
  assert.equal(calls.played, 1);
  assert.equal(calls.released, 1);
  assert.equal(typeof rejectOnAbort, "function");
  controller.dispose();
  adapter.dispose();
});

test("controller stays silent without an unlocked local audio bridge", async () => {
  let spoken = 0;
  const adapter = {
    available: false,
    async speak() { spoken += 1; },
    cancel() {},
  };
  const controller = createNotificationSpeechController({ adapter });
  assert.equal(await controller.announce({
    eventId: "synthetic-event-unavailable",
    eventType: "violation",
    violationCount: 27,
  }), false);
  assert.equal(spoken, 0);
  controller.dispose();
});

test("manual speaker test speaks only the fixed approved phrase", async () => {
  const { adapter, calls } = makeAdapter();
  const controller = createNotificationSpeechController({ adapter });
  assert.equal(await controller.test(), true);
  assert.deepEqual(calls.synthesized.map((entry) => entry.text), [DEFAULT_ANNOUNCEMENT]);
  assert.equal(calls.played.length, 1);
  controller.dispose();
  adapter.dispose();
});

test("wake-word acknowledgement speaks only its fixed generic phrase", async () => {
  const { adapter, calls } = makeAdapter();
  const controller = createNotificationSpeechController({ adapter });
  assert.equal(await controller.acknowledgeWakeWord(), true);
  assert.deepEqual(calls.synthesized.map((entry) => entry.text), [WAKE_WORD_ACKNOWLEDGEMENT]);
  assert.equal(calls.played.length, 1);
  assert.equal(calls.released.length, 1);
  controller.dispose();
  adapter.dispose();
});

test("wake-word acknowledgement remains silent when the local bridge is unavailable", async () => {
  let spoken = 0;
  const controller = createNotificationSpeechController({
    adapter: { available: false, async speak() { spoken += 1; }, cancel() {} },
  });
  assert.equal(await controller.acknowledgeWakeWord(), false);
  assert.equal(spoken, 0);
  controller.dispose();
});

test("manual speaker test remains silent when the native bridge is unavailable", async () => {
  let spoken = 0;
  const controller = createNotificationSpeechController({
    adapter: { available: false, async speak() { spoken += 1; }, cancel() {} },
  });
  assert.equal(await controller.test(), false);
  assert.equal(spoken, 0);
  controller.dispose();
});
