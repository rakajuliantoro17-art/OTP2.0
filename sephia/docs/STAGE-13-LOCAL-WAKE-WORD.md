# SEPHIA Stage 13 — On-device Indonesian Wake Word

**Branch:** \`feature/sephia-module\`  
**Scope:** local-only wake phrase \`SEPHIA\`, manually armed from the Panitia control  
**Production:** unchanged; no merge, deployment, Firebase Rules, Moodle, or OTP behavior changes

## Selected implementation

SEPHIA uses the browser's unprefixed Web Speech \`SpeechRecognition\` API only when it exposes the on-device recognition methods. The recognizer must set \`processLocally = true\` and pass \`SpeechRecognition.available({ langs: ["id-ID"], processLocally: true })\`.

If the local Indonesian language pack is downloadable, the browser's \`SpeechRecognition.install()\` is invoked after the Panitia user manually activates SEPHIA. If it is unavailable, installation fails, or the browser lacks the required API, the recognizer fails closed into limited mode. It never switches to server recognition, \`webkitSpeechRecognition\`, a remote endpoint, or an external AI service.

A one-time browser language-pack download may require internet access. The spoken audio and recognition result remain on-device when the browser honors \`processLocally=true\`. This is a browser platform guarantee, not a guarantee against a compromised workstation/browser.

## Wake phrase policy

- Language: \`id-ID\`.
- Exact normalized phrase: \`sephia\`.
- Minimum confidence: \`0.88\`.
- Only final recognition results are considered.
- Prefixes, suffixes, and approximate variants are rejected to reduce false activations.
- No transcript is displayed, logged, persisted, or sent to the host.
- After a wake event, visual listening feedback is shown for 10 seconds; no command parsing or dashboard action is triggered.
- The wake listener is armed only after the Panitia user manually activates SEPHIA.
- The generic TTS announcement does not contain the wake phrase; the recognizer remains armed, and the real workstation trial must check acoustic echo does not create false activations.
- Deactivation, page close, and disposal stop the recognizer and release browser recognition resources.

## Browser compatibility

This capability is optional and requires browser support for the on-device Web Speech API, including \`SpeechRecognition.processLocally\`, static \`available()\`, and static \`install()\`. The older Web Speech recognition path is intentionally not used because it may process audio through a remote service.

The feature requires a secure context and microphone permission. The feature branch's Vercel Permissions-Policy now grants microphone and on-device speech recognition to the same origin only; camera and geolocation remain disabled. This header change is isolated to the feature branch and has not been deployed. It must be verified in Chrome on the actual Panitia workstation. If unsupported, SEPHIA remains usable for visual notifications and local TTS where available, but wake-word listening is disabled.

## Acceptance tests

1. Verify the browser reports on-device \`id-ID\` recognition as available, or successfully installs the language pack.
2. Confirm the recognizer is configured with \`lang="id-ID"\` and \`processLocally=true\`.
3. Say “SEPHIA” repeatedly in the real Panitia room and record false-positive/false-negative rates outside the application; do not store audio in SEPHIA.
4. Confirm unrelated words, low-confidence results, and approximate phrases do not activate the wake state.
5. Confirm browser microphone denial or missing language pack produces limited mode without breaking dashboard alerts.
6. Confirm TTS output does not cause false wake-word activations.
7. Confirm deactivation and page close stop the microphone/recognizer.
8. Confirm no audio/transcript request leaves the workstation.

## References

- MDN, Web Speech API and on-device speech recognition: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
- The browser's on-device API requires a locally available language pack; \`processLocally=true\` must be explicitly set before recognition starts.
