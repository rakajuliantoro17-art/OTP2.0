/**
 * Bind SEPHIA cleanup to the lifetime of the dashboard document.
 * This is a page-lifecycle boundary, NOT user authentication or URL protection.
 * The dashboard must still require manual SEPHIA activation after every load.
 */
export function bindPageLifecycle({ windowImpl = globalThis.window, runtime, visualState }) {
  if (!windowImpl?.addEventListener || !windowImpl?.removeEventListener) {
    throw new TypeError("A window-like lifecycle target is required.");
  }
  if (!runtime || typeof runtime.deactivate !== "function") {
    throw new TypeError("A SEPHIA runtime is required.");
  }
  if (!visualState || typeof visualState.deactivate !== "function") {
    throw new TypeError("A SEPHIA visual state controller is required.");
  }

  let disposed = false;
  const shutdown = () => {
    try { runtime.deactivate(); } catch {}
    try { visualState.deactivate(); } catch {}
  };
  const onPageExit = () => shutdown();

  windowImpl.addEventListener("pagehide", onPageExit);
  windowImpl.addEventListener("beforeunload", onPageExit);

  return Object.freeze({
    shutdown,
    dispose() {
      if (disposed) return;
      disposed = true;
      windowImpl.removeEventListener("pagehide", onPageExit);
      windowImpl.removeEventListener("beforeunload", onPageExit);
      shutdown();
    },
  });
}
