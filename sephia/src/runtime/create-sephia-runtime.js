import { createDomAlertObserver } from "../adapters/dom-alert-observer.js";

/**
 * Runtime lifecycle only. It does not activate automatically and has no
 * persistence, audio, microphone, network, or OTP-control capability.
 */
export function createSephiaRuntime({
  root,
  onNotification,
  MutationObserverImpl,
}) {
  const observer = createDomAlertObserver({
    root,
    onNotification,
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
      active = false;
    },

    dispose() {
      observer.stop();
      active = false;
    },

    get isActive() {
      return active;
    },
  });
}
