import { APPROVED_NEURAL_TTS_TEXT } from "./local-neural-tts.js";

export const NATIVE_TTS_REQUEST_EVENT = "sephia:native-tts-request";
export const NATIVE_TTS_CANCEL_EVENT = "sephia:native-tts-cancel";
export const NATIVE_TTS_STATE_EVENT = "sephia:native-tts-state";
export const NATIVE_TTS_RESULT_EVENT = "sephia:native-tts-result";
export const DEFAULT_NATIVE_TTS_TIMEOUT_MS = 18000;

/**
 * Page-side adapter for the separately installed SEPHIA Chrome extension.
 * Audio stays inside the extension content script; the page receives only a
 * completion/error signal. The extension strips requestId before Native
 * Messaging, so no notification identity crosses the native-host boundary.
 */
export function createChromeNativeMessagingTtsAdapter({
  windowImpl = globalThis.window,
  CustomEventImpl = globalThis.CustomEvent,
  timeoutMs = DEFAULT_NATIVE_TTS_TIMEOUT_MS,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
} = {}) {
  if (!windowImpl?.addEventListener || typeof windowImpl.dispatchEvent !== "function") {
    throw new TypeError("A browser window event target is required.");
  }
  if (typeof CustomEventImpl !== "function") throw new TypeError("CustomEvent is required.");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
    throw new RangeError("Native TTS timeout must be between 1 and 30 seconds.");
  }

  let connected = false;
  let disposed = false;
  let sequence = 0;
  let active = null;

  const emit = (name, detail) => {
    try { windowImpl.dispatchEvent(new CustomEventImpl(name, { detail })); } catch {}
  };
  const onState = (event) => {
    const state = event?.detail?.state;
    if (state === "connected") {
      connected = true;
      return;
    }
    if (state === "disconnected") {
      connected = false;
      if (active) active.reject(new Error("SEPHIA local speech bridge disconnected."));
    }
  };
  const onResult = (event) => {
    const detail = event?.detail;
    if (!active || detail?.requestId !== active.requestId) return;
    if (detail.ok === true) active.resolve(true);
    else active.reject(new Error("SEPHIA local speech failed: " + String(detail.code || "UNKNOWN")));
  };

  windowImpl.addEventListener(NATIVE_TTS_STATE_EVENT, onState);
  windowImpl.addEventListener(NATIVE_TTS_RESULT_EVENT, onResult);

  const cancel = () => {
    const operation = active;
    if (!operation) return;
    emit(NATIVE_TTS_CANCEL_EVENT, { version: 1, requestId: operation.requestId });
    operation.reject(new Error("SEPHIA local speech cancelled."));
  };

  const speak = async (text) => {
    if (disposed) throw new Error("Native TTS adapter has been disposed.");
    if (!connected) throw new Error("SEPHIA Chrome native bridge is not connected.");
    if (text !== APPROVED_NEURAL_TTS_TEXT) {
      throw new Error("Only the fixed generic SEPHIA announcement may be spoken.");
    }
    if (active) throw new Error("SEPHIA native speech is busy.");

    const requestId = "sephia-" + (++sequence);
    let timeoutId;
    let resolveOperation;
    let rejectOperation;
    const result = new Promise((resolve, reject) => {
      resolveOperation = resolve;
      rejectOperation = reject;
    });
    const operation = {
      requestId,
      resolve: (value) => resolveOperation(value),
      reject: (error) => rejectOperation(error),
    };
    active = operation;
    timeoutId = setTimeoutImpl(() => {
      emit(NATIVE_TTS_CANCEL_EVENT, { version: 1, requestId });
      operation.reject(new Error("SEPHIA local speech timed out."));
    }, timeoutMs);

    try {
      emit(NATIVE_TTS_REQUEST_EVENT, {
        version: 1,
        action: "synthesize-approved-announcement",
        requestId,
      });
      return await result;
    } finally {
      clearTimeoutImpl(timeoutId);
      if (active === operation) active = null;
    }
  };

  return Object.freeze({
    speak,
    cancel,
    get available() { return !disposed && connected; },
    get isSpeaking() { return active !== null; },
    dispose() {
      if (disposed) return;
      cancel();
      disposed = true;
      connected = false;
      windowImpl.removeEventListener(NATIVE_TTS_STATE_EVENT, onState);
      windowImpl.removeEventListener(NATIVE_TTS_RESULT_EVENT, onResult);
    },
  });
}
