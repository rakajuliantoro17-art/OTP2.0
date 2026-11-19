# SEPHIA Stage 39 — Spoken Wake-Word Acknowledgement

**Status:** fixed phrase and end-to-end code path implemented; real Panitia workstation playback remains a manual acceptance gate.

## Approved interaction

When the Panitia user has manually activated SEPHIA and the local microphone recognizer detects the exact wake word **“SEPHIA”**, the avatar becomes visible and SEPHIA speaks:

> “Ya, Panitia. SEPHIA siap membantu.”

The avatar uses its existing speaking state and mouth animation while the local TTS response is playing. After playback ends, the normal listening/standby state resumes.

## Speech boundary

- The wake acknowledgement is a fixed constant. It cannot accept arbitrary text, notification content, student identity, class, OTP, or violation metadata.
- The existing fixed generic violation announcement remains unchanged.
- JavaScript TTS allowlist, Chrome extension bridge, service worker, Rust Native Messaging host, and Laras inference each recognize only the two approved actions.
- Rust inference selects the phrase from the action enum-like allowlist; arbitrary text is never passed over Native Messaging.
- No browser/OS TTS, cloud speech, network service, audio upload, transcript, or audio persistence is introduced.
- Wake-word detection retains its exact-match and cooldown behavior. One wake detection triggers at most one acknowledgement.
- If the local audio bridge is unavailable, SEPHIA shows a visible error and does not claim to have spoken.
- Manual deactivation, page unload, bridge disconnect, or controller disposal cancels pending speech.

## Test coverage

- Controller speaks only the fixed wake phrase and remains silent if the local bridge is unavailable.
- Local neural TTS accepts the wake phrase and rejects arbitrary text.
- Chrome Native Messaging adapter maps the phrase to the dedicated fixed action.
- Extension content script and service worker relay only the two allowlisted actions.
- Native Rust host rejects unknown actions and request fields.
- Existing notification announcement and student-identity privacy tests remain in place.

## Workstation acceptance still required

1. Install the newly built extension and Windows Native Host artifacts from the same successful CI run.
2. Confirm model bundle, licensed model attribution, consented voice reference, and native-host hashes are provisioned.
3. Pair the HTTPS Panitia tab with the extension and manually activate SEPHIA.
4. Click **Uji suara SEPHIA** and confirm the approved generic announcement is audible.
5. Say “SEPHIA” once. Confirm the avatar appears, mouth animation runs while speaking, and the exact acknowledgement is audible.
6. Confirm SEPHIA returns to listening and does not repeat the acknowledgement during the 10-second wake cooldown.
7. Test STOP, tab reload, browser restart, and bridge disconnect. SEPHIA must not auto-activate after reload.

A green CI result is not acoustic acceptance. Production remains blocked until the actual Panitia PC passes these tests and the approved voice is evaluated by listeners.
