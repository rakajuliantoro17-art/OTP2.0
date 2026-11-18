import test from "node:test";
import assert from "node:assert/strict";
import { mountPanitiaSephia } from "../src/host/mount-panitia-sephia.js";

class FakeAudio {
  static constructed = 0;
  constructor() { FakeAudio.constructed += 1; }
}
class FakeWindow {
  Audio = FakeAudio;
  listeners = new Map();
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type, fn) { this.listeners.delete(type); }
}

function makeBridge(options = {}) {
  const documentImpl = { getElementById: (id) => ({ id }) };
  const windowImpl = new FakeWindow();
  const bridge = mountPanitiaSephia({
    documentImpl,
    windowImpl,
    mountAvatar: null,
    createWakeWordRecognizer: () => ({ isActive: false, start: async () => false, stop() {}, dispose() {} }),
    createRuntime: () => ({ isActive: false, activate() {}, deactivate() {}, dispose() {} }),
    mountControls: () => ({ dispose() {} }),
    bindLifecycle: () => ({ dispose() {} }),
    ...options,
  });
  return { bridge, windowImpl };
}

test("Panitia host never selects legacy WAV even when an old asset option is supplied", async () => {
  const { bridge, windowImpl } = makeBridge({
    announcementAssetUrl: "/sephia/assets/sephia-announcement.wav",
  });
  assert.equal(bridge.speechAdapter.available, false);
  assert.equal(await bridge.speechController.announce({
    eventId: "stage19-legacy-27",
    eventType: "violation",
    violationCount: 27,
  }), false);
  assert.equal(FakeAudio.constructed, 0);
  bridge.dispose();
});

test("Panitia default remains visual-only until a verified neural engine is injected", async () => {
  const { bridge } = makeBridge();
  assert.equal(bridge.speechAdapter.available, false);
  assert.equal(await bridge.speechController.announce({
    eventId: "stage19-visual-28",
    eventType: "violation",
    violationCount: 28,
  }), false);
  bridge.dispose();
});

test("legacy WAV adapter is not imported by the production Panitia host", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const source = await readFile(fileURLToPath(new URL("../src/host/mount-panitia-sephia.js", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /createLocalAudioAnnouncementAdapter|announcementAssetUrl/);
});
