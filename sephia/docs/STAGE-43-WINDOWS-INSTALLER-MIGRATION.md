# SEPHIA Stage 43 — Windows Installer Readiness and Migration

**Status:** installer migration specification; not an executable installer release.  
**Branch:** `feature/sephia-module`.

## User-approved installation model

The user approved a one-time Windows installation for a local, preset Indonesian female TTS voice, with no user-supplied WAV and no public-figure voice imitation. Daily use remains through the Panitia dashboard in Chrome.

## Existing installer is incompatible

The current `native-host/install-windows.ps1` and `provision-model-windows.ps1` are tied to the Pocket TTS/Laras reference-WAV workflow. They require a WAV, written voice-cloning consent evidence, and the Pocket TTS model manifest. Do not present or execute these scripts as the installer for the approved preset-voice workflow.

## Candidate engine status

ArboTTS upstream currently documents:
- Indonesian/English synthesis and CPU inference;
- named female personas including Arba, Sita, and Maya in its Studio persona table;
- a Kokoro ONNX tier with native Indonesian voice packs identified as `id_arbo` and `id_arba`;
- a browser WebAssembly demo and a Python package installation path;
- MIT license for the upstream repository code.

These upstream claims do not establish that Maya is included in a particular downloadable model tier, that all model weights and dependencies have compatible licenses, or that the engine can be embedded into the existing Rust Native Messaging host. The project currently does not have a verified pinned ArboTTS model manifest or a tested SEPHIA adapter.

## Required migration before packaging

1. Pin an exact ArboTTS source revision and exact model/persona assets.
2. Review license terms for model weights, voice packs, phonemizer, ONNX runtime, and transitive dependencies separately from the repository code license.
3. Verify that the selected Indonesian female preset is actually supported by the pinned tier; do not assume Maya is present in the Kokoro Indonesian voice pack.
4. Build a local adapter that synthesizes only the existing approved fixed SEPHIA phrases and returns in-memory PCM; no output WAV files.
5. Integrate the adapter through Chrome Native Messaging. Do not add an unauthenticated localhost/LAN HTTP server or cloud TTS fallback.
6. Replace the legacy WAV-required installer with a signed/reproducible Windows installer that verifies pinned file hashes, installs the native host/runtime/model, registers only the exact extension ID, supports clean uninstall, and reports readiness.
7. Add a preflight check for Windows version, architecture, available disk/RAM, audio output, and Chrome extension pairing.
8. Run tests on the target Panitia PC, including offline operation, avatar/audio synchronization, cancellation, browser close, missing assets, and failure isolation.

## Safety and release gates

- Keep changes on `feature/sephia-module`.
- Do not merge to `main` or deploy.
- Do not install the old WAV-based workflow as a workaround.
- No model download or Windows installation occurs from the browser silently. First-time installation requires explicit user/administrator approval.
- Do not claim installation or audible operation until the installer and real target-PC tests succeed.

## Current user-facing status

The installation approach is approved. The actual preset engine, compatible adapter, and migrated installer are not yet ready to install.