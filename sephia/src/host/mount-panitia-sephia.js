import { createSephiaRuntime } from "../runtime/create-sephia-runtime.js";
import { bindPageLifecycle } from "../runtime/bind-page-lifecycle.js";
import { createVisualState } from "../visual/visual-state.js";
import { mountSephiaControls } from "../visual/mount-sephia-controls.js";

/**
 * Opt-in host bridge for the Panitia dashboard.
 * Resolves only the two explicit mount points; never scans the document.
 * No login/session identity is assumed. Audio remains disabled until a
 * verified local-only speech adapter is supplied in a separate release gate.
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
  let runtime;
  let controls;
  let lifecycle;
  let disposed = false;

  const report = (error) => {
    try { onError(error); } catch {}
  };

  try {
    visualState = createState();
    runtime = createRuntime({
      root: alertRoot,
      onNotification(event) {
        // Optional integration seam. Production defaults to a no-op; no
        // notification detail is copied, persisted, or spoken by this bridge.
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
    });
    lifecycle = bindLifecycle({ windowImpl, runtime, visualState });
  } catch (error) {
    try { lifecycle?.dispose(); } catch {}
    try { controls?.dispose(); } catch {}
    try { runtime?.dispose(); } catch {}
    try { visualState?.dispose(); } catch {}
    report(error);
    throw error;
  }

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try { lifecycle?.dispose(); } catch (error) { report(error); }
    try { runtime?.dispose(); } catch (error) { report(error); }
    try { controls?.dispose(); } catch (error) { report(error); }
    try { visualState?.dispose(); } catch (error) { report(error); }
    windowImpl.removeEventListener?.("pagehide", dispose);
  };

  windowImpl.addEventListener("pagehide", dispose, { once: true });

  return Object.freeze({
    runtime,
    visualState,
    controls,
    get isDisposed() { return disposed; },
    dispose,
  });
}
