const FEMALE_HINTS = /female|woman|wanita|perempuan|siti|gadis/i;

function isIndonesianLocalVoice(voice) {
  return typeof voice?.lang === "string" &&
    /^id(?:-|$)/i.test(voice.lang) &&
    voice.localService === true;
}

export function selectIndonesianLocalVoice(voices = []) {
  const candidates = voices.filter(isIndonesianLocalVoice);
  if (!candidates.length) return null;
  return candidates.find((voice) => FEMALE_HINTS.test(voice.name || "")) || null;
}

const isIndonesian = (voice) => typeof voice?.lang === "string" && /^id(?:[-_]|$)/i.test(voice.lang);

/**
 * Relaxed selection (owner decision D-17-1/D-18-4): prefer local female Indonesian,
 * then any local Indonesian, then any Indonesian voice (including Chrome's network
 * "Google Bahasa Indonesia"), otherwise null (caller may fall back to the default voice).
 */
export function selectIndonesianVoice(voices = []) {
  const id = voices.filter(isIndonesian);
  return id.find((v) => v.localService === true && FEMALE_HINTS.test(v.name || "")) ||
    id.find((v) => v.localService === true) ||
    id.find((v) => FEMALE_HINTS.test(v.name || "")) ||
    id[0] || null;
}

/**
 * Browser/OS TTS adapter. It accepts only voices marked localService and
 * tagged Indonesian. No remote speech service or voice download is used.
 * localService is a browser-reported platform property, not a cryptographic
 * guarantee; the actual workstation still requires privacy acceptance tests.
 */
export function createBrowserLocalIndonesianTts({
  speechSynthesisImpl = globalThis.speechSynthesis,
  UtteranceImpl = globalThis.SpeechSynthesisUtterance,
  onStatus = () => {},
  relaxed = false,
} = {}) {
  const pick = relaxed ? selectIndonesianVoice : selectIndonesianLocalVoice;
  if (!speechSynthesisImpl || typeof speechSynthesisImpl.speak !== "function" ||
      typeof speechSynthesisImpl.getVoices !== "function" ||
      typeof UtteranceImpl !== "function") {
    return Object.freeze({
      available: false,
      voice: null,
      speak: async () => { throw new Error("Browser speech synthesis is unavailable."); },
      cancel() {},
      dispose() {},
    });
  }

  let disposed = false;
  let generation = 0;
  let currentUtterance = null;
  let selectedVoice = pick(speechSynthesisImpl.getVoices());

  const publish = (status, detail = {}) => {
    try { onStatus(Object.freeze({ status, voice: selectedVoice?.name || null, ...detail })); } catch {}
  };

  const refreshVoice = () => {
    if (disposed) return;
    selectedVoice = pick(speechSynthesisImpl.getVoices());
    publish(selectedVoice ? "ready" : "unavailable", { voices: speechSynthesisImpl.getVoices().length });
  };

  speechSynthesisImpl.addEventListener?.("voiceschanged", refreshVoice);

  const waitForVoice = async () => {
    if (selectedVoice) return selectedVoice;
    refreshVoice();
    if (selectedVoice) return selectedVoice;
    if (relaxed) return null; // use the browser default voice with lang id-ID
    if (typeof speechSynthesisImpl.addEventListener !== "function") {
      throw new Error("Tidak ditemukan suara TTS lokal Bahasa Indonesia (id-ID).");
    }

    await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        speechSynthesisImpl.removeEventListener?.("voiceschanged", finish);
        refreshVoice();
        resolve();
      };
      const timer = setTimeout(finish, 1200);
      speechSynthesisImpl.addEventListener("voiceschanged", finish, { once: true });
    });
    if (!selectedVoice) throw new Error("Tidak ditemukan suara TTS lokal Bahasa Indonesia (id-ID).");
    return selectedVoice;
  };

  return Object.freeze({
    get available() { return (relaxed || Boolean(selectedVoice)) && !disposed; },
    get voice() {
      return selectedVoice ? Object.freeze({
        name: selectedVoice.name,
        lang: selectedVoice.lang,
        localService: selectedVoice.localService === true,
        femaleHint: FEMALE_HINTS.test(selectedVoice.name || ""),
      }) : null;
    },

    async speak(text) {
      if (disposed) throw new Error("TTS adapter sudah dihentikan.");
      if (typeof text !== "string" || !text.trim()) throw new TypeError("Teks pengumuman kosong.");
      const operation = ++generation;
      const voice = await waitForVoice();
      if (disposed || operation !== generation) throw new Error("Permintaan TTS dibatalkan.");

      speechSynthesisImpl.cancel();
      const utterance = new UtteranceImpl(text);
      currentUtterance = utterance;
      if (voice) utterance.voice = voice;
      utterance.lang = "id-ID";
      utterance.rate = 0.9;
      utterance.pitch = 1.04;
      utterance.volume = 1;

      publish("speaking");
      return new Promise((resolve, reject) => {
        // Watchdogs: some browsers (notably iOS Safari without user activation or with the
        // silent switch on) accept speak() but never start or finish, leaving SEPHIA "speaking" forever.
        let started = false;
        const fail = (code) => {
          clearTimeout(startTimer); clearTimeout(endTimer);
          if (currentUtterance === utterance) currentUtterance = null;
          try { speechSynthesisImpl.cancel(); } catch {}
          publish("error", { error: code });
          reject(new Error("TTS Bahasa Indonesia gagal: " + code));
        };
        const startTimer = setTimeout(() => { if (!started) fail("tidak-mulai"); }, 3500);
        const endTimer = setTimeout(() => fail("timeout"), 5000 + text.length * 150);
        utterance.onstart = () => { started = true; clearTimeout(startTimer); publish("started"); };
        utterance.onend = () => {
          clearTimeout(startTimer); clearTimeout(endTimer);
          if (currentUtterance === utterance) currentUtterance = null;
          publish("ready");
          resolve();
        };
        utterance.onerror = (event) => {
          clearTimeout(startTimer); clearTimeout(endTimer);
          if (currentUtterance === utterance) currentUtterance = null;
          publish("error", { error: event?.error || "speech-error" });
          reject(new Error("TTS Bahasa Indonesia gagal: " + (event?.error || "speech-error")));
        };
        try {
          speechSynthesisImpl.speak(utterance);
        } catch (error) {
          currentUtterance = null;
          publish("error");
          reject(error);
        }
      });
    },

    cancel() {
      if (disposed) return;
      generation += 1;
      currentUtterance = null;
      try { speechSynthesisImpl.cancel(); } finally { publish("ready"); }
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      generation += 1;
      speechSynthesisImpl.removeEventListener?.("voiceschanged", refreshVoice);
      currentUtterance = null;
      try { speechSynthesisImpl.cancel(); } catch {}
    },
  });
}
