export const APPROVED_SEPHIA_ANNOUNCEMENT =
  "Perhatian, Panitia. Ada notifikasi pelanggaran OTP baru. Silakan periksa notifikasinya di dashboard, ya.";

const DEFAULT_ASSET = "/sephia/assets/sephia-announcement.wav";

function isSafeLocalAudioPath(path) {
  if (typeof path !== "string" || path.includes("\\") || /[?#%]/.test(path)) return false;
  const rooted = path.startsWith("/sephia/assets/");
  const relative = path.startsWith("./assets/");
  if (!rooted && !relative) return false;
  if (!/\.wav$/i.test(path)) return false;
  const parts = path.split("/");
  return parts.every((part, index) =>
    (index === 0 && (part === "" || part === ".")) ||
    (part.length > 0 && part !== "." && part !== "..")
  );
}

function createAudio(AudioImpl, assetUrl) {
  const audio = new AudioImpl();
  audio.preload = "auto";
  audio.src = assetUrl;
  return audio;
}

/**
 * Plays one approved, bundled same-origin announcement.
 * It never synthesizes speech, fetches a remote resource, or accepts dynamic text.
 */
export function createLocalAudioAnnouncementAdapter({
  AudioImpl = globalThis.Audio,
  assetUrl = DEFAULT_ASSET,
  onStatus = () => {},
} = {}) {
  if (!isSafeLocalAudioPath(assetUrl)) {
    throw new TypeError("SEPHIA audio must use a bundled same-origin WAV asset path.");
  }
  if (typeof AudioImpl !== "function") {
    return Object.freeze({
      available: false,
      speak: async () => { throw new Error("Pemutar audio lokal tidak tersedia."); },
      cancel() {},
      dispose() {},
    });
  }

  let disposed = false;
  let audio = null;
  let operation = null;

  const publish = (status, detail = {}) => {
    try { onStatus(Object.freeze({ status, asset: assetUrl, ...detail })); } catch {}
  };

  const clearOperation = (current) => {
    if (!current) return;
    current.audio.removeEventListener("ended", current.onEnded);
    current.audio.removeEventListener("error", current.onError);
    if (operation === current) operation = null;
  };

  const cancel = () => {
    if (!audio || disposed) return;
    const current = operation;
    clearOperation(current);
    try { audio.pause(); } catch {}
    try { audio.currentTime = 0; } catch {}
    if (current) current.resolve(false);
    publish("ready");
  };

  return Object.freeze({
    get available() { return !disposed && typeof AudioImpl === "function"; },

    speak(text) {
      if (disposed) return Promise.reject(new Error("SEPHIA audio adapter sudah dihentikan."));
      if (text !== APPROVED_SEPHIA_ANNOUNCEMENT) {
        return Promise.reject(new TypeError("Teks pengumuman SEPHIA tidak diizinkan."));
      }
      if (operation) cancel();
      if (!audio) audio = createAudio(AudioImpl, assetUrl);
      try { audio.currentTime = 0; } catch {}

      return new Promise((resolve, reject) => {
        const current = {
          audio,
          resolve,
          onEnded: () => {
            clearOperation(current);
            publish("ready");
            resolve(true);
          },
          onError: () => {
            clearOperation(current);
            publish("error");
            reject(new Error("Aset audio lokal SEPHIA gagal diputar."));
          },
        };
        operation = current;
        audio.addEventListener("ended", current.onEnded, { once: true });
        audio.addEventListener("error", current.onError, { once: true });
        publish("speaking");
        let playback;
        try { playback = audio.play(); }
        catch (error) {
          clearOperation(current);
          publish("error");
          reject(error);
          return;
        }
        if (playback && typeof playback.catch === "function") {
          playback.catch((error) => {
            if (operation !== current) return;
            clearOperation(current);
            publish("error", { reason: "playback-rejected" });
            reject(error);
          });
        }
      });
    },

    cancel,

    dispose() {
      if (disposed) return;
      cancel();
      disposed = true;
      if (audio) {
        try { audio.pause(); } catch {}
        try { audio.removeAttribute?.("src"); } catch {}
        try { audio.load?.(); } catch {}
      }
      audio = null;
      publish("disposed");
    },
  });
}
