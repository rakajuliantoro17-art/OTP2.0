import test from "node:test";
import assert from "node:assert/strict";
import { mountPanitiaSephia } from "../src/host/mount-panitia-sephia.js";

class FakeWindow {
  listeners = new Map();
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type, fn) { if (this.listeners.get(type) === fn) this.listeners.delete(type); }
}

test("Panitia bridge injects a local Indonesian speech adapter into the runtime", async () => {
  const documentImpl = {
    getElementById(id) {
      return id === "alertList" ? { id } : { id };
    },
  };
  const windowImpl = new FakeWindow();
  const spoken = [];
  const adapter = {
    available: true,
    speak: async (text) => { spoken.push(text); },
    cancel() {},
    dispose() {},
  };
  let runtimeOptions;
  const bridge = mountPanitiaSephia({
    documentImpl,
    windowImpl,
    createSpeechAdapter: () => adapter,
    createRuntime: (options) => {
      runtimeOptions = options;
      return {
        isActive: false,
        activate() { this.isActive = true; },
        deactivate() { this.isActive = false; },
        dispose() { this.isActive = false; },
      };
    },
    mountControls: () => ({ dispose() {} }),
    bindLifecycle: () => ({ dispose() {} }),
  });

  assert.equal(runtimeOptions.speechController, bridge.speechController);
  bridge.visualState.activate();
  assert.equal(await runtimeOptions.speechController.announce({
    eventId: "test-27",
    eventType: "violation",
    violationCount: 27,
  }), true);
  assert.match(spoken[0], /Perhatian, Panitia/);
  assert.equal(bridge.visualState.snapshot.state, "standby");
  bridge.dispose();
});

test("TTS failure degrades only the SEPHIA visual state to limited mode", async () => {
  const documentImpl = {
    getElementById(id) { return { id }; },
  };
  const windowImpl = new FakeWindow();
  const bridge = mountPanitiaSephia({
    documentImpl,
    windowImpl,
    createSpeechAdapter: () => ({
      speak: async () => { throw new Error("local Indonesian voice unavailable"); },
      cancel() {},
      dispose() {},
    }),
    createRuntime: () => ({
      isActive: false,
      activate() { this.isActive = true; },
      deactivate() { this.isActive = false; },
      dispose() {},
    }),
    mountControls: () => ({ dispose() {} }),
    bindLifecycle: () => ({ dispose() {} }),
  });
  bridge.visualState.activate();
  assert.equal(await bridge.speechController.announce({
    eventId: "test-28",
    eventType: "violation",
    violationCount: 28,
  }), false);
  assert.equal(bridge.visualState.snapshot.state, "limited");
  bridge.dispose();
});
