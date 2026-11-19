import { createSephiaRuntime } from "../runtime/create-sephia-runtime.js";
import { bindPageLifecycle } from "../runtime/bind-page-lifecycle.js";
import { createVisualState } from "../visual/visual-state.js";
import { mountSephiaControls } from "../visual/mount-sephia-controls.js";
import { mountSephiaAvatar } from "../visual/mount-sephia-avatar.js";
import { createNotificationSpeechController } from "../audio/announcement.js";
import { createBrowserLocalIndonesianTts } from "../audio/browser-local-tts.js";
import { createLocalAudioAnnouncementAdapter } from "../audio/local-audio-announcement.js";
import { createChromeNativeMessagingTtsAdapter } from "../audio/chrome-native-messaging-tts.js";
import { createHybridSpeechAdapter } from "../audio/hybrid-speech-adapter.js";
import { createLocalWakeWordRecognizer } from "../audio/local-wake-word.js";

/**
 * Opt-in host bridge for the Panitia dashboard.
 * Resolves only explicit mount points; never scans the document.
 * Avatar rendering is optional and isolated from the notification runtime.
 */
// iOS Safari only counts touchend/click as speech-unlocking user activation.
const PRIME_EVENTS = ["pointerdown", "pointerup", "touchstart", "touchend", "click", "keydown"];

export function mountPanitiaSephia({
  documentImpl = globalThis.document,
  windowImpl = globalThis.window,
  onError = () => {},
  onNotification = () => {},
  avatarAssetUrl = null,
  autoActivate = true,
  announcementAssetUrl = null,
  createRuntime = createSephiaRuntime,
  createState = createVisualState,
  mountControls = mountSephiaControls,
  mountAvatar = mountSephiaAvatar,
  bindLifecycle = bindPageLifecycle,
  createSpeechAdapter = (win, assetUrl, callbacks = {}) => {
    const browser = assetUrl
      ? createLocalAudioAnnouncementAdapter({ AudioImpl: win?.Audio, assetUrl })
      : createBrowserLocalIndonesianTts({
        speechSynthesisImpl: win?.speechSynthesis,
        UtteranceImpl: win?.SpeechSynthesisUtterance,
        relaxed: true,
        onStatus: callbacks.onVoiceStatus,
      });
    const EventImpl = win?.CustomEvent || globalThis.CustomEvent;
    let neural = null;
    try {
      if (typeof win?.dispatchEvent === "function" && typeof EventImpl === "function") {
        neural = createChromeNativeMessagingTtsAdapter({
          windowImpl: win,
          CustomEventImpl: EventImpl,
          onStatusChange: callbacks.onNeuralStatus,
        });
      }
    } catch {}
    return createHybridSpeechAdapter({ neural, browser, onEngineChange: callbacks.onEngineChange });
  },
  createWakeWordRecognizer = (win, callbacks) => createLocalWakeWordRecognizer({
    windowImpl: win,
    requireLocal: false,
    wakeWords: ["sephia", "sefia", "sofia", "sepia", "sefiya", "sepiya", "sephie", "sephya"],
    ...callbacks,
  }),
} = {}) {
  if (!documentImpl?.getElementById) throw new TypeError("Panitia document is required.");
  if (!windowImpl?.addEventListener) throw new TypeError("Panitia window is required.");

  const alertRoot = documentImpl.getElementById("alertList");
  const controlsMount = documentImpl.getElementById("sephiaControlMount");
  const avatarMount = documentImpl.getElementById("sephiaAvatarMount");
  if (!alertRoot || alertRoot.id !== "alertList") {
    throw new Error('Panitia alert root "#alertList" is unavailable; SEPHIA was not mounted.');
  }
  if (!controlsMount) {
    throw new Error('Panitia control mount "#sephiaControlMount" is unavailable; SEPHIA was not mounted.');
  }

  let visualState;
  let speechAdapter;
  let speechController;
  let wakeRecognizer;
  let runtime;
  let controls;
  let avatar;
  let lifecycle;
  let disposed = false;

  const report = (error) => {
    try { showDiag("masalah — " + (error?.message || error)); } catch {}
    try { onError(error); } catch {}
  };

  const diagEl = documentImpl.createElement?.("div");
  if (diagEl) {
    diagEl.id = "sephiaDiag";
    diagEl.setAttribute("aria-live", "polite");
    diagEl.style.cssText = "font-size:.72rem;opacity:.8;margin-top:.35rem;word-break:break-word";
    controlsMount.appendChild(diagEl);
  }
  const showDiag = (text) => { if (diagEl) diagEl.textContent = "Mic: " + text; };
  const STATE_TEXT = {
    "checking-local-language": "memeriksa mikrofon…", "listening": "mendengarkan (ucapkan “Sephia”)",
    "wake-word-detected": "kata panggil terdeteksi", "standby": "siaga", "paused": "dijeda (Sephia bicara)",
    "limited": "tidak tersedia", "error": "error", "stopped": "mati",
  };

  try {
    visualState = createState();
    wakeRecognizer = createWakeWordRecognizer(windowImpl, {
      onTrace(name) {
        const T = { start: "pengenal mulai", audiostart: "mic terbuka (menunggu suara)", soundstart: "ada suara masuk",
          speechstart: "ucapan terdeteksi", speechend: "ucapan selesai, memproses…", nomatch: "tidak dikenali" };
        showDiag(T[name] || name);
      },
      onHeard(text) { showDiag("terdengar: \u201c" + text + "\u201d"); },
      onWakeWord() {
        if (!visualState.snapshot.active) return;
        visualState.setState("listening");
        try { controls?.setStatus?.("Panggilan terdeteksi. SEPHIA sedang merespons…", "ready"); } catch {}
        // Audible acknowledgement (fixed approved phrase); pause recognition so
        // Sephia does not hear herself, then resume.
        try {
          wakeRecognizer.pause();
          Promise.resolve(speechController?.acknowledgeWakeWord?.())
            .catch(report)
            .finally(() => { try { wakeRecognizer.resume(); } catch {} });
        } catch (error) { report(error); }
      },
      onStateChange(snapshot) {
        showDiag((STATE_TEXT[snapshot.state] || snapshot.state) + (snapshot.error ? " [" + snapshot.error + "]" : ""));
        if (!visualState.snapshot.active) return;
        if (snapshot.state === "error") {
          visualState.setState("error");
        } else if (snapshot.state === "limited") {
          visualState.setState("limited");
        } else if (snapshot.state === "standby" || snapshot.state === "listening") {
          if (!speechController?.isSpeaking) visualState.setState("standby");
        }
      },
      onError: report,
    });
    speechAdapter = createSpeechAdapter(windowImpl, announcementAssetUrl, {
      onNeuralStatus(status) {
        const messages = {
          "bridge-waiting": ["Neural belum terhubung (opsional); memakai suara Chrome.", "info"],
          connected: ["Ekstensi dan Native Host tersambung.", "ready"],
          disconnected: ["Jembatan neural terputus; memakai suara Chrome.", "info"],
          "audio-unlock-pending": ["Membuka audio neural…", "info"],
          "audio-unlocked": ["Audio neural siap.", "ready"],
          "audio-unlock-failed": ["Chrome menolak aktivasi audio neural; memakai suara Chrome.", "info"],
          "audio-unlock-timeout": ["Ekstensi tidak merespons; memakai suara Chrome.", "info"],
          synthesizing: ["Mesin neural sedang membuat suara…", "info"],
          ready: ["Jembatan TTS neural siap.", "ready"],
        };
        const m = messages[status?.reason];
        if (m) { try { controls?.setStatus?.(m[0], m[1]); } catch {} }
      },
      onVoiceStatus(st) {
        const name = st?.voice ? st.voice : "default Chrome (tidak ada suara id-ID)";
        if (st?.status === "error") {
          const hint = (st.error === "tidak-mulai" || st.error === "timeout")
            ? "Suara tidak keluar. Ketuk layar sekali, naikkan volume media, dan matikan mode senyap (iPhone)."
            : "Suara gagal: " + (st.error || "speech-error");
          try { controls?.setStatus?.(hint, "error"); } catch {}
          return;
        }
        try { controls?.setStatus?.("Suara: " + name + (st?.voices !== undefined ? " · " + st.voices + " suara tersedia" : ""), st?.voice ? "ready" : "info"); } catch {}
      },
      onEngineChange(engine) { showDiag("suara: " + (engine === "neural" ? "neural lokal" : "browser (Chrome)")); },
    });
    speechController = createNotificationSpeechController({
      adapter: speechAdapter,
      onStateChange(state) {
        if (!visualState.snapshot.active) return;
        if (state === "speaking") visualState.setState("speaking");
        else if (state === "standby") {
          visualState.setState(wakeRecognizer.isActive ? "standby" : "limited");
        }
      },
      onError(error) {
        if (visualState.snapshot.active) visualState.setState("error");
        report(error);
      },
    });
    runtime = createRuntime({
      root: alertRoot,
      speechController,
      onNotification(event) {
        try { onNotification(event); } catch (error) { report(error); }
      },
      onNotificationError: report,
    });

    // The avatar is decorative/optional: its failure cannot disable alerts,
    // controls, TTS, or the wake-word lifecycle.
    if (avatarMount && typeof mountAvatar === "function") {
      try {
        avatar = mountAvatar({
          container: avatarMount,
          visualState,
          speechController,
          avatarAssetUrl,
          documentImpl,
          onError: report,
        });
      } catch (error) {
        report(error);
      }
    }

    controls = mountControls({
      container: controlsMount,
      runtime,
      visualState,
      documentImpl,
      onError: report,
      isSpeechReady: () => speechAdapter?.available === true,
      onTestSpeech: () => speechController.test(),
      onActivated() {
        // Unlock the neural audio bridge synchronously while the user gesture (if any) is live.
        try { if (typeof speechAdapter?.prepare === "function") speechAdapter.prepare(); } catch (error) { report(error); }
        return wakeRecognizer.start().then((started) => {
          if (!started && visualState.snapshot.active) {
            visualState.setState("limited");
            try { controls?.setStatus?.("Suara siap; wake word belum aktif. Periksa izin mikrofon dan pengenalan suara.", "error"); } catch {}
          }
          return started;
        }).catch((error) => {
          if (visualState.snapshot.active) visualState.setState("limited");
          report(error);
          return false;
        });
      },
      onDeactivated() {
        wakeRecognizer.stop();
      },
    });
    lifecycle = bindLifecycle({ windowImpl, runtime, visualState });

    // Chrome only allows speechSynthesis.speak() after one user activation on the page.
    // Prime it silently on the first interaction so later alerts are audible without
    // clicking the SEPHIA button.
    if (autoActivate) {
      const prime = () => {
        for (const ev of PRIME_EVENTS) windowImpl.removeEventListener?.(ev, prime, true);
        try {
          const synth = windowImpl.speechSynthesis;
          const Utt = windowImpl.SpeechSynthesisUtterance;
          if (synth && Utt) { const u = new Utt("."); u.volume = 0.01; u.lang = "id-ID"; synth.speak(u); }
        } catch (error) { report(error); }
      };
      for (const ev of PRIME_EVENTS) windowImpl.addEventListener(ev, prime, true);
      try { controls.activate?.(); } catch (error) { report(error); }
    }
  } catch (error) {
    try { lifecycle?.dispose(); } catch {}
    try { controls?.dispose(); } catch {}
    try { avatar?.dispose(); } catch {}
    try { wakeRecognizer?.stop(); } catch {}
    try { runtime?.dispose(); } catch {}
    try { wakeRecognizer?.dispose(); } catch {}
    try { speechController?.dispose(); } catch {}
    try { speechAdapter?.dispose(); } catch {}
    try { visualState?.dispose(); } catch {}
    report(error);
    throw error;
  }

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try { lifecycle?.dispose(); } catch (error) { report(error); }
    try { wakeRecognizer?.stop(); } catch (error) { report(error); }
    try { runtime?.dispose(); } catch (error) { report(error); }
    try { wakeRecognizer?.dispose(); } catch (error) { report(error); }
    try { speechController?.dispose(); } catch (error) { report(error); }
    try { speechAdapter?.dispose(); } catch (error) { report(error); }
    try { avatar?.dispose(); } catch (error) { report(error); }
    try { controls?.dispose(); } catch (error) { report(error); }
    try { visualState?.dispose(); } catch (error) { report(error); }
    windowImpl.removeEventListener?.("pagehide", dispose);
  };

  windowImpl.addEventListener("pagehide", dispose, { once: true });

  return Object.freeze({
    runtime,
    visualState,
    speechAdapter,
    speechController,
    wakeRecognizer,
    controls,
    avatar,
    get isDisposed() { return disposed; },
    dispose,
  });
}
