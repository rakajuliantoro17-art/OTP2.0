const WAKE_WORD = "sephia";

function normalizeTranscript(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function unavailableController(reason) {
  return Object.freeze({
    supported: false,
    get isActive() { return false; },
    start: async () => { throw new Error(reason); },
    pause() {},
    resume: async () => false,
    stop() {},
    dispose() {},
  });
}

/**
 * Strict on-device wake-word recognition.
 * It requires the unprefixed SpeechRecognition API, processLocally support,
 * and a locally available/downloadable id-ID language pack. It never falls
 * back to a server recognizer and never exposes or persists recognized text.
 */
export function createLocalWakeWordRecognizer({
  windowImpl = globalThis.window,
  onWakeWord = () => {},
  onStateChange = () => {},
  onError = () => {},
  confidenceThreshold = 0.88,
  restartDelayMs = 350,
} = {}) {
  const Recognition = windowImpl?.SpeechRecognition;
  if (typeof Recognition !== "function" ||
      typeof Recognition.available !== "function" ||
      typeof Recognition.install !== "function") {
    return unavailableController("Pengenalan suara lokal id-ID tidak didukung browser ini.");
  }

  let active = false;
  let paused = false;
  let disposed = false;
  let recognition = null;
  let restartTimer = null;
  let generation = 0;
  let wakeCooldownUntil = 0;
  let listeningUntilTimer = null;

  const publish = (state, detail = {}) => {
    try { onStateChange(Object.freeze({ state, ...detail })); } catch {}
  };
  const report = (error) => {
    try { onError(error); } catch {}
  };
  const clearTimers = () => {
    if (restartTimer !== null) clearTimeout(restartTimer);
    if (listeningUntilTimer !== null) clearTimeout(listeningUntilTimer);
    restartTimer = null;
    listeningUntilTimer = null;
  };
  const releaseRecognition = () => {
    const current = recognition;
    recognition = null;
    if (!current) return;
    current.onresult = null;
    current.onerror = null;
    current.onend = null;
    try { current.abort?.(); } catch {
      try { current.stop?.(); } catch {}
    }
  };

  const handleResult = (event) => {
    if (!active || paused || disposed) return;
    for (let i = event.resultIndex || 0; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result?.isFinal) continue;
      const alternative = result[0];
      if (!alternative || !Number.isFinite(alternative.confidence) ||
          alternative.confidence < confidenceThreshold) continue;
      const transcript = normalizeTranscript(alternative.transcript);
      if (transcript !== WAKE_WORD || Date.now() < wakeCooldownUntil) continue;

      wakeCooldownUntil = Date.now() + 10000;
      publish("wake-word-detected");
      try { onWakeWord(); } catch (error) { report(error); }
      if (listeningUntilTimer !== null) clearTimeout(listeningUntilTimer);
      listeningUntilTimer = setTimeout(() => {
        listeningUntilTimer = null;
        if (active && !paused && !disposed) publish("standby");
      }, 10000);
    }
  };

  const startRecognition = () => {
    if (!active || paused || disposed || recognition) return false;
    const instance = new Recognition();
    recognition = instance;
    instance.lang = "id-ID";
    instance.continuous = true;
    instance.interimResults = false;
    instance.maxAlternatives = 1;
    instance.processLocally = true;
    instance.onresult = handleResult;
    instance.onerror = (event) => {
      if (!active || paused || disposed) return;
      if (event?.error === "no-speech") return;
      const error = new Error("Pengenalan suara lokal gagal: " + (event?.error || "unknown"));
      report(error);
      publish("error", { error: event?.error || "unknown" });
      active = false;
      clearTimers();
      releaseRecognition();
    };
    instance.onend = () => {
      if (recognition === instance) recognition = null;
      if (!active || paused || disposed) return;
      restartTimer = setTimeout(() => {
        restartTimer = null;
        try { startRecognition(); } catch (error) {
          report(error);
          publish("error");
          active = false;
        }
      }, restartDelayMs);
    };
    instance.start();
    publish("listening");
    return true;
  };

  const start = async () => {
    if (disposed) throw new Error("Wake-word recognizer sudah dihentikan.");
    if (active) return true;
    active = true;
    paused = false;
    const token = ++generation;
    clearTimers();
    publish("checking-local-language");

    try {
      let availability = await Recognition.available({
        langs: ["id-ID"],
        processLocally: true,
      });
      if (!active || disposed || token !== generation) return false;

      if (availability === "downloadable") {
        publish("installing-local-language");
        const installed = await Recognition.install({
          langs: ["id-ID"],
          processLocally: true,
        });
        if (!installed) throw new Error("Paket bahasa lokal id-ID gagal dipasang.");
        availability = await Recognition.available({
          langs: ["id-ID"],
          processLocally: true,
        });
      }

      if (!active || disposed || token !== generation) return false;
      if (availability !== "available") {
        throw new Error("Paket pengenalan suara lokal id-ID tidak tersedia.");
      }
      return startRecognition();
    } catch (error) {
      if (token === generation && active && !disposed) {
        active = false;
        paused = false;
        clearTimers();
        releaseRecognition();
        publish("limited");
        report(error);
      }
      return false;
    }
  };

  return Object.freeze({
    supported: true,
    get isActive() { return active && !paused && !disposed; },

    start,

    pause() {
      if (!active || paused || disposed) return;
      paused = true;
      clearTimers();
      releaseRecognition();
      publish("paused");
    },

    async resume() {
      if (!active || !paused || disposed) return false;
      paused = false;
      try {
        startRecognition();
        return true;
      } catch (error) {
        active = false;
        paused = false;
        report(error);
        publish("limited");
        return false;
      }
    },

    stop() {
      if (disposed) return;
      generation += 1;
      active = false;
      paused = false;
      clearTimers();
      releaseRecognition();
      publish("stopped");
    },

    dispose() {
      if (disposed) return;
      this.stop();
      disposed = true;
      publish("inactive");
    },
  });
}
