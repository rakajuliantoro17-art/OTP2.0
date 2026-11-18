# SEPHIA Stage 27 — Local Neural Runtime Prototype

**Branch:** feature/sephia-module  
**Status:** qualification wrapper and offline-engine contract implemented; no model/runtime provisioned or approved.  
**Candidate:** Laras + Pocket TTS Indonesian, subject to license, voice, and target-PC validation.

## Implemented

- A versioned manifest pins each ONNX model file's path, exact byte size, SHA-256, aggregate model digest, model source revision, voice-reference SHA-256, runtime version/source revision/binary SHA-256, model license evidence, and explicit voice-reference consent.
- Only the laras-pocket-tts candidate identifier and local-only execution are accepted. The current Laras source candidate is pinned to commit `e4ab05ca53a8cbf749405de5b1ac902b76880768`; the Indonesian model config reference is pinned to `17257664e384561c957b02ac92edd1a24807f0e5` and every provisioned ONNX file must independently match its SHA-256.
- A mandatory provisioning verifier must independently hash the actual local model files, voice-reference bytes, and runtime binary before the engine factory is called. A manifest string alone is not treated as proof of file integrity.
- Model weights are CC-BY-4.0, not MIT/Apache. Production attribution must include `Pocket TTS Indonesian oleh anak10thn, CC-BY-4.0` and the license URL. Laras source code is separately MIT OR Apache-2.0.
- The runtime factory is injected from a pre-provisioned local bundle; this module defines no HTTP endpoint, sidecar URL, network request, model download, browser TTS, or storage.
- Only the exact approved generic announcement may be synthesized.
- Generated output must be an in-memory ArrayBuffer/typed-array payload, at most 8 MiB, 16–48 kHz, and 0.25–15 seconds.
- The wrapper exposes cancel/dispose and refuses work after disposal or during concurrent synthesis.

## Important limitation

This is a qualification boundary, not a bundled Laras/Pocket model or a working speech engine. The checksum verifier and engine factory are trusted local integration code and must be reviewed to ensure they read only provisioned files and perform offline inference. No endpoint is enabled.

Stage 24 topology review remains open. Do not expose an unauthenticated LAN service or bypass Chrome mixed-content, CORS, Private Network Access, or secure-context controls.

## Exit criteria

- Provision exact model/runtime locally and verify model + reference hashes from actual bytes.
- Complete documented model-license and voice-actor/dataset consent review.
- Confirm adult feminine Indonesian timbre by listening; do not infer voice gender from model metadata.
- Demonstrate no external network requests and no persistent audio/cache.
- Run Stage 28 benchmark on the actual Panitia PC.
