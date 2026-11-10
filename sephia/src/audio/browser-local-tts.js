const FEMALE_HINTS = /female|woman|wanita|perempuan|siti|gadis/i;

function isIndonesianLocalVoice(voice) {
  return typeof voice?.lang === "string" &&
    /^id(?:-|$)/i.test(voice.lang) &&
    voice.localService === true;
}

export function selectIndonesianLocalVoice(voices = []) {
  const candidates = voices.filter(isIndonesianLocalVoice);
  if (!candidates.length) return null;
  return candidates.find((voice) => FEMALE_HINTS.test(voice.name || "")) || candidates[0];
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
} = {}) {
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
  let selectedVoice = selectIndonesianLocalVoice(speechSynthesisImpl.getVoices());

  const publish = (status, detail = {}) => {
    try { onStatus(Object.freeze({ status, voice: selectedVoice?.name || null, ...detail })); } catch {}
  };

  const refreshVoice = () => {
    if (disposed) return;
    selectedVoice = selectIndonesianLocalVoice(speechSynthesisImpl.getVoices());
    publish(selectedVoice ? "ready" : "unavailable");
  };

  speechSynthesisImpl.addEventListener?.("voiceschanged", refreshVoice);

  const waitForVoice = async () => {
    if (selectedVoice) return selectedVoice;
    refreshVoice();
    if (selectedVoice) return selectedVoice;
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
    get available() { return Boolean(selectedVoice) && !disposed; },
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
      utterance.voice = voice;
      utterance.lang = "id-ID";
      utterance.rate = 0.9;
      utterance.pitch = 1.04;
      utterance.volume = 1;

      publish("speaking");
      return new Promise((resolve, reject) => {
        utterance.onend = () => {
          if (currentUtterance === utterance) currentUtterance = null;
          publish("ready");
          resolve();
        };
        utterance.onerror = (event) => {
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
