/**
 * Compatibility entry point.
 * New code should import from core/, adapters/, or runtime/ directly.
 */
export {
  MIN_QUALIFYING_VIOLATION_COUNT as SEPHIA_MIN_VIOLATION_COUNT,
  normalizeNotification,
} from "./core/notification-contract.js";
export {
  ALERT_ITEM_SELECTOR as SEPHIA_ALERT_SELECTOR,
  createDomAlertObserver as createNotificationReader,
} from "./adapters/dom-alert-observer.js";
export { createSephiaRuntime } from "./runtime/create-sephia-runtime.js";
