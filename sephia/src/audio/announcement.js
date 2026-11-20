export const DEFAULT_ANNOUNCEMENT =
  "Perhatian, Panitia. Ada notifikasi pelanggaran OTP baru. Silakan periksa notifikasinya di dashboard, ya.";

export const WAKE_WORD_ACKNOWLEDGEMENT =
  "Ya, Panitia. SEPHIA siap membantu.";

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

  const stop = () => {
    if (disposed) return;
    activeToken += 1;
    try { adapter.cancel(); } catch (error) {
      try { onError(error); } catch {}
    }
    setSpeaking(false);
  };

  const speakApprovedPhrase = async (phrase) => {
    if (disposed || adapter.available === false) return false;
    const token = ++activeToken;
    try { adapter.cancel(); } catch (error) {
      try { onError(error); } catch {}
      return false;
    }

    setSpeaking(true);
    try {
      await adapter.speak(phrase);
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
  };

  return Object.freeze({
    async announce(event) {
      if (disposed || !event?.eventId ||
          event.eventType !== "violation" || !Number.isSafeInteger(event.violationCount) ||
          event.violationCount < 27 || event.violationCount > 30) return false;
      return speakApprovedPhrase(DEFAULT_ANNOUNCEMENT);
    },

    // Explicit, user-initiated audio check speaks the generic notification phrase.
    test: () => speakApprovedPhrase(DEFAULT_ANNOUNCEMENT),

    // Wake-word response is a separate fixed phrase; no event metadata is accepted.
    acknowledgeWakeWord: () => speakApprovedPhrase(WAKE_WORD_ACKNOWLEDGEMENT),

    // Tier A voice-command replies: aggregate counts only, built by core/voice-commands.js.
    speakStatus: (text) => (
      typeof text === "string" && text.length > 0 && text.length <= 240 &&
      /^[\p{L}\p{N}\s.,:;!?-]+$/u.test(text)
        ? speakApprovedPhrase(text) : Promise.resolve(false)
    ),

    stop,

    dispose() {
      if (disposed) return;
      stop();
      disposed = true;
    },

    get isSpeaking() { return speaking; },
    get isDisposed() { return disposed; },
  });
}
