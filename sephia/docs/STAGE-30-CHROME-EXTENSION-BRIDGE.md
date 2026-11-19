# SEPHIA Stage 30 — Chrome Extension Bridge

**Status:** extension bridge scaffold and page-side integration implemented; native host and real audio acceptance remain blocked.  
**Target:** Chrome MV3, manually paired with the active HTTPS Panitia tab.

## Implemented

- Manifest V3 extension with only `activeTab`, `scripting`, and `nativeMessaging` permissions. No broad host permissions, persistent extension storage, or externally connectable page API.
- Pairing requires a deliberate click in the extension popup and validates HTTPS, the Panitia path, and the dashboard title.
- Content script is injected only into the active tab after that user gesture. A page reload/navigation drops the pairing; the user must pair again.
- Service worker binds the session to one tab ID and origin, permits one in-flight request, and rate-limits requests.
- Page-to-extension bridge carries only a fixed action plus an ephemeral request correlation ID. The service worker strips that ID before Native Messaging.
- Native host request is always exactly `{version:1, action:"synthesize-approved-announcement"}`.
- Extension response validator rejects extra fields, invalid sample format, oversized audio, invalid base64 framing, and unknown error codes.
- Audio is decoded to an in-memory Web Audio buffer in the content script. The page receives only a completion/error signal, never the audio bytes.
- Cancel, pagehide, navigation, tab close, and native-host disconnect stop playback and tear down the connection.

## Permission and data boundary

- No Firebase, database, Moodle, OTP API, or school-backend permission.
- No arbitrary text, student name, class, violation count, OTP, notification ID, or event ID is sent to the native host.
- No network request, local HTTP endpoint, audio file, transcript, or persistent audio cache is used by the extension.
- Native host output is limited to 700 KiB raw PCM, 24 kHz, mono, signed 16-bit little-endian. This keeps the base64 JSON response under Chrome's 1 MiB host-to-extension message limit.
- Native Messaging host name is fixed to `com.smansasoo.sephia`. Its installation manifest must allowlist only the packaged extension ID.

## Important limitations

1. The native messaging host executable and installer are not yet present. Pairing will fail closed until the host is installed.
2. The Laras library currently writes WAV output to a file. An audited in-memory PCM API is still required before it can be connected to this bridge.
3. AudioContext playback policy, latency, voice quality, CPU/RAM, and disconnect behavior have not been tested on the actual Panitia PC.
4. The extension ID is not finalized until the extension is packaged. The native host allowlist must be generated from that exact ID.
5. A local model bundle and an adult feminine Indonesian reference voice with explicit written consent are not yet provisioned.

## Manual test plan

1. Load the extension unpacked in Chrome developer mode on a test PC.
2. Open the actual HTTPS Panitia dashboard and use the extension popup to pair the active tab.
3. Verify a page reload drops the bridge and SEPHIA remains OFF.
4. Install the native host only after its signed/controlled package is ready; verify exact extension ID allowlisting.
5. Test one approved announcement, cancellation, duplicate suppression, rate limit, navigation, tab close, Chrome restart, missing model, and host crash.
6. Verify no audio files, external network requests, or student data cross the bridge.
7. Run the Stage 28 benchmark and two-listener voice acceptance on the target PC.

## Exit criteria

Stage 30 code is complete when extension protocol tests pass. Production readiness is not achieved until the native host, in-memory Laras runtime, model/voice provenance, installer, and actual workstation acceptance all pass.
