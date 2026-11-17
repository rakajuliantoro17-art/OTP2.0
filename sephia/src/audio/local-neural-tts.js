import { DEFAULT_ANNOUNCEMENT } from "./announcement.js";

export const APPROVED_NEURAL_TTS_TEXT = DEFAULT_ANNOUNCEMENT;
export const DEFAULT_NEURAL_TTS_TIMEOUT_MS = 12000;

/**
 * Adapter boundary for an explicitly provisioned on-device neural TTS engine.
 *
 * The engine and player are injected by the host. This module performs no
 * network access, model download, storage, URL creation, or browser TTS fallback.
 * Engine contract:
 *   available === true
 *   synthesize(text, { signal }) -> in-memory audio handle
 *   cancel() / dispose() optional
 * Player contract:
 *   play(audio, { signal }) -> Promise<void>
 *   cancel() and release(audio) required
 */
export function createLocalNeuralTtsAdapter({
  engine,
  player,
  timeoutMs = DEFAULT_NEURAL_TTS_TIMEOUT_MS,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
} = {}) {
  if (!engine || typeof engine.synthesize !== "function") {
    throw new TypeError("A provisioned local neural TTS engine is required.");
  }
  if (!player || typeof player.play !== "function" ||
      typeof player.cancel !== "function" || typeof player.release !== "function") {
    throw new TypeError("A local audio player with play(), cancel(), and release() is required.");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
    throw new RangeError("Neural TTS timeout must be between 1000 and 30000 ms.");
  }
  if (typeof setTimeoutImpl !== "function" || typeof clearTimeoutImpl !== "function") {
    throw new TypeError("Timer functions are required.");
  }

  let active = null;
  let disposed = false;

  const cancel = () => {
    const operation = active;
    if (!operation) return;
    operation.controller.abort();
    try { engine.cancel?.(); } catch {}
    try { player.cancel(); } catch {}
    operation.rejectCancellation(new Error("Sintesis SEPHIA dibatalkan."));
  };

  const speak = async (text) => {
    if (disposed) throw new Error("Neural TTS adapter has been disposed.");
    if (engine.available !== true) throw new Error("Local neural TTS engine is not ready.");
    if (text !== APPROVED_NEURAL_TTS_TEXT) {
      throw new Error("Teks di luar pengumuman SEPHIA yang disetujui tidak diizinkan.");
    }
    if (active) throw new Error("Local neural TTS is busy.");

    const controller = new AbortController();
    let audio = null;
    let timeoutId;
    let rejectCancellation;
    const cancellation = new Promise((_, reject) => { rejectCancellation = reject; });
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeoutImpl(() => {
        controller.abort();
        try { engine.cancel?.(); } catch {}
        try { player.cancel(); } catch {}
        reject(new Error("Local neural TTS timed out."));
      }, timeoutMs);
    });
    const operation = { controller, rejectCancellation };
    active = operation;

    try {
      const synthesis = Promise.resolve().then(() =>
        engine.synthesize(APPROVED_NEURAL_TTS_TEXT, { signal: controller.signal }));
      audio = await Promise.race([synthesis, cancellation, timeout]);
      if (controller.signal.aborted || disposed) throw new Error("Sintesis SEPHIA dibatalkan.");
      if (audio == null) throw new Error("Local neural TTS returned no audio.");
      const playback = Promise.resolve().then(() =>
        player.play(audio, { signal: controller.signal }));
      await Promise.race([playback, cancellation, timeout]);
      if (controller.signal.aborted || disposed) throw new Error("Pemutaran SEPHIA dibatalkan.");
      return true;
    } finally {
      clearTimeoutImpl(timeoutId);
      if (audio != null) {
        try { player.release(audio); } catch {}
      }
      if (active === operation) active = null;
    }
  };

  return Object.freeze({
    speak,
    cancel,
    get available() { return !disposed && engine.available === true; },
    get isSpeaking() { return active !== null; },
    dispose() {
      if (disposed) return;
      cancel();
      disposed = true;
      try { engine.dispose?.(); } catch {}
      try { player.dispose?.(); } catch {}
    },
  });
}
