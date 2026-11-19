import test from "node:test";
import assert from "node:assert/strict";
import {
  createChromeNativeMessagingTtsAdapter,
  NATIVE_TTS_STATE_EVENT,
  NATIVE_TTS_UNLOCK_EVENT,
  NATIVE_TTS_UNLOCK_RESULT_EVENT,
  NATIVE_TTS_REQUEST_EVENT,
  NATIVE_TTS_RESULT_EVENT,
} from "../src/audio/chrome-native-messaging-tts.js";
import { APPROVED_NEURAL_TTS_TEXT, APPROVED_WAKE_ACK_TEXT } from "../src/audio/local-neural-tts.js";

class FakeCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}
class FakeWindow {
  listeners = new Map();
  dispatched = [];
  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((entry) => entry !== listener));
  }
  dispatchEvent(event) {
    this.dispatched.push(event);
    for (const listener of this.listeners.get(event.type) || []) listener(event);
    return true;
  }
}

function createAdapter() {
  const windowImpl = new FakeWindow();
  let timerId = 0;
  const adapter = createChromeNativeMessagingTtsAdapter({
    windowImpl,
    CustomEventImpl: FakeCustomEvent,
    setTimeoutImpl: () => ++timerId,
    clearTimeoutImpl: () => {},
  });
  return { adapter, windowImpl };
}

test("prepare dispatches the unlock event synchronously and gates availability", async () => {
  const { adapter, windowImpl } = createAdapter();
  assert.equal(adapter.available, false);
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_STATE_EVENT, { detail: { state: "connected" } }));
  assert.equal(adapter.available, false);

  const unlock = adapter.prepare();
  const request = windowImpl.dispatched.find((event) => event.type === NATIVE_TTS_UNLOCK_EVENT);
  assert.ok(request, "unlock event must be dispatched synchronously by prepare()");
  assert.equal(adapter.available, false);
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_UNLOCK_RESULT_EVENT, {
    detail: { requestId: request.detail.requestId, ok: true },
  }));
  assert.equal(await unlock, true);
  assert.equal(adapter.available, true);
  adapter.dispose();
});

test("only the approved phrase can be sent after audio unlock", async () => {
  const { adapter, windowImpl } = createAdapter();
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_STATE_EVENT, { detail: { state: "connected" } }));
  const unlock = adapter.prepare();
  const unlockEvent = windowImpl.dispatched.find((event) => event.type === NATIVE_TTS_UNLOCK_EVENT);
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_UNLOCK_RESULT_EVENT, {
    detail: { requestId: unlockEvent.detail.requestId, ok: true },
  }));
  assert.equal(await unlock, true);

  await assert.rejects(adapter.speak("Nama siswa"), /fixed generic/);
  const speaking = adapter.speak(APPROVED_NEURAL_TTS_TEXT);
  const request = windowImpl.dispatched.find((event) => event.type === NATIVE_TTS_REQUEST_EVENT);
  assert.equal(request.detail.action, "synthesize-approved-announcement");
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_RESULT_EVENT, {
    detail: { requestId: request.detail.requestId, ok: true },
  }));
  assert.equal(await speaking, true);
  adapter.dispose();
});

test("disconnect removes audio readiness and rejects any pending speech", async () => {
  const { adapter, windowImpl } = createAdapter();
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_STATE_EVENT, { detail: { state: "connected" } }));
  const unlock = adapter.prepare();
  const unlockEvent = windowImpl.dispatched.find((event) => event.type === NATIVE_TTS_UNLOCK_EVENT);
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_UNLOCK_RESULT_EVENT, {
    detail: { requestId: unlockEvent.detail.requestId, ok: true },
  }));
  await unlock;

  const speaking = adapter.speak(APPROVED_NEURAL_TTS_TEXT);
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_STATE_EVENT, { detail: { state: "disconnected" } }));
  await assert.rejects(speaking, /disconnected/);
  assert.equal(adapter.available, false);
  adapter.dispose();
});

test("adapter publishes bridge and audio readiness transitions", async () => {
  const windowImpl = new FakeWindow();
  const statuses = [];
  const adapter = createChromeNativeMessagingTtsAdapter({
    windowImpl,
    CustomEventImpl: FakeCustomEvent,
    setTimeoutImpl: (() => { let id = 0; return () => ++id; })(),
    clearTimeoutImpl: () => {},
    onStatusChange: (status) => statuses.push(status),
  });
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_STATE_EVENT, { detail: { state: "connected" } }));
  const unlock = adapter.prepare();
  const request = windowImpl.dispatched.find((event) => event.type === NATIVE_TTS_UNLOCK_EVENT);
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_UNLOCK_RESULT_EVENT, {
    detail: { requestId: request.detail.requestId, ok: true },
  }));
  await unlock;
  assert.ok(statuses.some((status) => status.reason === "bridge-waiting"));
  assert.ok(statuses.some((status) => status.reason === "connected" && status.connected));
  assert.ok(statuses.some((status) => status.reason === "audio-unlocked" && status.available));
  adapter.dispose();
});

test("wake acknowledgement is mapped to its own fixed native action", async () => {
  const { adapter, windowImpl } = createAdapter();
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_STATE_EVENT, { detail: { state: "connected" } }));
  const unlock = adapter.prepare();
  const unlockEvent = windowImpl.dispatched.find((event) => event.type === NATIVE_TTS_UNLOCK_EVENT);
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_UNLOCK_RESULT_EVENT, {
    detail: { requestId: unlockEvent.detail.requestId, ok: true },
  }));
  assert.equal(await unlock, true);

  const speaking = adapter.speak(APPROVED_WAKE_ACK_TEXT);
  const request = windowImpl.dispatched.find((event) => event.type === NATIVE_TTS_REQUEST_EVENT);
  assert.equal(request.detail.action, "synthesize-approved-wake-acknowledgement");
  windowImpl.dispatchEvent(new FakeCustomEvent(NATIVE_TTS_RESULT_EVENT, {
    detail: { requestId: request.detail.requestId, ok: true },
  }));
  assert.equal(await speaking, true);
  adapter.dispose();
});
