# SEPHIA Stage 38 — Audio Readiness Diagnostics

**Status:** dashboard diagnostics and manual speaker-test control implemented. Target Panitia PC acceptance remains outstanding.

## What changed

- The Panitia control now displays bridge, wake-word, and audio readiness states instead of relying only on a colored status orb.
- The control explains when the Chrome extension is not paired, when Native Messaging disconnects, when Chrome audio unlock fails, and when local wake-word support is unavailable.
- A **Uji suara SEPHIA** action is available only after the extension bridge is connected and Web Audio has been unlocked by the manual activation click.
- The speaker test speaks only the already-approved generic sentence:
  “Perhatian, Panitia. Ada notifikasi pelanggaran OTP baru. Silakan periksa notifikasinya di dashboard, ya.”
- The test never reads notification text, student name, class, or OTP.
- Stage 39 subsequently adds a fixed spoken wake acknowledgement: “Ya, Panitia. SEPHIA siap membantu.” See the Stage 39 document for its allowlist and acceptance conditions.

## Required target-PC sequence

1. Serve the Panitia page over HTTPS. The local wake-word implementation requires a secure context.
2. Install the unpacked extension from the exact CI artifact and keep its folder in a stable path.
3. Install the Windows Native Messaging host built with `--features inference`, provision the pinned local model, and install a legally consented adult feminine Indonesian WAV reference plus consent/license evidence.
4. Restart Chrome.
5. Open the Panitia dashboard and use the extension popup to **Hubungkan tab Panitia**. The popup must report successful pairing only after the Native Host model-readiness handshake.
6. Click **Aktifkan SEPHIA**. Confirm the status says the microphone is active and the local speech bridge/audio are ready.
7. Open the control menu and click **Uji suara SEPHIA**. Confirm the approved sentence is audible from the intended speaker.
8. Say “SEPHIA” and confirm the avatar appears, mouth animation runs, and the approved wake acknowledgement is audible.
9. Trigger one synthetic eligible notification in a non-production fixture. Confirm the separate generic notification announcement is spoken once.
10. Repeat after Chrome restart, tab reload, idle period, and temporary speaker disconnection.

## Interpreting failures

- **“Belum terhubung”**: the Chrome extension has not paired the active Panitia tab.
- **“Mesin neural lokal belum siap” / popup pairing error**: Native Messaging host registration, extension ID, model bundle, voice reference, or evidence config is missing/invalid.
- **“Wake word belum siap”**: Chrome does not expose the required on-device SpeechRecognition API, the local id-ID pack is unavailable, or microphone permission is denied.
- **“Audio Chrome menolak aktivasi”**: click Activate again after confirming the extension is paired and not blocked by Chrome policy.
- **Bridge ready but no audible test**: inspect Windows output device, application volume mixer, headset routing, and the Native Host synthesis result. Do not bypass the local-only audio path with cloud TTS.

## Production gate

A passing GitHub Actions run does not complete these checks. Keep production blocked until the target Panitia PC completes the above sequence, numeric benchmark, two-listener voice approval, consent/license review, and privacy/network inspection.

No merge or production deployment is authorized by this stage.
