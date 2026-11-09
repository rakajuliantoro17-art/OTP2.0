/**
 * SEPHIA passive notification reader.
 *
 * This module is deliberately isolated and has no Firebase/API, OTP, audio,
 * microphone, storage, or dashboard-control dependencies.
 */

export const SEPHIA_ALERT_SELECTOR = ".alert-item";
export const SEPHIA_MIN_VIOLATION_COUNT = 27;

const EVENT_ID_ATTRIBUTE = "data-sephia-event-id";
const EVENT_TYPE_ATTRIBUTE = "data-sephia-event-type";
const VIOLATION_COUNT_ATTRIBUTE = "data-sephia-violation-count";

/**
 * Convert a host-rendered alert item into a strictly validated SEPHIA event.
 * Returns null unless all required trusted metadata is present.
 */
export function readQualifyingNotification(item) {
  if (!(item instanceof Element)) return null;
  if (!item.matches(SEPHIA_ALERT_SELECTOR)) return null;

  const eventId = item.getAttribute(EVENT_ID_ATTRIBUTE)?.trim();
  const rawCount = item.getAttribute(VIOLATION_COUNT_ATTRIBUTE);
  const visibleMessage = item.textContent?.trim() ?? "";

  if (!eventId || !rawCount || !visibleMessage) return null;

  // Reject partial numbers, decimals, signs, whitespace, and non-numeric values.
  if (!/^\d+$/.test(rawCount)) return null;

  const violationCount = Number(rawCount);
  if (!Number.isSafeInteger(violationCount)) return null;
  if (violationCount < SEPHIA_MIN_VIOLATION_COUNT) return null;

  return Object.freeze({
    eventId,
    eventType: item.getAttribute(EVENT_TYPE_ATTRIBUTE)?.trim() || null,
    violationCount,
    message: visibleMessage,
  });
}

/**
 * Observe only the explicitly supplied alert list.
 *
 * Existing items are intentionally not scanned on start: SEPHIA handles only
 * notifications added/updated after manual activation, never historical backlog.
 * The caller must pass the exact #alertList element.
 */
export function createNotificationReader({
  root,
  onNotification,
  MutationObserverImpl = globalThis.MutationObserver,
}) {
  if (!(root instanceof Element) || root.id !== "alertList") {
    throw new TypeError('SEPHIA requires the exact "#alertList" root element.');
  }
  if (typeof onNotification !== "function") {
    throw new TypeError("onNotification must be a function.");
  }
  if (typeof MutationObserverImpl !== "function") {
    throw new Error("MutationObserver is unavailable in this browser.");
  }

  const announcedIds = new Set();
  let observer = null;
  let active = false;

  const inspect = (candidate) => {
    if (!(candidate instanceof Element)) return;
    const item = candidate.matches(SEPHIA_ALERT_SELECTOR)
      ? candidate
      : candidate.closest(SEPHIA_ALERT_SELECTOR);

    if (!item || !root.contains(item)) return;

    const notification = readQualifyingNotification(item);
    if (!notification || announcedIds.has(notification.eventId)) return;

    announcedIds.add(notification.eventId);
    onNotification(notification);
  };

  return Object.freeze({
    start() {
      if (active) return;
      active = true;

      observer = new MutationObserverImpl((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) inspect(node);
          // Covers renderers that append the alert shell before its message.
          if (record.target instanceof Element) inspect(record.target);
        }
      });

      observer.observe(root, { childList: true, subtree: true });
    },

    stop() {
      if (observer) observer.disconnect();
      observer = null;
      active = false;
      announcedIds.clear();
    },

    get isActive() {
      return active;
    },
  });
}
