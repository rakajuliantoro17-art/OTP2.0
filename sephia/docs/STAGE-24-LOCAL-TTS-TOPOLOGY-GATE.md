# SEPHIA Stage 24 — Local Neural TTS Runtime Topology Gate

**Branch:** `feature/sephia-module`  
**Status:** design gate completed; runtime integration intentionally blocked pending target-workstation verification.  
**Decision carried forward:** Stage 23 local neural TTS remains the only approved final voice architecture.

## Findings from the current feature branch

The Panitia host bridge currently selects:
- the fixed-WAV adapter when `announcementAssetUrl` is supplied; or
- the browser/OS `speechSynthesis` adapter when it is omitted.

Both paths are incompatible with the owner's Stage 23 final-voice decision as production defaults. The browser adapter is diagnostic only, and the WAV adapter is isolated legacy/test code. The host bridge has a speech-adapter injection point, which is the intended seam for a future local neural adapter.

This stage records the integration boundary; it does not silently promote either legacy path.

## Topology options assessed

### A. Localhost sidecar on the Panitia PC

A local inference service bound only to loopback avoids exposing the model to the school LAN. However, a dashboard served from a different HTTPS origin may be blocked by mixed-content rules, CORS, Private Network Access, or browser policy. A loopback service also needs origin validation and an authenticated, short-lived local pairing mechanism; loopback binding alone is not authentication.

**Status:** not approved until tested from the actual Chrome Panitia workstation and the actual dashboard origin.

### B. School-LAN inference service

A shared inference server could simplify model installation and maintenance, but it expands the attack surface. It must not bind an unauthenticated TTS endpoint to `0.0.0.0`. It would require HTTPS with a trusted certificate, strict origin allowlisting, authentication, rate/size limits, network segmentation, and operational ownership.

**Status:** not approved. No service may be exposed on the school LAN during this stage.

### C. Embedded browser inference

An embedded runtime could avoid a separate HTTP service, but browser support, model loading, memory footprint, CPU latency, and model packaging are not yet verified for the Panitia PC. It must not download model weights dynamically during an alert.

**Status:** research candidate only; no runtime or model bundle is committed.

## Required adapter contract

The production adapter must preserve the existing speech-controller contract:
- `speak(approvedText)` — accept only the exact generic SEPHIA announcement.
- `cancel()` — cancel pending inference and playback immediately.
- `dispose()` — release runtime, audio buffers, listeners, and temporary resources.
- `available` — reflect verified local engine readiness, not merely the existence of browser speech APIs.

The adapter must:
- synthesize only the approved generic announcement;
- reject arbitrary text and all student-identifying content;
- impose a bounded timeout, output-size limit, and single-operation concurrency;
- keep generated audio in memory only and release it after playback;
- make no cloud, telemetry, analytics, or external audio requests;
- fail closed to visual-only mode when the engine is unavailable;
- never fall back automatically to browser speech or prerecorded WAV.

## Integration rules

1. Keep `createSpeechAdapter` as the only host injection seam.
2. Do not configure `announcementAssetUrl` for production.
3. Do not wire a guessed localhost URL, public endpoint, or unauthenticated LAN endpoint.
4. Do not add a model download to page startup or alert handling.
5. Do not change OTP, Firebase, Moodle, notification eligibility, deduplication, or page activation behavior.
6. Keep all changes on `feature/sephia-module`; no merge or deployment.

## Evidence required to pass this gate

The following must be collected on the actual Panitia PC, using Chrome and the real dashboard origin:
- exact dashboard origin and protocol (HTTPS or HTTP);
- whether the dashboard is same-origin with the proposed inference runtime;
- Chrome mixed-content, CORS, and Private Network Access behavior for the selected topology;
- CPU, RAM, cold-start, warm inference, and playback-start measurements for the exact approved announcement;
- proof that synthesis causes no external network request;
- cancellation and memory-release behavior after OFF, pagehide, and disposal;
- documented model/runtime license and voice-reference consent.

## Exit criteria

Stage 25 may implement the adapter only after one topology passes the security and compatibility checks above. Until then, the neural TTS architecture is approved, but no engine, voice identity, endpoint, or production runtime is approved. The Panitia dashboard remains the source of truth; SEPHIA must not compromise its operation when speech is unavailable.

## Stage 25–26 implementation follow-through

The adapter contract and deterministic controller tests are now implemented. Until an approved local engine/player is provisioned, the Panitia host defaults to a fail-closed visual-only adapter. Browser/OS speech synthesis is no longer the host fallback. The legacy WAV branch is retained only for compatibility tests and must not be configured for production.

The topology gate itself remains open for real runtime activation: no local service endpoint, engine, model package, voice reference, or Panitia workstation benchmark has been approved.
