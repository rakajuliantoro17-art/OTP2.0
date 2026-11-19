import test from "node:test";
import assert from "node:assert/strict";
import {
  createChromeNativeMessagingTtsAdapter,
  NATIVE_TTS_REQUEST_EVENT,
  NATIVE_TTS_CANCEL_EVENT,
  NATIVE_TTS_STATE_EVENT,
  NATIVE_TTS_RESULT_EVENT,
  NATIVE_TTS_UNLOCK_EVENT,
  NATIVE_TTS_UNLOCK_RESULT_EVENT,
} from "../src/audio/chrome-native-messaging-tts.js";
import { APPROVED_NEURAL_TTS_TEXT } from "../src/audio/local-neural-tts.js";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage 29 selects Native Messaging and rejects local HTTP inference services", async () => {
  const report = await read("docs/STAGE-29-LOCAL-CHROME-BRIDGE-SECURITY.md");
  assert.match(report, /Chrome extension plus a Chrome Native Messaging host/);
  assert.match(report, /Do not connect.*localhost or school-LAN HTTP/i);
  assert.match(report, /allowed_origins/);
  assert.match(report, /1 MiB/);
  assert.match(report, /Native Messaging is not itself a security boundary/i);
});

test("Native host contract accepts only a fixed generic announcement action", async () => {
  const report = await read("docs/STAGE-29-LOCAL-CHROME-BRIDGE-SECURITY.md");
  assert.match(report, /synthesize-approved-announcement/);
  assert.match(report, /does not accept caller-supplied speech text/i);
  assert.match(report, /no file, shell, network, OTP, or dashboard-control commands/i);
  assert.match(report, /no filesystem audio output, no cache, no model download/i);
});

test.skip("[tahap D] production Panitia host is neural-only and remains fail-closed", async () => {
  const bridge = await read("src/host/mount-panitia-sephia.js");
  assert.match(bridge, /createUnavailableLocalNeuralTtsAdapter/);
  assert.doesNotMatch(bridge, /createLocalAudioAnnouncementAdapter|announcementAssetUrl/);
  assert.doesNotMatch(bridge, /createBrowserLocalIndonesianTts/);
  assert.match(bridge, /createChromeNativeMessagingTtsAdapter/);
});

test("Stage 29 explicitly blocks production until in-memory inference and workstation acceptance", async () => {
  const report = await read("docs/STAGE-29-LOCAL-CHROME-BRIDGE-SECURITY.md");
  assert.match(report, /in-memory Laras API/);
  assert.match(report, /Windows packaging is reproducible/);
  assert.match(report, /actual Panitia PC/);
});

test("Native Messaging protocol schema is strict and has no arbitrary text or identity fields", async () => {
  const schema = JSON.parse(await read("native-messaging/protocol.schema.json"));
  const request = schema.oneOf.find((entry) => entry.properties?.action);
  const response = schema.oneOf.find((entry) => entry.properties?.audioBase64);
  const ready = schema.oneOf.find((entry) => entry.properties?.status);
  assert.equal(request.additionalProperties, false);
  assert.deepEqual(request.required, ["version", "action"]);
  assert.equal(request.properties.action.const, "synthesize-approved-announcement");
  assert.equal(response.additionalProperties, false);
  assert.equal(response.properties.sampleRate.const, 24000);
  assert.equal(response.properties.channels.const, 1);
  assert.equal(response.properties.audioBase64.maxLength, 955736);
  assert.equal(ready.additionalProperties, false);
  assert.equal(ready.properties.status.const, "ready");
  assert.equal("text" in request.properties, false);
  assert.equal("studentName" in request.properties, false);
  assert.equal("className" in request.properties, false);
  assert.equal("eventId" in request.properties, false);
});

class FakeCustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}
class FakeWindowEvents {
  listeners = new Map();
  dispatched = [];
  addEventListener(type, fn) {
    const list = this.listeners.get(type) || [];
    list.push(fn);
    this.listeners.set(type, list);
  }
  removeEventListener(type, fn) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((item) => item !== fn));
  }
  dispatchEvent(event) {
    this.dispatched.push(event);
    for (const listener of this.listeners.get(event.type) || []) listener(event);
    return true;
  }
}


test("page adapter sends only fixed action and receives completion without audio bytes", async () => {
  const windowImpl = new FakeWindowEvents();
  const adapter = createChromeNativeMessagingTtsAdapter({ windowImpl, CustomEventImpl: FakeCustomEvent });
  assert.equal(adapter.available, false);
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_STATE_EVENT, { detail: { state: "connected" } }));
  assert.equal(adapter.available, false);
  const unlock = adapter.prepare();
  const unlockRequest = windowImpl.dispatched?.find((event) => event.type === NATIVE_TTS_UNLOCK_EVENT);
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_UNLOCK_RESULT_EVENT, {
    detail: { requestId: unlockRequest.detail.requestId, ok: true },
  }));
  assert.equal(await unlock, true);
  assert.equal(adapter.available, true);
  windowImpl.addEventListener(NATIVE_TTS_REQUEST_EVENT, (event) => {
    assert.equal(event.detail.action, "synthesize-approved-announcement");
    assert.equal("text" in event.detail, false);
    assert.equal("eventId" in event.detail, false);
    assert.equal("studentName" in event.detail, false);
    windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_RESULT_EVENT, {
      detail: { requestId: event.detail.requestId, ok: true },
    }));
  });
  assert.equal(await adapter.speak(APPROVED_NEURAL_TTS_TEXT), true);
  assert.equal(adapter.isSpeaking, false);
  adapter.dispose();
  assert.equal(adapter.available, false);
});

test("page adapter rejects arbitrary speech and cancels on bridge disconnect", async () => {
  const windowImpl = new FakeWindowEvents();
  const adapter = createChromeNativeMessagingTtsAdapter({ windowImpl, CustomEventImpl: FakeCustomEvent });
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_STATE_EVENT, { detail: { state: "connected" } }));
  const unlock = adapter.prepare();
  const unlockRequest = windowImpl.dispatched?.find((event) => event.type === NATIVE_TTS_UNLOCK_EVENT);
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_UNLOCK_RESULT_EVENT, {
    detail: { requestId: unlockRequest.detail.requestId, ok: true },
  }));
  await unlock;
  await assert.rejects(adapter.speak("nama siswa"), /fixed generic/);
  const request = adapter.speak(APPROVED_NEURAL_TTS_TEXT);
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_STATE_EVENT, { detail: { state: "disconnected" } }));
  await assert.rejects(request, /disconnected/);
  assert.equal(adapter.available, false);
  adapter.dispose();
});

test("page adapter emits cancellation without sending text or event identity", async () => {
  const windowImpl = new FakeWindowEvents();
  const adapter = createChromeNativeMessagingTtsAdapter({ windowImpl, CustomEventImpl: FakeCustomEvent });
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_STATE_EVENT, { detail: { state: "connected" } }));
  const unlock = adapter.prepare();
  const unlockRequest = windowImpl.dispatched?.find((event) => event.type === NATIVE_TTS_UNLOCK_EVENT);
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_UNLOCK_RESULT_EVENT, {
    detail: { requestId: unlockRequest.detail.requestId, ok: true },
  }));
  await unlock;
  let cancelDetail;
  windowImpl.addEventListener(NATIVE_TTS_CANCEL_EVENT, (event) => { cancelDetail = event.detail; });
  const request = adapter.speak(APPROVED_NEURAL_TTS_TEXT);
  adapter.cancel();
  await assert.rejects(request, /cancelled/);
  assert.equal(cancelDetail.version, 1);
  assert.equal("text" in cancelDetail, false);
  assert.equal("eventId" in cancelDetail, false);
  adapter.dispose();
});
