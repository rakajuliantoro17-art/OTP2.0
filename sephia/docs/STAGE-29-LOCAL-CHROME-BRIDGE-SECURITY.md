# SEPHIA Stage 29 — Local Chrome Bridge Security Decision

**Branch:** `feature/sephia-module`  
**Status:** architecture decision recorded; implementation and Panitia-PC validation remain blocked.  
**Target:** Chrome on the Panitia workstation, Windows-first packaging unless the actual workstation proves otherwise.

## Decision

Do not connect the hosted Panitia page to a localhost or school-LAN HTTP TTS endpoint. Use a narrowly scoped Chrome extension plus a Chrome Native Messaging host for the local neural runtime.

Reasons:
- No TCP listener, LAN port, CORS wildcard, or unauthenticated HTTP service is needed.
- Chrome launches the native host and exchanges framed JSON over stdin/stdout.
- The native host can enforce an exact request schema and synthesize only one fixed generic announcement.
- The extension can be installed separately from the Panitia web deployment. No OTP/Firebase/Moodle behavior needs to change.

This is a transport decision, not proof that the candidate model or workstation is production-ready.

## Trust boundaries

1. **Panitia page:** continues to observe only the existing `#alertList` eligibility contract. It must never send student name, class, OTP, violation count, or notification text to the extension.
2. **Content script:** runs only after explicit extension connection to the active Panitia tab. It accepts one fixed action and ignores arbitrary text, URLs, identifiers, or binary payloads from the page.
3. **Extension service worker:** owns the Native Messaging connection. It rate-limits requests, validates response schema/size, and forwards only in-memory audio to the extension audio context.
4. **Native Messaging host:** accepts only `{version:1, action:"synthesize-approved-announcement"}`. It ignores/rejects unknown keys and actions. It does not accept caller-supplied speech text.
5. **Local neural runtime:** receives only the compiled-in approved phrase. Model and voice reference are pre-provisioned, checksum-pinned, license-reviewed, and loaded locally.
6. **Audio playback:** uses an in-memory PCM/WAV buffer. Release buffer and object URL immediately after playback, cancellation, tab close, or extension disconnect.

## Native Messaging protocol constraints

The strict request/response schema is stored at `native-messaging/protocol.schema.json`. The request has only `version` and `action`; it contains no text, event ID, student identity, or file path. The success response is mono 24 kHz PCM16 with a bounded base64 payload. The schema is checked by Stage 29 regression tests.


Chrome's Native Messaging protocol uses UTF-8 JSON framed by a 32-bit message length over stdin/stdout. The native host receives the caller extension origin as its first argument. Chrome documents a 1 MiB maximum message from the native host and a 64 MiB maximum message to the host.

Therefore:
- The audio response must remain below 700 KiB including JSON/base64 overhead; otherwise the host rejects it.
- The native host writes protocol bytes only to stdout. Diagnostics go to stderr and must not include audio, student data, or text payloads.
- Host manifest `allowed_origins` must contain exactly the packaged SEPHIA extension ID, with no wildcard.
- The host independently checks the caller origin against its configured extension ID.
- No secrets, student data, event IDs, or user-supplied text are sent to the native host.

Native Messaging is not itself a security boundary against other software running locally. Its host must therefore expose only the one fixed synthesis operation and no file, shell, network, OTP, or dashboard-control commands.

## Required host behavior

- Accept exactly one request schema and a strict maximum input size.
- Rate limit: one successful synthesis request per 2 seconds; reject concurrent synthesis.
- Fixed phrase is compiled into the host; no request can override it.
- Output only PCM/WAV bytes and fixed metadata (sample rate, duration); no transcript.
- No network, no filesystem audio output, no cache, no model download, no telemetry.
- Cancel and dispose inference immediately on disconnect or stop.
- Hard limits: audio <= 700 KiB, sample rate 16–48 kHz, duration <= 15 seconds.
- Fail closed to visual-only mode on missing model, invalid hash, timeout, invalid audio, or host failure.

## Critical dependency: in-memory Laras API

Stage 32 resolves the file-writing concern by calling the pinned public `laras::onnx::Engine::synthesize` API directly. It receives `Vec<f32>` samples and converts them to bounded PCM16 bytes in memory. It does not call `Native::synth_to(..., out: &Path)`, the Laras HTTP server, or the desktop wrapper's temporary WAV writer.

This path is pinned to Laras commit `e4ab05ca53a8cbf749405de5b1ac902b76880768`. The model files are verified individually against the committed provenance manifest; the voice reference and native binary are SHA-256 pinned at installation. The inference feature removes inherited Laras dump/trace environment variables before engine initialization. Actual runtime behavior still requires file/process inspection on the Panitia PC. Attribution is documented in `native-host/THIRD-PARTY-NOTICES.md`.

## Manual acceptance gates

- Confirm the actual Panitia PC OS, Chrome version, CPU, and RAM.
- Install the extension and native host using a signed/controlled installer; verify exact extension ID and host allowlist.
- Verify extension connection requires explicit user action and does not auto-enable SEPHIA after page reload.
- Inspect process/network activity: no external TTS, no localhost/LAN listener, no audio files, and no persistent cache.
- Run the Stage 28 benchmark on the target workstation with real CPU/RAM sampling.
- Two independent listeners approve adult feminine Indonesian voice quality and exact approved phrase.
- Confirm cancel, page close, extension disconnect, Chrome restart, model failure, and timeout all degrade to visual-only without affecting OTP dashboard.

## Non-goals

- No direct Firebase, database, API, Moodle, or OTP access.
- No changes to OTP eligibility, generation, validation, freeze, reset, or unlock.
- No student identity or violation detail spoken.
- No cloud TTS, external speech processing, or LAN TTS server.
- No merge or production deployment without explicit approval.

## Stage 29 exit criteria

Stage 29 is complete only when the Native Messaging extension/host contract is implemented, protocol tests pass, the in-memory Laras adapter is available, and Windows packaging is reproducible. Actual production acceptance still requires the Panitia PC and human voice review.
