# SEPHIA Stage 32 — In-Memory Laras Neural Inference

**Status:** feature-gated in-memory inference implementation added; actual model and voice provisioning remain unverified.  
**Runtime:** Laras TTS pinned to `e4ab05ca53a8cbf749405de5b1ac902b76880768`.  
**Model:** Pocket TTS Indonesian ONNX bundle pinned in `docs/POCKET-TTS-INDONESIAN-ONNX-PROVENANCE.json`.

## Implementation

- Native host uses the public `laras::onnx::Engine` API directly: `Engine::new`, `wav::read_mono`, `Engine::set_voice`, and `Engine::synthesize`.
- It does not call the Laras HTTP server, desktop wrapper, or `Native::synth_to(..., out: &Path)` file-writing API.
- The only synthesis input is compiled into the host:

  > Perhatian, Panitia. Ada notifikasi pelanggaran OTP baru. Silakan periksa notifikasinya di dashboard, ya.

- Generated `Vec<f32>` samples are converted directly to 24 kHz mono PCM16 little-endian bytes in memory.
- The response is rejected if silent/invalid, shorter than 250 ms, longer than 15 seconds, or larger than 700 KiB.
- No generated WAV, temporary audio file, transcript, or audio cache is written.
- Inherited Laras dump/trace environment variables are removed during single-threaded startup before ONNX Runtime workers are created.
- Native host verifies the nine pinned ONNX files, aggregate bundle digest, voice-reference SHA-256, native executable SHA-256, and presence of model-license and voice-consent evidence files before engine readiness.
- Chrome receives a strict `ready` handshake only after local engine initialization succeeds. Missing or mismatched assets return `ENGINE_UNAVAILABLE`; the extension does not mark the bridge available.

## Build

Protocol-only (default, intentionally unavailable for speech):

    cargo test --manifest-path sephia/native-host/Cargo.toml

Inference feature (builds the pinned Laras ONNX dependency):

    cargo test --manifest-path sephia/native-host/Cargo.toml --features inference
    cargo build --release --features inference --manifest-path sephia/native-host/Cargo.toml

The host and installer never download model weights. To provision them manually, run `native-host/provision-model-windows.ps1 -ModelDir <local-folder> -Download`; without `-Download`, the script only verifies files already present. The installer then copies the verified nine files into the per-user SEPHIA directory.

## Windows provisioning

The installer now requires:
- the exact packaged extension ID;
- native host executable built with `--features inference`;
- local model directory containing all nine hash-pinned ONNX files;
- adult feminine Indonesian WAV reference with explicit written voice-cloning consent;
- consent evidence file;
- model license evidence file;
- local CPU thread count from 1–8.

It verifies the model file hashes before copying them into the per-user SEPHIA directory. The host verifies them again at startup. Uninstall removes the local model, voice reference, evidence copies, executable, and registration.

## Non-negotiable human acceptance gates

- Voice actor or speaker has explicitly consented to local voice cloning for SEPHIA announcement use. Publicly available audio or dataset licensing alone is not treated as consent.
- At least two independent listeners approve adult feminine timbre, natural Indonesian pronunciation, prosody, intelligibility, and absence of artifacts.
- Target Panitia PC passes cold startup, warm inference, playback latency, CPU, RAM, and thermal checks.
- Inspect process and network activity to confirm no external TTS requests, no localhost/LAN listener, no generated audio file, and no Laras dump files.
- Verify Chrome AudioContext playback activation and pagehide/cancel behavior on the real Panitia dashboard.
- Run end-to-end tests through the actual extension and Native Messaging host, not only mocked unit tests.

## Current limitations

- The voice reference and its consent evidence have not been supplied.
- No model files have been provisioned on the Panitia PC.
- ONNX inference feature compilation and runtime tests must pass CI.
- The extension/native host package has not been installed on the target workstation.
- No human voice-quality or target-PC performance result exists yet.

This stage provides a real local inference path in code, but does not declare production readiness.
