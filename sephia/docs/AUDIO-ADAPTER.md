# SEPHIA Audio Adapter — Stage 3

## Status

The notification speech controller and its tests are implemented. A concrete browser audio provider is intentionally **not selected or enabled**.

## Why the provider is not bundled

The approved privacy boundary prohibits external audio processing. Browser speech APIs do not guarantee that every installed voice is local; some platforms may use network-backed voices. Microphone capture and local wake-word recognition also require device/browser verification and a trusted user gesture. Selecting an unverified provider would make an unsupported privacy claim.

## Adapter contract

Provide an adapter with:
- `speak(text): Promise<void>` — resolve when the utterance finishes; reject on unavailable/blocked/failed speech.
- `cancel(): void` — immediately stop the current utterance.

The adapter must be proven local on the target workstation. It must not upload audio, text, transcripts, or notification content. It must not retain recordings or transcript history.

## Controller behavior

- Accept only normalized notification events with stable ID and integer count 27–30.
- Use only the approved generic announcement; do not speak names, classes, or violation counts.
- Newest event cancels the previous utterance; no queue and no overlap.
- Stop/dispose cancels pending speech.
- Provider errors are contained and reported through the supplied error callback.
- No automatic retry, cloud fallback, recording, microphone capture, or wake-word listener.

## Microphone and wake phrase

Not implemented in this stage. A browser-only local wake-word model has not been selected or benchmarked. Microphone permission must only be requested after an explicit user gesture and only after a local model is approved. No permission prompt is triggered by module import or page load.

## Acceptance gate

Before selecting a concrete adapter:
1. Confirm target browser, OS, and workstation URL/security context.
2. Verify the chosen voice is genuinely local with network disabled.
3. Verify no outbound audio/text requests occur.
4. Test autoplay/user-gesture behavior and cancellation.
5. Measure speech start latency and CPU/memory use.
6. Verify failure produces visual-only fallback and leaves Panitia alerts untouched.

Until those checks pass, Stage 3 is closed as a controller/API milestone, not as an audio-enabled release.
