# SEPHIA Stage 44 — ArboTTS Offline Female Voice Feasibility Gate

**Status:** candidate rejected for direct production integration pending upstream corrections and independently verifiable assets.  
**Branch:** `feature/sephia-module`.

## Scope

Evaluate the ArboTTS candidate against the approved requirement: an original adult feminine Indonesian voice, gentle/warm/calm delivery, installed locally once on Windows, no user WAV, no cloud speech, and no unauthenticated localhost/LAN service.

## Verified source findings

The upstream ArboTTS source and configuration were inspected at the current `main` branch:

1. `configs/speakers.json` defines Maya as a female calm-storyteller persona.
2. In `arbotts/synthesizer.py`, the non-Kokoro studio-persona path calls `_synthesize_neural_stream`, which uses the `edge_tts` package and selects Microsoft's `id-ID-GadisNeural` for female personas. This is a network/cloud speech path, not a local offline engine.
3. The same path falls back to the local VITS model if the network stream fails; that local fallback is not evidence of an equivalent female Indonesian voice.
4. The Kokoro path maps `maya`, `sita`, and `arba` to `id_arba`. The Kokoro voice-pack resolver attempts to fetch `voices/id_arba.bin` from `onnx-community/Kokoro-82M-ONNX`.
5. The currently visible file listing for that Hugging Face repository lists the standard Kokoro voice packs, but does not establish the presence or provenance/license of `id_arba.bin`. The model card itself identifies English as its language metadata. ArboTTS supplies a separate Indonesian G2P implementation, but the complete Indonesian model/voice provenance remains unverified.
6. ArboTTS's `pyproject.toml` includes `edge-tts` in its base dependencies. Its MIT repository license does not, by itself, license every external model, voice pack, or dependency.

## Decision

Do **not** install ArboTTS v2.5 as-is for SEPHIA production. In particular:
- Do not use its default Maya/Studio persona route because it depends on Edge TTS network streaming.
- Do not claim Kokoro `id_arba` is a verified downloadable offline female Indonesian voice pack until the exact file, immutable revision, checksum, and license are independently confirmed.
- Do not build the Windows installer around a model/voice asset that cannot yet be pinned and verified.

This is a candidate feasibility rejection, not a rejection of the user's requested voice profile.

## Next engineering path

1. Request or locate a verifiable local Indonesian female voice pack with explicit redistribution/use license and immutable file hashes.
2. If no suitable pack exists, evaluate a different fully local Indonesian female TTS model whose model card and voice assets are independently licensed.
3. Prototype a bounded adapter that accepts only the two existing fixed SEPHIA phrases and emits in-memory PCM.
4. Preserve Chrome Native Messaging as the only browser-to-local boundary; do not introduce cloud fallback or an unauthenticated local HTTP endpoint.
5. Only after model/adapter tests pass, migrate the legacy WAV-dependent Rust host and Windows installer. Keep the installer blocked until exact artifact hashes, runtime dependencies, uninstall behavior, and target-PC tests are available.

## Release boundaries

- Continue only on `feature/sephia-module`.
- No merge to `main`, no deployment, and no physical workstation installation.
- Do not change OTP logic, Firebase rules, Moodle, or Panitia alert handling.
- Current status: installation plan approved; production TTS engine and installer are not ready.
