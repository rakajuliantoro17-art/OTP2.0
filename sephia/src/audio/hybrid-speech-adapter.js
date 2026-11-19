/**
 * Hybrid speech adapter: prefers the qualified local neural engine (Chrome extension +
 * Native Messaging host) when it is connected and audio-unlocked, and otherwise falls
 * back to the browser's Indonesian speech synthesis. SEPHIA therefore never goes silent
 * merely because the optional neural bridge is not installed.
 */
export function createHybridSpeechAdapter({ neural = null, browser = null, onEngineChange = () => {} } = {}) {
  if (!neural && !browser) throw new TypeError("At least one speech adapter is required.");
  let disposed = false;
  let lastEngine = null;

  const neuralReady = () => Boolean(neural) && neural.available === true;
  const browserReady = () => Boolean(browser) && browser.available !== false;
  const note = (engine) => {
    if (engine === lastEngine) return;
    lastEngine = engine;
    try { onEngineChange(engine); } catch {}
  };

  return Object.freeze({
    prepare() {
      let result = Promise.resolve(false);
      try { if (neural?.prepare) result = Promise.resolve(neural.prepare()).catch(() => false); } catch {}
      return result.then(() => browserReady() || neuralReady());
    },
    async speak(text) {
      if (disposed) throw new Error("Hybrid speech adapter is disposed.");
      if (neuralReady()) {
        try {
          note("neural");
          return await neural.speak(text);
        } catch (error) {
          if (!browserReady()) throw error;
        }
      }
      if (!browserReady()) throw new Error("Tidak ada mesin suara yang tersedia.");
      note("browser");
      return browser.speak(text);
    },
    cancel() {
      try { neural?.cancel?.(); } catch {}
      try { browser?.cancel?.(); } catch {}
    },
    get available() { return !disposed && (neuralReady() || browserReady()); },
    get engine() { return neuralReady() ? "neural" : browserReady() ? "browser" : "none"; },
    get isSpeaking() { return Boolean(neural?.isSpeaking || browser?.isSpeaking); },
    dispose() {
      if (disposed) return;
      disposed = true;
      try { neural?.dispose?.(); } catch {}
      try { browser?.dispose?.(); } catch {}
    },
  });
}
