# SEPHIA Stage 26 — Neural TTS Controller Integration & Contract Tests

**Status:** integration contract and automated mock tests implemented; hardware/acoustic acceptance remains pending.

## Integration delivered

The existing notification speech controller already provides the correct narrow boundary: it accepts eligible notification metadata but sends only `DEFAULT_ANNOUNCEMENT` to its speech adapter. Stage 26 verifies this boundary against the new Stage 25 local neural adapter.

The integration tests prove:
- eligible synthetic violation metadata (27–30) causes exactly the fixed generic sentence to be synthesized;
- student name and class fields are never passed to synthesis;
- missing IDs, wrong event type, out-of-range counts, and non-integer counts are rejected before synthesis;
- controller STOP cancels in-flight neural playback and the generated audio handle is released;
- controller disposal remains compatible with adapter disposal.

## Runtime wiring decision

The host bridge's existing `createSpeechAdapter` injection seam is retained. The neural adapter is not made the active default because no verified engine/player implementation or approved runtime topology exists yet. The Panitia host now defaults to an unavailable neural adapter (visual-only mode) rather than browser/OS speech synthesis. The explicit WAV adapter remains isolated legacy/test code and is not an approved production voice path.

No guessed localhost URL, LAN endpoint, model download, or cloud fallback is introduced. This prevents a false-positive "integrated" state where the page loads but the neural engine cannot be reached securely.

## Verification boundary

Automated tests use deterministic in-memory mock engine/player implementations. They do not prove:
- acoustic naturalness or adult feminine timbre;
- Indonesian pronunciation quality;
- actual Laras/Pocket TTS inference;
- target Panitia PC latency, CPU, or RAM;
- Chrome HTTPS/CORS/Private Network Access compatibility;
- absence of network traffic from a future engine implementation.

These require the approved runtime topology and physical Panitia workstation. Production remains blocked until those acceptance tests pass.
