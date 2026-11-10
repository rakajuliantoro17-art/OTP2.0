import { createSephiaRuntime } from "../runtime/create-sephia-runtime.js";
import { bindPageLifecycle } from "../runtime/bind-page-lifecycle.js";
import { createVisualState } from "../visual/visual-state.js";
import { mountSephiaControls } from "../visual/mount-sephia-controls.js";
import { createNotificationSpeechController } from "../audio/announcement.js";
import { createBrowserLocalIndonesianTts } from "../audio/browser-local-tts.js";
import { createLocalWakeWordRecognizer } from "../audio/local-wake-word.js";

/**
 * Opt-in host bridge for the Panitia dashboard.
 * Resolves only the two explicit mount points; never scans the document.
 * No login/session identity is assumed. Speech accepts only browser-reported
 * local Indonesian voices; if unavailable, notifications remain visual-only.
 */
export function mountPanitiaSephia({
  documentImpl = globalThis.document,
  windowImpl = globalThis.window,
  onError = () => {},
  onNotification = () => {},
  createRuntime = createSephiaRuntime,
  createState = createVisualState,
  mountControls = mountSephiaControls,
  bindLifecycle = bindPageLifecycle,
  createSpeechAdapter = (win) => createBrowserLocalIndonesianTts({
    speechSynthesisImpl: win?.speechSynthesis,
    UtteranceImpl: win?.SpeechSynthesisUtterance,
  }),
  createWakeWordRecognizer = (win, callbacks) => createLocalWakeWordRecognizer({
    windowImpl: win,
    ...callbacks,
  }),
} = {}) {
  if (!documentImpl?.getElementById) throw new TypeError("Panitia document is required.");
  if (!windowImpl?.addEventListener) throw new TypeError("Panitia window is required.");

  const alertRoot = documentImpl.getElementById("alertList");
  const controlsMount = documentImpl.getElementById("sephiaControlMount");
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
  let lifecycle;
  let disposed = false;

  const report = (error) => {
    try { onError(error); } catch {}
  };

  try {
    visualState = createState();
    wakeRecognizer = createWakeWordRecognizer(windowImpl, {
      onWakeWord() {
        if (visualState.snapshot.active) visualState.setState("listening");
      },
      onStateChange(snapshot) {
        if (!visualState.snapshot.active) return;
        if (snapshot.state === "limited" || snapshot.state === "error") {
          visualState.setState("limited");
        } else if (snapshot.state === "standby" || snapshot.state === "listening") {
          if (!speechController?.isSpeaking) visualState.setState("standby");
        }
      },
      onError: report,
    });
    speechAdapter = createSpeechAdapter(windowImpl);
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
        if (visualState.snapshot.active) visualState.setState("limited");
        report(error);
      },
    });
    runtime = createRuntime({
      root: alertRoot,
      speechController,
      onNotification(event) {
        // Optional host callback. Speech controller receives the same validated
        // event through the runtime's isolated notification delivery path.
        try { onNotification(event); } catch (error) { report(error); }
      },
      onNotificationError: report,
    });
    controls = mountControls({
      container: controlsMount,
      runtime,
      visualState,
      documentImpl,
      onError: report,
      onActivated() {
        return wakeRecognizer.start().then((started) => {
          if (!started && visualState.snapshot.active) visualState.setState("limited");
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
  } catch (error) {
    try { lifecycle?.dispose(); } catch {}
    try { controls?.dispose(); } catch {}
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
    get isDisposed() { return disposed; },
    dispose,
  });
}
