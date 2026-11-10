import test from "node:test";
import assert from "node:assert/strict";
import { createLocalWakeWordRecognizer } from "../src/audio/local-wake-word.js";

function createWindow(availability = ["available"]) {
  const calls = { available: [], installs: 0, instances: [] };
  class FakeRecognition {
    static async available(options) {
      calls.available.push(options);
      return availability.length > 1 ? availability.shift() : availability[0];
    }
    static async install(options) {
      calls.installs += 1;
      calls.installOptions = options;
      return true;
    }
    constructor() {
      calls.instances.push(this);
    }
    start() { this.started = true; }
    stop() { this.stopped = true; }
    abort() { this.aborted = true; }
  }
  return { SpeechRecognition: FakeRecognition, calls };
}

test("requires strict on-device SpeechRecognition support", async () => {
  const recognizer = createLocalWakeWordRecognizer({ windowImpl: {} });
  assert.equal(recognizer.supported, false);
  await assert.rejects(recognizer.start(), /tidak didukung/);
});

test("refuses unavailable local id-ID packs without starting recognition", async () => {
  const win = createWindow(["unavailable"]);
  const errors = [];
  const states = [];
  const recognizer = createLocalWakeWordRecognizer({
    windowImpl: win,
    onError: (error) => errors.push(error.message),
    onStateChange: (state) => states.push(state.state),
  });
  assert.equal(await recognizer.start(), false);
  assert.equal(win.calls.instances.length, 0);
  assert.equal(errors.length, 1);
  assert.ok(states.includes("limited"));
  assert.equal(win.calls.available[0].processLocally, true);
});

test("installs an on-device Indonesian language pack and starts local recognition", async () => {
  const win = createWindow(["downloadable", "available"]);
  const recognizer = createLocalWakeWordRecognizer({ windowImpl: win });
  assert.equal(await recognizer.start(), true);
  assert.equal(win.calls.installs, 1);
  assert.equal(win.calls.installOptions.processLocally, true);
  assert.equal(win.calls.instances.length, 1);
  const instance = win.calls.instances[0];
  assert.equal(instance.lang, "id-ID");
  assert.equal(instance.processLocally, true);
  assert.equal(instance.continuous, true);
  recognizer.dispose();
});

test("fires only for exact SEPHIA phrase with high confidence and final result", async () => {
  const win = createWindow();
  const wakes = [];
  const recognizer = createLocalWakeWordRecognizer({
    windowImpl: win,
    confidenceThreshold: 0.88,
    onWakeWord: () => wakes.push("wake"),
  });
  await recognizer.start();
  const instance = win.calls.instances[0];
  const emit = (transcript, confidence, isFinal = true) => instance.onresult({
    resultIndex: 0,
    results: [{ isFinal, 0: { transcript, confidence } }],
  });
  emit("sephia", 0.4);
  emit("sephia", 0.99, false);
  emit("halo sephia", 0.99);
  emit("sefia", 0.99);
  assert.deepEqual(wakes, []);
  emit("SEPHIA.", 0.95);
  assert.deepEqual(wakes, ["wake"]);
  recognizer.dispose();
});

test("pause, resume, and stop release recognizer instances", async () => {
  const win = createWindow();
  const recognizer = createLocalWakeWordRecognizer({ windowImpl: win });
  await recognizer.start();
  const first = win.calls.instances[0];
  recognizer.pause();
  assert.equal(first.aborted, true);
  assert.equal(await recognizer.resume(), true);
  assert.equal(win.calls.instances.length, 2);
  recognizer.stop();
  assert.equal(win.calls.instances[1].aborted, true);
  assert.equal(recognizer.isActive, false);
  recognizer.dispose();
});
