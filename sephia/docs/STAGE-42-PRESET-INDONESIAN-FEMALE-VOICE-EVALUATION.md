# SEPHIA Stage 42 — Preset Indonesian Female Voice Evaluation

**Status:** candidate evaluation decision; not a production engine approval.  
**Branch:** `feature/sephia-module`.

## User-approved voice target

- Adult feminine voice speaking Indonesian (`id-ID`).
- Soft-spoken, gentle, warm, calm, natural, and clearly articulated.
- Slow-to-moderate cadence.
- Original synthetic persona only; do not imitate or clone a public figure.
- No user WAV upload is required for the selected preset-voice path.

## Architecture correction

Stages 23, 27, and 33 documented a Pocket TTS/Laras path that requires a voice-reference WAV for voice cloning. That path does not satisfy the user's current requirement for a built-in licensed synthetic persona without uploading a recording. Do not install a downloaded public-figure recording or silently substitute a voice reference.

## Candidate for evaluation

ArboTTS upstream documentation describes an Indonesian/English local CPU TTS runtime and lists a female persona named **Maya**, characterized by the project as a calm storyteller with gentle, relaxed, soft cadence. It also lists female personas Arba and Sita. The upstream repository advertises MIT licensing for its project code.

Candidate reference: https://github.com/ARBO-TEAM/arboTTS

This is a candidate, not an approval. Before integration, verify:
1. The exact downloadable model and persona assets include Maya for the selected inference tier.
2. Model weights, persona/style assets, phonemizer, and all transitive dependencies have documented licenses compatible with the school's intended use.
3. The exact pinned revision and every downloaded file have immutable hashes and provenance.
4. Indonesian pronunciation, naturalness, latency, RAM/CPU use, and offline behavior pass local tests on the Panitia PC.
5. The runtime can be embedded behind the existing Chrome Native Messaging boundary without opening an unauthenticated localhost/LAN HTTP service.
6. The audio pipeline emits speaking/ended/error events for avatar synchronization and remains fail-closed if unavailable.

## Integration constraints

- Keep all work on `feature/sephia-module`.
- Do not merge to `main` or deploy.
- Do not alter OTP, Firebase Rules, Moodle, or existing Panitia alert rendering.
- No cloud TTS, external audio upload, or public-figure voice imitation.
- Do not claim the voice is installed or operational until a pinned model is provisioned and real audio is heard on the target workstation.

## Acceptance outcome

Stage 42 passes only after the above evidence is recorded. Until then, the host remains visual-only when the local neural engine is unavailable.