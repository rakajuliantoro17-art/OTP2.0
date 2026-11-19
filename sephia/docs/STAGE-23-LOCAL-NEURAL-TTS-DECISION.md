# SEPHIA Stage 23 — Final Voice Architecture: Local Neural TTS

**Branch:** feature/sephia-module  
**Decision:** final SEPHIA voice is dynamic neural TTS, not a prerecorded WAV.  
**Status:** architecture locked; engine and voice still require acoustic and workstation acceptance.  
**Safety boundary:** no cloud TTS, no external audio upload, no Firebase/Moodle/OTP behavior changes.

## Owner decision

The final voice target is adult feminine Indonesian: natural, warm, calm, gentle, clear, professional, moderate pace, and natural intonation. The only spoken content is the approved generic announcement. No student name, class, OTP, violation count, or identifying detail may be synthesized.

## Architecture

Use a local neural TTS engine behind the narrow SEPHIA speech adapter. Provision model/runtime explicitly and checksum-pin all model and voice-reference files. No surprise model download during an alert. Keep generated audio in memory only and release it after playback. If the local engine is unavailable, remain visual-only.

Do not assume localhost is safe or reachable from a Vercel-hosted page. Verify HTTPS/mixed-content, CORS, Private Network Access, authentication, loopback binding, and browser support before selecting a topology. Never expose an unauthenticated TTS service to the school LAN.

## Candidate evaluation

### Primary technical candidate: Laras + Pocket TTS Indonesian

Repository: https://github.com/Urdemonlord/laras-tts  
Model weights: https://huggingface.co/anak10thn/pocket-tts-indonesian

This remains a technical candidate only. The reference voice must be demonstrably adult feminine Indonesian and legally usable. Model license, voice-reference consent, exact phrase latency, cache behavior, and target-PC performance must all be reviewed.

### Secondary candidate: Indonesian CSM-1B fine-tune

Model card: https://huggingface.co/Ellbendls/csm-1b-indonesian-fine-tuned

This remains comparative research only; speaker timbre/gender and target-PC resource requirements are not established.

## Acceptance gates

The engine is not production-approved until:
1. The exact fixed announcement is synthesized by the chosen local engine.
2. Two independent listeners approve pronunciation, adult feminine timbre, natural prosody, intelligibility, and absence of artifacts.
3. The target Panitia PC meets startup, warm inference, playback-start, CPU, and RAM limits.
4. Local-only network behavior is verified; no external request occurs during synthesis.
5. Voice reference/model/data/runtime license and consent provenance are documented.
6. Tests prove exact-text enforcement, cancellation, timeout, memory cleanup, no persistent audio, and failure isolation.
7. Chrome acceptance confirms avatar state and mouth animation do not claim phoneme accuracy unless timestamp/viseme data is actually available.

## Stages 25–28

Stage 25–26 implemented the adapter/controller contract. Stage 27 adds a pinned local-engine qualification wrapper; Stage 28 adds a numeric in-memory benchmark and manual evidence gates. Neither stage approves a real engine or voice. The Panitia host remains visual-only until the model, voice, security, and workstation gates pass.
