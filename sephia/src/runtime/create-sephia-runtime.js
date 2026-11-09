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
  const deliverNotification = (event) => {
    try { onNotification?.(event); } catch (error) {
      try { onNotificationError(error); } catch {}
    }
    try {
      const result = speechController?.announce(event);
      if (result && typeof result.catch === "function") {
        result.catch((error) => { try { onNotificationError(error); } catch {} });
      }
    } catch (error) {
      try { onNotificationError(error); } catch {}
    }
  };

  const observer = createDomAlertObserver({
    root,
    onNotification: deliverNotification,
    MutationObserverImpl,
  });

  let active = false;

  return Object.freeze({
    activate() {
      if (active) return;
      observer.start();
      active = true;
    },

    deactivate() {
      if (!active) return;
      observer.stop();
      try { speechController?.stop(); } catch {}
      active = false;
    },

    dispose() {
      observer.stop();
      try { speechController?.dispose(); } catch {}
      active = false;
    },

    get isActive() {
      return active;
    },
  });
}
