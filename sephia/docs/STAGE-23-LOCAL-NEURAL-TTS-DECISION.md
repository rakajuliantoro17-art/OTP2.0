# SEPHIA Stage 23 — Final Voice Architecture: Local Neural TTS

**Branch:** `feature/sephia-module`  
**Decision:** final SEPHIA voice is dynamic neural TTS, not a prerecorded WAV.  
**Status:** architecture locked; engine and voice still require acoustic and workstation acceptance.  
**Safety boundary:** no cloud TTS, no external audio upload, no Firebase/Moodle/OTP behavior changes.

## Owner decision

The project owner confirms that SEPHIA's final voice must use TTS, consistent with the original concept. This supersedes the Stage 17 recommendation to use a fixed prerecorded announcement as the production voice.

The final target remains:
- Adult feminine Indonesian voice.
- Natural, warm, calm, gentle, clear, and professional.
- Moderate pace, natural intonation, short pause after "Perhatian, Panitia".
- Local inference; no third-party speech API and no cloud fallback.
- Dynamic synthesis from the approved generic announcement text.
- No student name, class, OTP, violation count, or other student-identifying data in speech.

## Architecture decision

Use a **local neural TTS engine** behind a narrow SEPHIA speech adapter.

1. SEPHIA passes only the fixed approved generic announcement to the adapter.
2. The adapter sends the text only to an explicitly configured, same-device or school-LAN local inference endpoint, or to an embedded local runtime after that runtime is proven compatible.
3. The engine synthesizes Indonesian speech locally and returns audio for immediate playback.
4. Audio buffers are released after playback. No transcript, generated audio, or notification history is persisted by SEPHIA.
5. If the local engine is unavailable, SEPHIA enters visual-only/limited mode. It must not call a cloud provider or silently fall back to an unverified system voice.

The implementation must not assume that a localhost endpoint is automatically safe or reachable from a Vercel-hosted page. Before selecting a sidecar topology, verify HTTPS/mixed-content, CORS, Private Network Access, authentication, loopback binding, and browser support. Never expose an unauthenticated TTS service to the school LAN.

## Candidate evaluation

### Primary technical candidate: Laras + Pocket TTS Indonesian

Repository: https://github.com/Urdemonlord/laras-tts  
Model weights: https://huggingface.co/anak10thn/pocket-tts-indonesian

Why it is worth prototyping:
- Indonesian-first text normalization and speech synthesis.
- CPU-first ONNX runtime; the project documents a roughly 160 MB model bundle and approximately 2.5 GB RAM for the manual setup including its optional ASR scoring path.
- Supports a reference voice, allowing a consistent adult feminine timbre when the reference recording is appropriately licensed and consented.
- Can be self-hosted locally without a cloud inference provider.

Known limitations:
- The reference voice is essential to the intended timbre; the sample must be demonstrably adult feminine Indonesian and legally usable.
- The repository's own benchmark reports measurable word error rates and non-trivial synthesis latency on CPU. The exact SEPHIA sentence must be tested on the target machine.
- Its documented HTTP server must be hardened and isolated. Do not expose it as an unauthenticated LAN service.
- Its default caching behavior must be reviewed/disabled or constrained to memory to preserve SEPHIA's no-persistent-audio rule.

### Secondary candidate: Indonesian CSM-1B fine-tune

Model card: https://huggingface.co/Ellbendls/csm-1b-indonesian-fine-tuned

The model card declares Apache-2.0, Indonesian, 24 kHz output, and 81 speaker IDs. However, speaker gender/timbre is not mapped clearly enough to select a feminine voice by ID, and a 1B-parameter model may be heavier than necessary for the Panitia workstation. Keep it as a comparative candidate only.

### Not selected as the final engine

- Browser/OS `speechSynthesis`: diagnostics only. Local voice metadata does not prove feminine timbre or consistent quality across workstations.
- ArboTTS default announcer profile: documented as male, so it does not meet the SEPHIA voice target.
- Cloud TTS services: prohibited by the local-only privacy boundary.
- Fixed WAV announcement: not the final voice architecture; the existing WAV adapter may remain isolated for tests or future non-production use, but must not be selected by the Panitia host.

## Voice reference and consent

A feminine reference voice must come from one of these sources:
- A voice actor who explicitly consents to synthesis and the intended school operational use, with written scope and duration; or
- A dataset/sample whose license explicitly permits the intended use and whose speaker characteristics are verified.

Do not clone a staff member, student, public figure, or other identifiable person without explicit documented consent. A dataset license alone does not establish that a particular sample is feminine or suitable.

## Runtime requirements

- Local inference only; no network calls to external TTS, model providers, telemetry, or audio analytics.
- Model weights must be provisioned and checksum-pinned before operational use. No surprise model download during an alert.
- Warm the model after an explicit SEPHIA activation if needed; do not delay or block OTP monitoring.
- Enforce the exact approved announcement string at the SEPHIA adapter boundary.
- Bound synthesis duration, response size, concurrency, and timeout.
- Stop/cancel synthesis on OFF, pagehide, disposal, or fatal error.
- Release audio buffers after playback; do not persist generated audio or transcripts.
- If inference fails, show limited/error state and leave the dashboard alert visible. Never retry indefinitely.
- Preserve one-at-a-time speech and stable event-ID deduplication.

## Acceptance gates

The engine is not production-approved until all are true:
1. The exact fixed announcement is synthesized by the chosen local engine.
2. Two independent listeners approve pronunciation, adult feminine timbre, natural prosody, intelligibility, and absence of artifacts.
3. The target Panitia PC meets startup, warm inference, playback-start, and CPU/RAM limits.
4. Local-only network behavior is verified; no external request occurs during synthesis.
5. The voice reference/model/data/runtime license and consent provenance are documented.
6. Tests prove exact-text enforcement, cancellation, timeout, memory cleanup, no persistent audio, and failure isolation.
7. Chrome acceptance confirms avatar state and mouth animation do not claim phoneme accuracy unless timestamp/viseme data is actually available.

## Superseded implementation notes

- Stage 17's fixed-WAV production recommendation is superseded by this owner decision.
- Stages 18–20's WAV adapter/asset contract are not the production speech path. Keep them isolated until the neural TTS adapter is integrated and tested; do not configure `announcementAssetUrl` in the Panitia host.
- Stage 12 browser-local TTS remains a diagnostic fallback only, not an automatic production fallback.
- No production voice is approved yet. This document selects the architecture, not a model or voice identity.

## Next work

1. Prototype Laras/Pocket TTS with a properly licensed adult feminine Indonesian reference.
2. Compare against the CSM-1B Indonesian candidate if a verified feminine speaker can be identified.
3. Select a deployment topology only after same-origin/loopback security and target-device performance are measured.
4. Implement `LocalNeuralTtsAdapter` behind the existing speech controller contract.
5. Add automated tests and a local diagnostic page; keep the feature branch isolated.
