# SEPHIA Stage 18 — Local Audio Playback Adapter

**Branch:** `feature/sephia-module`  
**Status:** adapter implemented and covered by deterministic tests; not yet wired as production voice  
**Scope:** fixed approved phrase, bundled same-origin audio, cancellation and disposal  
**Safety:** no remote speech service, no dynamic notification text, no OTP/Firebase/Moodle changes

## Decision

The production voice path for SEPHIA is a pre-approved audio file because the announcement is fixed. Runtime neural synthesis is not required. Stage 18 implements the playback adapter contract without pretending that a voice asset already exists.

## Implementation

- New module: `src/audio/local-audio-announcement.js`.
- Exact-text allowlist: only the approved generic announcement can be played.
- Default future asset path: `/sephia/assets/sephia-announcement.wav`.
- Remote, protocol-relative, query-string, and fragment asset paths are rejected.
- The adapter uses the browser Audio element and same-origin static asset playback only.
- `cancel()` pauses playback, resets position, removes event handlers, and settles the pending operation.
- `dispose()` releases the audio source and prevents later playback.
- Autoplay rejection and media errors are surfaced to the existing SEPHIA error boundary.
- No audio is recorded, uploaded, synthesized, cached in application storage, or transcribed by this module.

## Integration status

Stage 19 adds an explicit `announcementAssetUrl` host option. If it is omitted (the default), the Panitia bridge continues to use the strict local Indonesian browser TTS adapter for diagnostics. If a same-origin bundled WAV path is supplied, the host selects this adapter. The option remains unset in the production host until a real approved audio asset has been supplied and reviewed; switching it on before the WAV exists would make every announcement fail.

## Automated tests

The Stage 18 suite covers:
1. Exact announcement text enforcement.
2. Same-origin bundled asset path.
3. Successful playback completion.
4. Cancellation and pending-promise settlement.
5. Autoplay rejection.
6. Rejection of remote and protocol-relative assets.

## Required production asset

A valid audio file does not yet exist in the repository. The final asset must:
- contain only the approved announcement;
- be recorded by a consenting adult speaker or rendered using a model/runtime/data stack with verified reuse rights;
- meet the adult feminine Indonesian voice specification;
- be listened to by at least two reviewers;
- be tested on the target Panitia PC speakers;
- be checked for clipping, noise, loudness, pronunciation, natural prosody, and repeatability;
- have a recorded SHA-256, duration, sample rate, channel count, source provenance, and license/consent record.

The expected asset path is `sephia/assets/sephia-announcement.wav`. Do not create a fake or silent placeholder and do not mark this gate complete without the real asset.

## Release gates still open

- Approved Indonesian feminine audio asset and workstation audition.
- Final semi-realistic adult feminine avatar artwork; the current CSS face remains a placeholder.
- Chrome on-device wake-word acceptance on the Panitia PC.
- Live Panitia staging acceptance, including microphone permission and secure-context checks.
- Complete production build and Vercel preview/production configuration verification.

## Non-claims

This stage does not prove voice naturalness, actual microphone support, audible playback on the Panitia PC, or production readiness. It adds a tested adapter and makes the missing asset explicit.
