# SEPHIA Stage 16 — Local Voice Diagnostics

**Branch:** \`feature/sephia-module\`  
**Scope:** isolated browser diagnostic page for local Indonesian TTS and on-device wake-word availability  
**Production:** unchanged; no merge, deployment, Firebase Rules, Moodle, or OTP behavior changes

## Page

Open \`/staging/voice-diagnostics.html\` from a loopback server after running \`npm run build\`. The page imports only built local modules from \`dist/\`.

## Diagnostic actions

### TTS

- The page checks the browser/OS voice list without changing the operating-system language.
- The user must click **Uji suara SEPHIA** to speak one fixed synthetic phrase.
- The adapter accepts only an Indonesian \`id-ID\` local voice with a feminine name hint.
- English-only, cloud, male-only, or unknown-gender voice lists are rejected.
- No remote TTS fallback, external audio service, or transcript storage is used.

### Wake word

- The page does not start the microphone on load.
- The user must click **Mulai uji “SEPHIA”**.
- The recognizer requires a secure context and on-device \`id-ID\` language support.
- Only the exact phrase “SEPHIA” is recognized; no command parsing is enabled.
- The user can stop the recognizer manually; \`pagehide\` also disposes it.
- No audio or transcript is persisted or sent to the host application.

## Data and security boundary

- No OTP 2.0, Firebase, Moodle, API, or live student data is loaded.
- The page does not call \`fetch\`, XHR, WebSocket, EventSource, or browser persistent storage.
- The only user data considered is local browser speech capability and the short wake phrase result, held in memory for the page session.
- Browser language-pack installation may require a one-time browser-managed download; this is distinct from streaming audio to a remote recognizer.

## Acceptance

Record Chrome version, Windows version, secure-context status, TTS voice name/language/localService, on-device recognition availability, microphone permission outcome, false positives/false negatives, and observed latency. Do not include audio recordings or transcripts in evidence.

A failed capability is recorded as BLOCKED. Do not bypass the local-only or feminine-voice requirements with cloud voices.

## Limitations

This page proves only what the current browser reports and how it behaves in the diagnostic session. It does not prove browser internals, OS voice privacy guarantees, production host permissions, or real Panitia room acoustics. Actual workstation acceptance remains required.
