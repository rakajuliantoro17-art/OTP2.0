import { APPROVED_NEURAL_TTS_TEXT, APPROVED_WAKE_ACK_TEXT } from "./local-neural-tts.js";

export const NATIVE_TTS_REQUEST_EVENT = "sephia:native-tts-request";
export const NATIVE_TTS_CANCEL_EVENT = "sephia:native-tts-cancel";
export const NATIVE_TTS_STATE_EVENT = "sephia:native-tts-state";
export const NATIVE_TTS_RESULT_EVENT = "sephia:native-tts-result";
export const NATIVE_TTS_UNLOCK_EVENT = "sephia:native-tts-unlock";
export const NATIVE_TTS_UNLOCK_RESULT_EVENT = "sephia:native-tts-unlock-result";
export const DEFAULT_NATIVE_TTS_TIMEOUT_MS = 18000;
export const DEFAULT_AUDIO_UNLOCK_TIMEOUT_MS = 3000;

/**
 * Page-side adapter for the separately installed SEPHIA Chrome extension.
 * Audio stays inside the extension content script; the page receives only a
 * completion/error signal. AudioContext is explicitly unlocked synchronously
 * from the Panitia manual-activation click, before any asynchronous work.
 */
export function createChromeNativeMessagingTtsAdapter({
  windowImpl = globalThis.window,
  CustomEventImpl = globalThis.CustomEvent,
  timeoutMs = DEFAULT_NATIVE_TTS_TIMEOUT_MS,
  unlockTimeoutMs = DEFAULT_AUDIO_UNLOCK_TIMEOUT_MS,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
  onStatusChange = () => {},
} = {}) {
  if (!windowImpl?.addEventListener || typeof windowImpl.dispatchEvent !== "function") {
    throw new TypeError("A browser window event target is required.");
  }
  if (typeof CustomEventImpl !== "function") throw new TypeError("CustomEvent is required.");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
    throw new RangeError("Native TTS timeout must be between 1 and 30 seconds.");
  }
  if (!Number.isSafeInteger(unlockTimeoutMs) || unlockTimeoutMs < 500 || unlockTimeoutMs > 10000) {
    throw new RangeError("Audio unlock timeout must be between 0.5 and 10 seconds.");
  }

  let connected = false;
  let audioUnlocked = false;
  let disposed = false;
  let sequence = 0;
  let unlockSequence = 0;
  let active = null;
  let pendingUnlock = null;

  const publishStatus = (reason) => {
    try {
      onStatusChange(Object.freeze({
        reason,
        connected,
        audioUnlocked,
        available: !disposed && connected && audioUnlocked,
      }));
    } catch {}
  };
  const emit = (name, detail) => {
    try { windowImpl.dispatchEvent(new CustomEventImpl(name, { detail })); } catch {}
  };
  const onState = (event) => {
    const state = event?.detail?.state;
    if (state === "connected") {
      connected = true;
      publishStatus("connected");
      return;
    }
    if (state === "disconnected") {
      connected = false;
      audioUnlocked = false;
      if (active) active.reject(new Error("SEPHIA local speech bridge disconnected."));
      if (pendingUnlock) {
        clearTimeoutImpl(pendingUnlock.timeoutId);
        pendingUnlock.resolve(false);
        pendingUnlock = null;
      }
      publishStatus("disconnected");
    }
  };
  const onResult = (event) => {
    const detail = event?.detail;
    if (!active || detail?.requestId !== active.requestId) return;
    if (detail.ok === true) active.resolve(true);
    else active.reject(new Error("SEPHIA local speech failed: " + String(detail.code || "UNKNOWN")));
  };
  const onUnlockResult = (event) => {
    const detail = event?.detail;
    if (!pendingUnlock || detail?.requestId !== pendingUnlock.requestId) return;
    const operation = pendingUnlock;
    pendingUnlock = null;
    clearTimeoutImpl(operation.timeoutId);
    audioUnlocked = detail.ok === true;
    publishStatus(audioUnlocked ? "audio-unlocked" : "audio-unlock-failed");
    operation.resolve(audioUnlocked);
  };

  publishStatus("bridge-waiting");
  windowImpl.addEventListener(NATIVE_TTS_STATE_EVENT, onState);
  windowImpl.addEventListener(NATIVE_TTS_RESULT_EVENT, onResult);
  windowImpl.addEventListener(NATIVE_TTS_UNLOCK_RESULT_EVENT, onUnlockResult);

  const prepare = () => {
    if (disposed) return Promise.resolve(false);
    if (audioUnlocked) return Promise.resolve(true);
    if (pendingUnlock) return pendingUnlock.promise;

    const requestId = "sephia-unlock-" + (++unlockSequence);
    let resolveOperation;
    const promise = new Promise((resolve) => { resolveOperation = resolve; });
    const timeoutId = setTimeoutImpl(() => {
      if (pendingUnlock?.requestId !== requestId) return;
      pendingUnlock = null;
      publishStatus("audio-unlock-timeout");
      resolveOperation(false);
    }, unlockTimeoutMs);
    pendingUnlock = {
      requestId,
      promise,
      timeoutId,
      resolve: resolveOperation,
    };

    // This dispatch is synchronous. The content script creates/resumes its
    // AudioContext while the Panitia activation click still carries user gesture.
    publishStatus("audio-unlock-pending");
    emit(NATIVE_TTS_UNLOCK_EVENT, { version: 1, requestId });
    return promise;
  };

  const cancel = () => {
    const operation = active;
    if (!operation) return;
    emit(NATIVE_TTS_CANCEL_EVENT, { version: 1, requestId: operation.requestId });
    operation.reject(new Error("SEPHIA local speech cancelled."));
  };

  const speak = async (text) => {
    if (disposed) throw new Error("Native TTS adapter has been disposed.");
    if (!connected || !audioUnlocked) {
      throw new Error("SEPHIA local audio bridge is not connected or unlocked.");
    }
    const action = text === APPROVED_NEURAL_TTS_TEXT
      ? "synthesize-approved-announcement"
      : text === APPROVED_WAKE_ACK_TEXT
        ? "synthesize-approved-wake-acknowledgement"
        : null;
    if (!action) {
      throw new Error("Only fixed generic SEPHIA phrases may be spoken.");
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
      publishStatus("synthesizing");
      emit(NATIVE_TTS_REQUEST_EVENT, {
        version: 1,
        action,
        requestId,
      });
      return await result;
    } finally {
      clearTimeoutImpl(timeoutId);
      if (active === operation) active = null;
      publishStatus("ready");
    }
  };

  return Object.freeze({
    prepare,
    speak,
    cancel,
    get available() { return !disposed && connected && audioUnlocked; },
    get isSpeaking() { return active !== null; },
    get isAudioUnlocked() { return !disposed && audioUnlocked; },
    dispose() {
      if (disposed) return;
      cancel();
      if (pendingUnlock) {
        clearTimeoutImpl(pendingUnlock.timeoutId);
        pendingUnlock.resolve(false);
        pendingUnlock = null;
      }
      disposed = true;
      connected = false;
      audioUnlocked = false;
      publishStatus("disposed");
      windowImpl.removeEventListener(NATIVE_TTS_STATE_EVENT, onState);
      windowImpl.removeEventListener(NATIVE_TTS_RESULT_EVENT, onResult);
      windowImpl.removeEventListener(NATIVE_TTS_UNLOCK_RESULT_EVENT, onUnlockResult);
    },
  });
}
