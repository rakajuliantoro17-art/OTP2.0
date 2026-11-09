export const DEFAULT_ANNOUNCEMENT =
  "Perhatian, Panitia. Ada notifikasi pelanggaran OTP baru. Silakan periksa notifikasinya di dashboard, ya.";

export function createNotificationSpeechController({
  adapter,
  onStateChange = () => {},
  onError = () => {},
}) {
  if (!adapter || typeof adapter.speak !== "function" || typeof adapter.cancel !== "function") {
    throw new TypeError("A local speech adapter with speak() and cancel() is required.");
  }

  let activeToken = 0;
  let speaking = false;
  let disposed = false;

  const setSpeaking = (value) => {
    speaking = value;
    try { onStateChange(value ? "speaking" : "standby"); } catch {}
  };

  return Object.freeze({
    async announce(event) {
      if (disposed || !event?.eventId || !Number.isSafeInteger(event.violationCount) ||
          event.violationCount < 27 || event.violationCount > 30) return false;

      const token = ++activeToken;
      try { adapter.cancel(); } catch (error) {
        try { onError(error); } catch {}
        return false;
      }

      setSpeaking(true);
      try {
        await adapter.speak(DEFAULT_ANNOUNCEMENT);
        if (disposed || token !== activeToken) return false;
        setSpeaking(false);
        return true;
      } catch (error) {
        if (!disposed && token === activeToken) {
          setSpeaking(false);
          try { onError(error); } catch {}
        }
        return false;
      }
    },

    stop() {
      if (disposed) return;
      activeToken += 1;
      try { adapter.cancel(); } catch (error) {
        try { onError(error); } catch {}
      }
      setSpeaking(false);
    },

    dispose() {
      if (disposed) return;
      this.stop?.();
      disposed = true;
    },

    get isSpeaking() { return speaking; },
    get isDisposed() { return disposed; },
  });
}
