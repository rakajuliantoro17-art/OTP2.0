import test from "node:test";
import assert from "node:assert/strict";
import {
  APPROVED_SEPHIA_ANNOUNCEMENT,
  createLocalAudioAnnouncementAdapter,
} from "../src/audio/local-audio-announcement.js";

class FakeAudio {
  constructor() {
    this.listeners = new Map();
    this.paused = true;
    this.currentTime = 0;
    this.playCount = 0;
  }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type, fn) { if (this.listeners.get(type) === fn) this.listeners.delete(type); }
  play() { this.paused = false; this.playCount += 1; return Promise.resolve(); }
  pause() { this.paused = true; }
  finish() { this.listeners.get("ended")?.(); }
  fail() { this.listeners.get("error")?.(); }
  removeAttribute() {}
  load() {}
}

test("local audio accepts only the fixed approved announcement", async () => {
  const adapter = createLocalAudioAnnouncementAdapter({ AudioImpl: FakeAudio });
  await assert.rejects(adapter.speak("Nama siswa dan jumlah pelanggaran"), /tidak diizinkan/);
  assert.equal(adapter.available, true);
  adapter.dispose();
});

test("local audio uses a same-origin asset and resolves on ended", async () => {
  const statuses = [];
  let instance;
  class CaptureAudio extends FakeAudio {
    constructor() { super(); instance = this; }
  }
  const adapter = createLocalAudioAnnouncementAdapter({
    AudioImpl: CaptureAudio,
    assetUrl: "/sephia/assets/sephia-announcement.wav",
    onStatus: (status) => statuses.push(status.status),
  });
  const result = adapter.speak(APPROVED_SEPHIA_ANNOUNCEMENT);
  assert.equal(instance.src, "/sephia/assets/sephia-announcement.wav");
  assert.equal(instance.playCount, 1);
  instance.finish();
  assert.equal(await result, true);
  assert.deepEqual(statuses, ["speaking", "ready"]);
  adapter.dispose();
});

test("cancel stops playback and settles the pending operation", async () => {
  let instance;
  class CaptureAudio extends FakeAudio {
    constructor() { super(); instance = this; }
  }
  const adapter = createLocalAudioAnnouncementAdapter({ AudioImpl: CaptureAudio });
  const pending = adapter.speak(APPROVED_SEPHIA_ANNOUNCEMENT);
  adapter.cancel();
  assert.equal(await pending, false);
  assert.equal(instance.paused, true);
  assert.equal(instance.currentTime, 0);
  adapter.dispose();
});

test("playback errors and autoplay rejection are surfaced to the controller", async () => {
  class ErrorAudio extends FakeAudio {
    play() { this.paused = false; return Promise.reject(new Error("autoplay blocked")); }
  }
  const adapter = createLocalAudioAnnouncementAdapter({ AudioImpl: ErrorAudio });
  await assert.rejects(adapter.speak(APPROVED_SEPHIA_ANNOUNCEMENT), /autoplay blocked/);
  adapter.dispose();
});

test("remote and protocol-relative audio assets are rejected", () => {
  assert.throws(() => createLocalAudioAnnouncementAdapter({
    AudioImpl: FakeAudio,
    assetUrl: "https://example.com/voice.wav",
  }), /same-origin/);
  assert.throws(() => createLocalAudioAnnouncementAdapter({
    AudioImpl: FakeAudio,
    assetUrl: "//example.com/voice.wav",
  }), /same-origin/);
});
