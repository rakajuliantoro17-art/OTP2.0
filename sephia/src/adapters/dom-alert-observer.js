import {
  NOTIFICATION_ATTRIBUTES,
  normalizeNotification,
} from "../core/notification-contract.js";

export const ALERT_ROOT_ID = "alertList";
export const ALERT_ITEM_SELECTOR = ".alert-item";

function isElement(node) {
  return Boolean(node && node.nodeType === 1 && typeof node.matches === "function");
}

function readItem(item) {
  return normalizeNotification({
    eventId: item.getAttribute(NOTIFICATION_ATTRIBUTES.eventId),
    eventType: item.getAttribute(NOTIFICATION_ATTRIBUTES.eventType),
    violationCount: item.getAttribute(NOTIFICATION_ATTRIBUTES.violationCount),
    message: item.textContent || "",
  });
}

/**
 * Passive adapter for the one approved host element: #alertList.
 * Does not query the wider document, inspect unrelated dashboard nodes,
 * access Firebase, or replay existing notifications on activation.
 */
export function createDomAlertObserver({
  root,
  onNotification,
  MutationObserverImpl = globalThis.MutationObserver,
}) {
  if (!isElement(root) || root.id !== ALERT_ROOT_ID) {
    throw new TypeError('SEPHIA can observe only the exact "#alertList" element.');
  }
  if (typeof onNotification !== "function") {
    throw new TypeError("onNotification must be a function.");
  }
  if (typeof MutationObserverImpl !== "function") {
    throw new Error("MutationObserver is unavailable.");
  }

  const seenEventIds = new Set();
  let observer = null;
  let active = false;

  const emitItem = (item) => {
    if (!isElement(item) || !item.matches(ALERT_ITEM_SELECTOR) || !root.contains(item)) return;
    const event = readItem(item);
    if (!event || seenEventIds.has(event.eventId)) return;

    // Mark before callback so re-entrant DOM changes cannot announce twice.
    seenEventIds.add(event.eventId);
    onNotification(event);
  };

  const inspectNode = (node) => {
    if (!isElement(node)) return;

    if (node.matches(ALERT_ITEM_SELECTOR)) emitItem(node);
    else if (typeof node.closest === "function") emitItem(node.closest(ALERT_ITEM_SELECTOR));

    // An inserted wrapper may contain one or more alert items.
    if (typeof node.querySelectorAll === "function") {
      node.querySelectorAll(ALERT_ITEM_SELECTOR).forEach(emitItem);
    }
  };

  return Object.freeze({
    start() {
      if (active) return;
      active = true;

      observer = new MutationObserverImpl((records) => {
        for (const record of records) {
          for (const node of record.addedNodes || []) inspectNode(node);

          // Handles a host renderer that inserts the shell first and fills
          // metadata/text afterwards. Attribute scope remains narrowly filtered.
          if (isElement(record.target)) {
            if (record.target.matches(ALERT_ITEM_SELECTOR)) emitItem(record.target);
            else if (typeof record.target.closest === "function") {
              emitItem(record.target.closest(ALERT_ITEM_SELECTOR));
            }
          }
        }
      });

      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: Object.values(NOTIFICATION_ATTRIBUTES),
      });
    },

    stop() {
      observer?.disconnect();
      observer = null;
      active = false;
      seenEventIds.clear();
    },

    get isActive() {
      return active;
    },
  });
}
