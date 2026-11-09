/**
 * Canonical notification contract for SEPHIA.
 * This module is pure: no DOM, network, storage, audio, or OTP dependencies.
 */

export const MIN_QUALIFYING_VIOLATION_COUNT = 27;
export const MAX_EXPECTED_VIOLATION_COUNT = 30;

export const NOTIFICATION_ATTRIBUTES = Object.freeze({
  eventId: "data-sephia-event-id",
  eventType: "data-sephia-event-type",
  violationCount: "data-sephia-violation-count",
});

/**
 * Validate and normalize metadata supplied by the OTP host renderer.
 * A DOM attribute is not intrinsically trustworthy: the host must populate
 * it only from the authoritative server-originated alert payload.
 */
export function normalizeNotification({ eventId, eventType = null, violationCount, message }) {
  if (typeof eventId !== "string" || !eventId.trim()) return null;
  if (typeof violationCount !== "string" && typeof violationCount !== "number") return null;

  const rawCount = String(violationCount);
  if (!/^\d+$/.test(rawCount)) return null;

  const count = Number(rawCount);
  if (!Number.isSafeInteger(count) || count < MIN_QUALIFYING_VIOLATION_COUNT || count > MAX_EXPECTED_VIOLATION_COUNT) return null;
  if (typeof message !== "string" || !message.trim()) return null;

  return Object.freeze({
    eventId: eventId.trim(),
    eventType: typeof eventType === "string" && eventType.trim() ? eventType.trim() : null,
    violationCount: count,
    message: message.trim(),
  });
}
