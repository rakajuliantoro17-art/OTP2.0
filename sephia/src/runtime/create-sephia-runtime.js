import { createDomAlertObserver } from "../adapters/dom-alert-observer.js";

/**
 * Runtime lifecycle. Optional speech is injected through a narrow adapter;
 * no provider, microphone, network, persistence, or OTP-control capability is bundled.
 */
export function createSephiaRuntime({
  root,
  onNotification,
  MutationObserverImpl,
  speechController = null,
  onNotificationError = () => {},
}) {
  const reportError = (error) => {
    try { onNotificationError(error); } catch {}
  };

  const deliverNotification = (event) => {
    try { onNotification?.(event); } catch (error) {
      reportError(error);
    }
    try {
      const result = speechController?.announce(event);
      if (result && typeof result.catch === "function") {
        result.catch(reportError);
      }
    } catch (error) {
      reportError(error);
    }
  };

  const observer = createDomAlertObserver({
    root,
    onNotification: deliverNotification,
    MutationObserverImpl,
  });

  let active = false;
  let disposed = false;

  return Object.freeze({
    activate() {
      if (disposed || active) return false;
      // Do not set active until the observer successfully starts.
      observer.start();
      active = true;
      return true;
    },

    deactivate() {
      if (!active) return false;
      // A broken observer or speech adapter must not strand the runtime in
      // an active state or prevent the other cleanup operation from running.
      try { observer.stop(); } catch (error) { reportError(error); }
      try { speechController?.stop(); } catch (error) { reportError(error); }
      active = false;
      return true;
    },

    dispose() {
      if (disposed) return;
      try { observer.stop(); } catch (error) { reportError(error); }
      try { speechController?.dispose(); } catch (error) { reportError(error); }
      active = false;
      disposed = true;
    },

    get isActive() {
      return active;
    },
    get isDisposed() {
      return disposed;
    },
  });
}
