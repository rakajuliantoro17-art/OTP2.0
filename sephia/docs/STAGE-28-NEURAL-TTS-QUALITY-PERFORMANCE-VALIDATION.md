# SEPHIA Stage 28 — Neural TTS Quality & Performance Validation

**Branch:** `feature/sephia-module`  
**Status:** automated in-memory benchmark and evidence gates implemented; real acoustic/workstation acceptance pending.

## Automated harness

`src/audio/neural-tts-acceptance.js` measures:
- first (cold) synthesis latency;
- p95 warm synthesis latency over repeated runs;
- p95 playback-start latency;
- maximum generated audio buffer size;
- maximum observed CPU and memory metrics supplied by the local workstation sampler;
- cancellation/error handling and in-memory audio release.

Default prototype limits:
- 3 iterations (configurable up to 10);
- warm synthesis p95 ≤ 8 seconds;
- playback-start p95 ≤ 1.2 seconds;
- generated audio ≤ 8 MiB;
- CPU ≤ 85%;
- memory ≤ 1,024 MiB;
- each synthesis/playback phase bounded by a 20-second timeout.

The player supplied to the harness must return `{ started, finished, cancel() }`. The harness releases audio through `player.release(audio)` and returns numeric measurements only. It does not save audio or transcripts.

## Manual acceptance gates

The report remains **not accepted** until all are verified:
1. Two independent listeners approve adult feminine timbre, Indonesian pronunciation, intelligibility, natural prosody, warmth, calm pacing, and no audible artifacts.
2. The exact approved phrase is used; no name, class, OTP, violation count, or student data enters synthesis.
3. Network inspection confirms no external request and no unauthenticated LAN endpoint.
4. Model/runtime licenses and reference-voice consent are documented for this operational use.
5. The actual Panitia PC passes Chrome secure-context, activation, cancellation, and resource checks.

A successful mock benchmark is not evidence of real voice quality or target-device performance. CPU/RAM metrics must come from a trusted local sampler on the target workstation; missing metrics fail the technical gate. No audio file or voice sample is committed to this repository.
