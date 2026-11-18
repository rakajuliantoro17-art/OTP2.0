import { createSephiaRuntime } from "../runtime/create-sephia-runtime.js";
import { bindPageLifecycle } from "../runtime/bind-page-lifecycle.js";
import { createVisualState } from "../visual/visual-state.js";
import { mountSephiaControls } from "../visual/mount-sephia-controls.js";
import { mountSephiaAvatar } from "../visual/mount-sephia-avatar.js";
import { createNotificationSpeechController } from "../audio/announcement.js";
import { createUnavailableLocalNeuralTtsAdapter } from "../audio/local-neural-tts.js";
import { createChromeNativeMessagingTtsAdapter } from "../audio/chrome-native-messaging-tts.js";
import { createLocalWakeWordRecognizer } from "../audio/local-wake-word.js";

/**
 * Opt-in host bridge for the Panitia dashboard.
 * Resolves only explicit mount points; never scans the document.
 * Avatar rendering is optional and isolated from the notification runtime.
 */
export function mountPanitiaSephia({
  documentImpl = globalThis.document,
  windowImpl = globalThis.window,
  onError = () => {},
  onNotification = () => {},
  avatarAssetUrl = null,
  createRuntime = createSephiaRuntime,
  createState = createVisualState,
  mountControls = mountSephiaControls,
  mountAvatar = mountSephiaAvatar,
  bindLifecycle = bindPageLifecycle,
  createSpeechAdapter = (win, callbacks = {}) => {
    const EventImpl = win?.CustomEvent || globalThis.CustomEvent;
    return typeof win?.dispatchEvent === "function" && typeof EventImpl === "function"
      ? createChromeNativeMessagingTtsAdapter({
          windowImpl: win,
          CustomEventImpl: EventImpl,
          onStatusChange: callbacks.onStatusChange,
        })
      : createUnavailableLocalNeuralTtsAdapter();
  },
  createWakeWordRecognizer = (win, callbacks) => createLocalWakeWordRecognizer({
    windowImpl: win,
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
  let latestSpeechStatus = {
    reason: "bridge-waiting",
    connected: false,
    audioUnlocked: false,
    available: false,
  };

  const setControlStatus = (message, level = "info") => {
    try { controls?.setStatus?.(message, level); } catch {}
  };

  const report = (error) => {
    try { onError(error); } catch {}
  };

  try {
    visualState = createState();
    wakeRecognizer = createWakeWordRecognizer(windowImpl, {
      onWakeWord() {
        if (!visualState.snapshot.active) return;
        visualState.setState("listening");
        if (speechAdapter?.available !== true) {
          setControlStatus("Panggilan SEPHIA terdeteksi. Audio lokal belum siap; periksa koneksi ekstensi dan Native Host.", "error");
          return;
        }
        setControlStatus("Panggilan terdeteksi. SEPHIA sedang merespons…", "ready");
        void speechController?.acknowledgeWakeWord?.().then((spoken) => {
          if (!visualState.snapshot.active) return;
          if (spoken) {
            setControlStatus("SEPHIA siap membantu.", "ready");
          } else if (speechAdapter?.available !== true) {
            setControlStatus("Panggilan terdeteksi, tetapi audio lokal terputus. Periksa status koneksi.", "error");
          }
        });
      },
      onStateChange(snapshot) {
        if (!visualState.snapshot.active) return;
        if (snapshot.state === "error") {
          visualState.setState("error");
        } else if (snapshot.state === "limited") {
          visualState.setState("limited");
        } else if (snapshot.state === "standby" || snapshot.state === "listening") {
          if (!speechController?.isSpeaking) visualState.setState("standby");
          if (snapshot.state === "listening") setControlStatus("Mikrofon aktif. Ucapkan “SEPHIA”.");
          if (snapshot.state === "standby") setControlStatus("Mendengarkan panggilan SEPHIA.");
        } else if (snapshot.state === "checking-local-language") {
          setControlStatus("Memeriksa pengenalan suara lokal Bahasa Indonesia…");
        } else if (snapshot.state === "installing-local-language") {
          setControlStatus("Menyiapkan paket bahasa lokal id-ID…");
        }
      },
      onError(error) {
        setControlStatus("Wake word belum siap: " + String(error?.message || error), "error");
        report(error);
      },
    });
    speechAdapter = createSpeechAdapter(windowImpl, {
      onStatusChange(status) {
        latestSpeechStatus = status;
        const messages = {
          "bridge-waiting": ["Belum terhubung. Buka ekstensi SEPHIA lalu pilih Hubungkan tab Panitia.", "error"],
          connected: ["Ekstensi dan Native Host tersambung. Aktifkan SEPHIA untuk membuka audio.", "ready"],
          disconnected: ["Jembatan audio terputus. Hubungkan ulang melalui ekstensi SEPHIA.", "error"],
          "audio-unlock-pending": ["Membuka audio Chrome dari aktivasi manual…", "info"],
          "audio-unlocked": ["Audio Chrome siap. Memeriksa mesin TTS lokal…", "ready"],
          "audio-unlock-failed": ["Chrome menolak aktivasi audio. Klik Aktifkan SEPHIA lagi.", "error"],
          "audio-unlock-timeout": ["Aktivasi audio tidak mendapat respons dari ekstensi. Hubungkan ulang.", "error"],
          synthesizing: ["Mesin TTS lokal sedang membuat suara…", "info"],
          ready: ["Jembatan TTS lokal siap.", "ready"],
        };
        const [message, level] = messages[status.reason] ||
          ["Status audio SEPHIA: " + status.reason, "info"];
        setControlStatus(message, level);
      },
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
        setControlStatus("Suara TTS gagal: " + String(error?.message || error), "error");
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
        // Unlock Web Audio synchronously from the real activation click before
        // awaiting microphone permission or any other asynchronous operation.
        let audioReady;
        try {
          audioReady = typeof speechAdapter?.prepare === "function"
            ? speechAdapter.prepare()
            : Promise.resolve(false);
        } catch (error) {
          report(error);
          audioReady = Promise.resolve(false);
        }
        let wakeReady;
        try {
          wakeReady = wakeRecognizer.start();
        } catch (error) {
          report(error);
          wakeReady = Promise.resolve(false);
        }
        return Promise.all([audioReady, wakeReady]).then(([audioUnlocked, wakeStarted]) => {
          if ((!audioUnlocked || !wakeStarted) && visualState.snapshot.active) {
            visualState.setState("limited");
            if (!wakeStarted) setControlStatus(
              "TTS " + (speechAdapter?.available ? "siap" : "belum siap") +
              "; wake word belum aktif. Periksa dukungan SpeechRecognition lokal, paket id-ID, dan izin mikrofon.",
              "error",
            );
          } else if (audioUnlocked && wakeStarted) {
            setControlStatus("SEPHIA siap. Ucapkan “SEPHIA” untuk memanggil asisten.", "ready");
          }
          return audioUnlocked && wakeStarted;
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
    if (latestSpeechStatus.reason === "bridge-waiting") {
      setControlStatus("Belum terhubung. Buka ekstensi SEPHIA lalu pilih Hubungkan tab Panitia.", "error");
    }
    lifecycle = bindLifecycle({ windowImpl, runtime, visualState });
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
