# SEPHIA Stage 24 — Local Neural TTS Runtime Topology Gate

**Branch:** feature/sephia-module  
**Status:** design gate completed; runtime integration intentionally blocked pending target-workstation verification.  
**Decision carried forward:** Stage 23 local neural TTS remains the only approved final voice architecture.

## Findings

The Panitia host bridge uses a fail-closed visual-only adapter by default. Browser/OS speech is diagnostic only; WAV is isolated legacy/test code. The host bridge has a speech-adapter injection point for a future local neural adapter.

## Topology options

### A. Localhost sidecar on the Panitia PC

A loopback inference service avoids exposing the model to the school LAN. However, a dashboard served from a different HTTPS origin may be blocked by mixed-content rules, CORS, Private Network Access, or browser policy. Loopback binding alone is not authentication.

**Status:** not approved until tested from the actual Chrome Panitia workstation and actual dashboard origin.

### B. School-LAN inference service

A shared inference server expands the attack surface. It must not bind an unauthenticated TTS endpoint to 0.0.0.0. It would require HTTPS with a trusted certificate, strict origin allowlisting, authentication, rate/size limits, network segmentation, and operational ownership.

**Status:** not approved. No service may be exposed on the school LAN.

### C. Embedded browser inference

Browser support, model loading, memory footprint, CPU latency, and model packaging are not verified for the Panitia PC. Model weights must never download dynamically during an alert.

**Status:** research candidate only; no runtime or model bundle is committed.

## Required adapter contract

- speak(approvedText) accepts only the exact generic SEPHIA announcement.
- cancel() cancels pending inference and playback immediately.
- dispose() releases runtime, audio buffers, listeners, and temporary resources.
- available reflects verified local engine readiness.
- Synthesis is local-only, bounded, single-operation, and in-memory.
- No cloud, telemetry, analytics, external audio requests, persistent audio, or transcript.
- Fail closed to visual-only mode; never fall back automatically to browser speech or WAV.

## Integration rules

1. Keep createSpeechAdapter as the only host injection seam.
2. Do not configure announcementAssetUrl for production.
3. Do not wire a guessed localhost URL, public endpoint, or unauthenticated LAN endpoint.
4. Do not add a model download to page startup or alert handling.
5. Do not change OTP, Firebase, Moodle, notification eligibility, deduplication, or page activation behavior.
6. Keep all changes on feature/sephia-module; no merge or deployment.

## Stage 25–28 follow-through

- Stages 25–26 implemented the adapter contract and deterministic controller tests.
- Stage 27 adds a manifest qualification wrapper for the offline Laras/Pocket candidate. It requires pinned model and voice-reference hashes, license evidence, explicit consent evidence, local-only runtime declaration, and bounded in-memory audio output. It does not provision model weights or start a service.
- Stage 28 adds a deterministic acceptance harness for cold/warm synthesis, playback start, CPU/RAM, and audio-buffer limits. Acoustic, network, license, and target-workstation reviews remain mandatory manual gates.
- No endpoint, engine, model package, voice reference, or Panitia workstation benchmark has been approved. Host remains visual-only until evidence passes.
