import { createBrowserLocalIndonesianTts } from "../dist/audio/browser-local-tts.js";
import { createLocalWakeWordRecognizer } from "../dist/audio/local-wake-word.js";

const ttsStatus = document.getElementById("ttsStatus");
const wakeStatus = document.getElementById("wakeStatus");
const wakeResult = document.getElementById("wakeResult");
const ttsButton = document.getElementById("ttsButton");
const wakeStart = document.getElementById("wakeStart");
const wakeStop = document.getElementById("wakeStop");

const write = (node, message) => {
  if (node) node.textContent = message;
};

const tts = createBrowserLocalIndonesianTts({
  onStatus(status) {
    if (status.status === "ready" && status.voice) {
      write(ttsStatus, "Suara lokal terdeteksi: " + status.voice + " (" + (tts.voice?.lang || "id-ID") + ").");
    }
  },
});

let wake = null;
let wakeStarting = false;

ttsButton.addEventListener("click", async () => {
  ttsButton.disabled = true;
  try {
    const voice = tts.voice;
    if (!voice || !tts.available) {
      await tts.speak("Uji suara SEPHIA. Perhatian, Panitia.");
    } else {
      write(ttsStatus, "Menguji " + voice.name + " · " + voice.lang + " · lokal.");
      await tts.speak("Uji suara SEPHIA. Perhatian, Panitia.");
      write(ttsStatus, "Berhasil. Suara lokal Indonesia selesai berbicara: " + voice.name + ".");
    }
  } catch (error) {
    write(ttsStatus, "TTS belum memenuhi syarat: " + (error?.message || "suara lokal Indonesia feminin tidak tersedia."));
  } finally {
    ttsButton.disabled = false;
  }
});

wakeStart.addEventListener("click", async () => {
  if (wakeStarting || wake?.isActive) return;
  wakeStarting = true;
  wakeStart.disabled = true;
  write(wakeResult, "");
  wake = createLocalWakeWordRecognizer({
    windowImpl: window,
    onWakeWord() {
      write(wakeResult, "Wake word “SEPHIA” terdeteksi.");
    },
    onStateChange(snapshot) {
      write(wakeStatus, "Status pengenalan lokal: " + snapshot.state + ".");
      if (snapshot.state === "limited" || snapshot.state === "error" || snapshot.state === "stopped") {
        wakeStart.disabled = false;
        wakeStop.disabled = true;
      }
    },
    onError(error) {
      write(wakeStatus, "Wake word tidak tersedia: " + (error?.message || "gagal."));
    },
  });

  try {
    const started = await wake.start();
    if (started) {
      write(wakeStatus, "Mendengarkan secara lokal. Ucapkan “SEPHIA” untuk menguji.");
      wakeStart.disabled = true;
      wakeStop.disabled = false;
    } else {
      wakeStart.disabled = false;
      wakeStop.disabled = true;
    }
  } catch (error) {
    write(wakeStatus, "Wake word tidak tersedia: " + (error?.message || "gagal."));
    wakeStart.disabled = false;
    wakeStop.disabled = true;
  } finally {
    wakeStarting = false;
  }
});

wakeStop.addEventListener("click", () => {
  wake?.stop();
  wakeStart.disabled = false;
  wakeStop.disabled = true;
  write(wakeStatus, "Uji wake word dihentikan.");
});

window.addEventListener("pagehide", () => {
  wake?.dispose();
  tts.dispose();
}, { once: true });

write(ttsStatus, tts.available && tts.voice
  ? "Suara lokal Indonesia terdeteksi: " + tts.voice.name + "."
  : "Belum ada suara lokal Indonesia feminin yang memenuhi filter. Klik uji untuk pemeriksaan akhir.");
write(wakeStatus, window.isSecureContext
  ? "Secure context tersedia. Dukungan id-ID lokal diperiksa saat tombol mulai ditekan."
  : "Halaman ini bukan secure context. Gunakan HTTPS atau localhost untuk wake word.");
