import test from "node:test";
import assert from "node:assert/strict";
import { mountPanitiaSephia } from "../src/host/mount-panitia-sephia.js";
import { APPROVED_SEPHIA_ANNOUNCEMENT } from "../src/audio/local-audio-announcement.js";

class FakeAudio {
  static last = null;
  constructor() {
    this.listeners = new Map();
    this.paused = true;
    this.currentTime = 0;
    FakeAudio.last = this;
  }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type, fn) { if (this.listeners.get(type) === fn) this.listeners.delete(type); }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  finish() { this.listeners.get("ended")?.(); }
  removeAttribute() {}
  load() {}
}

class FakeWindow {
  Audio = FakeAudio;
  listeners = new Map();
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type, fn) { this.listeners.delete(type); }
}

test("Panitia host selects bundled local audio only when an explicit asset is configured", async () => {
  const documentImpl = { getElementById: (id) => ({ id }) };
  const windowImpl = new FakeWindow();
  const bridge = mountPanitiaSephia({
    documentImpl,
    windowImpl,
    announcementAssetUrl: "/sephia/assets/sephia-announcement.wav",
    mountAvatar: null,
    createWakeWordRecognizer: () => ({
      isActive: false,
      start: async () => false,
      stop() {},
      dispose() {},
    }),
    createRuntime: () => ({
      isActive: false,
      activate() { this.isActive = true; },
      deactivate() { this.isActive = false; },
      dispose() { this.isActive = false; },
    }),
    mountControls: () => ({ dispose() {} }),
    bindLifecycle: () => ({ dispose() {} }),
  });

  assert.equal(bridge.speechAdapter.available, true);
  const announcement = bridge.speechController.announce({
    eventId: "stage19-audio-27",
    eventType: "violation",
    violationCount: 27,
  });
  assert.equal(FakeAudio.last.src, "/sephia/assets/sephia-announcement.wav");
  assert.equal(FakeAudio.last.paused, false);
  FakeAudio.last.finish();
  assert.equal(await announcement, true);
  assert.equal(APPROVED_SEPHIA_ANNOUNCEMENT.includes("Perhatian, Panitia"), true);
  bridge.dispose();
  assert.equal(FakeAudio.last.paused, true);
});

test("Panitia host rejects a configured audio path that escapes the bundled asset directory", () => {
  assert.throws(() => mountPanitiaSephia({
    documentImpl: { getElementById: (id) => ({ id }) },
    windowImpl: new FakeWindow(),
    announcementAssetUrl: "/sephia/assets/../../outside.wav",
    mountAvatar: null,
    createRuntime: () => ({ activate() {}, deactivate() {}, dispose() {}, isActive: false }),
    mountControls: () => ({ dispose() {} }),
    bindLifecycle: () => ({ dispose() {} }),
  }), /bundled same-origin WAV asset path/);
});
