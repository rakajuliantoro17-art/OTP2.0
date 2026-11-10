import test from "node:test";
import assert from "node:assert/strict";
import { mountPanitiaSephia } from "../src/host/mount-panitia-sephia.js";

class FakeWindow {
  listeners = new Map();
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type, fn) { if (this.listeners.get(type) === fn) this.listeners.delete(type); }
}

test("manual Panitia activation arms wake word; deactivation stops it", async () => {
  const windowImpl = new FakeWindow();
  const calls = [];
  let controlOptions;
  const wake = {
    start: async () => { calls.push("start"); return true; },
    stop: () => calls.push("stop"),
    pause: () => calls.push("pause"),
    resume: async () => { calls.push("resume"); return true; },
    dispose: () => calls.push("dispose"),
  };
  const bridge = mountPanitiaSephia({
    documentImpl: { getElementById: (id) => ({ id }) },
    windowImpl,
    createWakeWordRecognizer: (_win, callbacks) => {
      calls.push("wake:create");
      return wake;
    },
    createSpeechAdapter: () => ({ speak: async () => {}, cancel() {}, dispose() {} }),
    createRuntime: () => ({
      isActive: false,
      activate() { this.isActive = true; },
      deactivate() { this.isActive = false; },
      dispose() {},
    }),
    mountControls: (options) => {
      controlOptions = options;
      return { dispose() {} };
    },
    bindLifecycle: () => ({ dispose() {} }),
  });

  bridge.visualState.activate();
  await controlOptions.onActivated();
  assert.ok(calls.includes("start"));
  controlOptions.onDeactivated();
  assert.ok(calls.includes("stop"));
  bridge.dispose();
});

test("wake-word callback changes only the SEPHIA visual state", () => {
  const windowImpl = new FakeWindow();
  let wakeCallbacks;
  const bridge = mountPanitiaSephia({
    documentImpl: { getElementById: (id) => ({ id }) },
    windowImpl,
    createWakeWordRecognizer: (_win, callbacks) => {
      wakeCallbacks = callbacks;
      return { start: async () => true, stop() {}, pause() {}, resume: async () => true, dispose() {} };
    },
    createSpeechAdapter: () => ({ speak: async () => {}, cancel() {}, dispose() {} }),
    createRuntime: () => ({ isActive: false, activate() { this.isActive = true; }, deactivate() {}, dispose() {} }),
    mountControls: () => ({ dispose() {} }),
    bindLifecycle: () => ({ dispose() {} }),
  });
  bridge.visualState.activate();
  wakeCallbacks.onWakeWord();
  assert.equal(bridge.visualState.snapshot.state, "listening");
  bridge.dispose();
});
